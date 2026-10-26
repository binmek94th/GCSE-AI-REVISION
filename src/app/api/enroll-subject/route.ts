import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import {generateStudyPlanForUser} from "@/lib/services/studyPlanGenerator";
import { isValidGrade } from "@/lib/grades";

export async function POST(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { subject, subjectId, targetGrade } = await req.json();

        if (!subject || !subjectId)
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

        const db = admin.firestore();
        const userRef = db.collection("users").doc(userId);

        const [userDoc, packDoc] = await Promise.all([
            userRef.get(),
            db.collection("study_packs").doc(subjectId).get(),
        ]);

        const examBoard = userDoc.data()?.preferences?.examBoard ?? null;

        const level = userDoc.data()?.preferences?.level ?? null;

        const pack = packDoc.exists ? packDoc.data() : null;
        const packTier: string = pack?.tier && String(pack.tier).trim().toLowerCase() !== "untiered" ? String(pack.tier) : "";

        // Target grade, chosen when the student adds the pack (same as in onboarding).
        // Optional so older clients that don't send one keep working. The scale
        // depends on the pack's level (GCSE 9–4, A-Level A*–E).
        let grade: string | null = null;
        if (targetGrade !== undefined && targetGrade !== null && targetGrade !== "") {
            if (!isValidGrade(pack?.level ?? level, targetGrade))
                return NextResponse.json({ error: "Invalid target grade" }, { status: 400 });
            grade = targetGrade.trim();
        }

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
            ...(grade && { targetGrade: grade }),
            ...(packTier && { tier: packTier }),
            lastOpenedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...(isNew && { enrolledAt: admin.firestore.FieldValue.serverTimestamp() }),
        }, { merge: true });

        // The student is choosing their own packs, so the automatic "enrol the
        // subjects from onboarding" step (see /api/onboarding/enroll) has nothing
        // left to do for them — record that, so removing every pack later doesn't
        // make it quietly add the onboarding subjects back.
        if (!userDoc.data()?.onboardingEnrolledAt) {
            await userRef.set({ onboardingEnrolledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        }

        // The Plan page shows "Target A" from the `subjects` list on the user
        // document (that's where onboarding puts it), looked up by subject name —
        // so record the grade there too, replacing any earlier entry for the subject.
        if (grade) {
            await db.runTransaction(async (tx) => {
                const snap = await tx.get(userRef);
                const list: any[] = Array.isArray(snap.data()?.subjects) ? [...snap.data()!.subjects] : [];
                const same = (s: any) => String(s?.name ?? "").trim().toLowerCase() === String(subject).trim().toLowerCase();
                const at = list.findIndex(same);
                const entry = { ...(at >= 0 ? list[at] : {}), name: subject, tier: packTier, targetGrade: grade };
                if (at >= 0) list[at] = entry;
                else list.push(entry);
                tx.set(userRef, { subjects: list }, { merge: true });
            });
        }

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