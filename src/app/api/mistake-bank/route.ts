// app/api/mistake-bank/route.ts
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const userId = decoded.uid;

        // 1. All question_progress sub-docs (one per subject/pack)
        const progressSnap = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("question_progress")
            .get();

        if (progressSnap.empty) return NextResponse.json({ questions: [] });

        // 2. Collect incorrectly answered question IDs grouped by subjectId
        const incorrectBySubject: Record<string, { questionId: string; userAnswer: string; answeredAt: string | null }[]> = {};

        progressSnap.forEach((doc) => {
            const subjectId = doc.id;
            const data = doc.data() as Record<string, { correct: boolean; userAnswer: string; answeredAt: any }>;
            Object.entries(data).forEach(([questionId, entry]) => {
                if (entry.correct === false) {
                    if (!incorrectBySubject[subjectId]) incorrectBySubject[subjectId] = [];
                    incorrectBySubject[subjectId].push({
                        questionId,
                        userAnswer: entry.userAnswer ?? '',
                        answeredAt: entry.answeredAt?.toDate?.()?.toISOString() ?? null,
                    });
                }
            });
        });

        if (Object.keys(incorrectBySubject).length === 0) return NextResponse.json({ questions: [] });

        // 3. Fetch question docs & resolve subject names
        const results: any[] = [];

        await Promise.all(
            Object.entries(incorrectBySubject).map(async ([subjectId, wrongAnswers]) => {
                const packDoc = await admin.firestore().collection("study_packs").doc(subjectId).get();
                const subjectName = packDoc.exists ? (packDoc.data()?.subject ?? subjectId) : subjectId;

                await Promise.all(
                    wrongAnswers.map(async ({ questionId, userAnswer, answeredAt }) => {
                        const qDoc = await admin.firestore().collection("questions").doc(questionId).get();
                        if (!qDoc.exists) return;
                        const qData = qDoc.data()!;
                        if (qData.moderation_status && qData.moderation_status !== "approved") return;

                        results.push({
                            id: questionId,
                            subjectId,
                            subject: subjectName,
                            question: qData.question ?? qData.questionText ?? '',
                            options: qData.options ?? {},
                            correctAnswer: qData.correctAnswer ?? qData.answer ?? '',
                            explanation: qData.explanation ?? '',
                            userAnswer,
                            answeredAt,
                        });
                    })
                );
            })
        );

        results.sort((a, b) => {
            if (!a.answeredAt) return 1;
            if (!b.answeredAt) return -1;
            return new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime();
        });

        return NextResponse.json({ questions: results });
    } catch (error) {
        console.error("Mistake bank error:", error);
        return NextResponse.json({ error: "Failed to fetch mistake bank" }, { status: 500 });
    }
}