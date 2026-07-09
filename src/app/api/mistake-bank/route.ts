import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

interface NormalizedQuestion {
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation: string;
    moderation_status?: string;
}

function normalizeGcseQuestion(qData: any): NormalizedQuestion {
    return {
        question: qData.question ?? qData.questionText ?? '',
        options: qData.options ?? {},
        correctAnswer: qData.correctAnswer ?? qData.answer ?? '',
        explanation: qData.explanation ?? '',
        moderation_status: qData.moderation_status,
    };
}

function normalizeALevelQuestion(qData: any): NormalizedQuestion {
    // A-Level choices are an array: { option, text, isCorrect }
    const choices: { option: string; text: string; isCorrect?: boolean }[] = qData.choices ?? [];
    const options: Record<string, string> = {};
    let correctAnswer = '';

    choices.forEach((c) => {
        if (c?.option == null) return;
        options[c.option] = c.text ?? '';
        if (c.isCorrect) correctAnswer = c.option;
    });

    return {
        question: qData.questionText ?? qData.question ?? '',
        options,
        correctAnswer,
        explanation: qData.explanation ?? '',
        moderation_status: qData.moderation_status,
    };
}

export async function GET(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const userId = decoded.uid;

        // Get user's level — read from preferences first, since that's the
        // student-set source of truth; fall back to the top-level `level`
        // field only if preferences.level isn't set.
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const userData = userDoc.data();
        const level = userData?.preferences?.level ?? userData?.level ?? null;

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
                const packData = packDoc.exists ? packDoc.data() : null;
                const subjectName = packData?.subject ?? subjectId;

                // Only return mistakes matching the student's level.
                // Fail-open: if either the student's level or the pack's
                // level is missing, don't filter — avoids silently hiding
                // mistakes due to incomplete data.
                const packLevel = packData?.level;
                if (level && packLevel && packLevel !== level) return;

                const isALevel = packLevel === 'A-Level' || packLevel === 'alevel' || packLevel === 'a-level';
                const questionsCollection = isALevel ? 'a-levelExamQuestions' : 'questions';

                await Promise.all(
                    wrongAnswers.map(async ({ questionId, userAnswer, answeredAt }) => {
                        const qDoc = await admin.firestore().collection(questionsCollection).doc(questionId).get();
                        if (!qDoc.exists) return;
                        const qData = qDoc.data()!;

                        const normalized = isALevel
                            ? normalizeALevelQuestion(qData)
                            : normalizeGcseQuestion(qData);

                        if (normalized.moderation_status && normalized.moderation_status !== "approved") return;

                        results.push({
                            id: questionId,
                            subjectId,
                            subject: subjectName,
                            question: normalized.question,
                            options: normalized.options,
                            correctAnswer: normalized.correctAnswer,
                            explanation: normalized.explanation,
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