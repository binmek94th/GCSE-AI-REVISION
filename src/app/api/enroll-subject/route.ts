import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import {generateStudyPlanForUser} from "@/lib/services/studyPlanGenerator";

export async function POST(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { subject, subjectId } = await req.json();

        if (!subject || !subjectId)
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

        const userDoc = await admin.firestore()
            .collection("users")
            .doc(userId)
            .get();

        const examBoard = userDoc.data()?.preferences?.examBoard ?? null;

        const level = userDoc.data()?.preferences?.level ?? null;

        const subjectRef = admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("subjects")
            .doc(subjectId);

        const snap = await subjectRef.get();
        const isNew = !snap.exists;

        await subjectRef.set({
            subject,
            examBoard,
            level,
            lastOpenedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(isNew && { enrolledAt: admin.firestore.FieldValue.serverTimestamp() }),
        }, { merge: true });

        // Was previously fire-and-forget (not awaited). That's harmless on
        // a long-lived local dev server, but on a serverless deployment the
        // function's execution environment can be frozen/torn down the
        // moment the response below is sent — killing this in-flight call
        // (which makes an OpenAI request and several Firestore reads)
        // before it ever finishes. Awaiting it keeps the function alive
        // until the plan is actually written. Still non-fatal: enrollment
        // itself already succeeded above, so a plan-generation failure is
        // logged rather than turned into a 500 — the daily cron job
        // (generateDailyStudyPlans) will pick it up as a fallback.
        try {
            await generateStudyPlanForUser(userId);
        } catch (planError) {
            console.error(`Study plan generation failed for user ${userId} after enrolling in ${subjectId}:`, planError);
        }

        return NextResponse.json({ success: true, enrolled: isNew });
    } catch (error) {
        console.error("Error opening subject:", error);
        return NextResponse.json({ error: "Failed to open subject" }, { status: 500 });
    }
}