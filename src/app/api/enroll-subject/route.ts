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

        const examBoard = userDoc.data()?.examBoard
            ?? userDoc.data()?.preferences?.examBoard
            ?? null;

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
            lastOpenedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(isNew && { enrolledAt: admin.firestore.FieldValue.serverTimestamp() }),
        }, { merge: true });
        generateStudyPlanForUser(userId)

        return NextResponse.json({ success: true, enrolled: isNew });
    } catch (error) {
        console.error("Error opening subject:", error);
        return NextResponse.json({ error: "Failed to open subject" }, { status: 500 });
    }
}