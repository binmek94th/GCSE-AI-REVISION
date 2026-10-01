import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

interface NormalizedQuestion {
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation: string;
    moderation_status?: string;
}

// Same two shapes seen everywhere else in the app:
//   legacy: options is already {key: text}, correctAnswer is a KEY
//   generator-written: options is string[], correctAnswer is the TEXT
// Normalises both into {key: text} options + a correctAnswer that is
// always a valid key into that map, since MistakeBank.tsx (and every
// other quiz screen) compares a selected key directly against this value.
function normaliseGcseOptionsAndAnswer(rawOptions: any, rawCorrectAnswer: string): { options: Record<string, string>; correctAnswer: string } {
    if (Array.isArray(rawOptions)) {
        const options: Record<string, string> = {};
        rawOptions.forEach((text: string, i: number) => {
            options[String.fromCharCode(65 + i)] = text;
        });
        const match = Object.entries(options).find(([, text]) => text === rawCorrectAnswer);
        return { options, correctAnswer: match ? match[0] : rawCorrectAnswer };
    }
    const options: Record<string, string> = rawOptions ?? {};
    if (Object.prototype.hasOwnProperty.call(options, rawCorrectAnswer)) {
        return { options, correctAnswer: rawCorrectAnswer }; // already a valid key
    }
    const match = Object.entries(options).find(([, text]) => text === rawCorrectAnswer);
    return { options, correctAnswer: match ? match[0] : rawCorrectAnswer };
}

function normalizeGcseQuestion(qData: any): NormalizedQuestion {
    const { options, correctAnswer } = normaliseGcseOptionsAndAnswer(qData.options, qData.correctAnswer ?? qData.answer ?? '');
    return {
        question: qData.question ?? qData.questionText ?? '',
        options,
        correctAnswer,
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

        // Mirrors /api/incorrect-questions' approach (which is known to find
        // these correctly) instead of this route's own earlier logic, which
        // scanned every question_progress doc regardless of ownership and
        // re-resolved each pack's level via a separate study_packs lookup.
        // Walking the user's own `subjects` subcollection — the same
        // ownership source /api/incorrect-questions and /api/user/packs
        // use — is simpler and already has each pack's level on hand.
        const subjectsSnap = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("subjects")
            .get();

        if (subjectsSnap.empty) return NextResponse.json({ questions: [] });

        const results: any[] = [];

        await Promise.all(
            subjectsSnap.docs.map(async (subjectDoc) => {
                const packId = subjectDoc.id;
                const packData = subjectDoc.data();
                const subjectName = packData?.subject ?? packId;

                // Only return mistakes matching the student's level.
                // Fail-open: if either the student's level or the pack's
                // level is missing, don't filter — avoids silently hiding
                // mistakes due to incomplete data.
                const packLevel = packData?.level;
                if (level && packLevel && packLevel !== level) return;

                const progressDoc = await admin
                    .firestore()
                    .collection("users")
                    .doc(userId)
                    .collection("question_progress")
                    .doc(packId)
                    .get();

                if (!progressDoc.exists) return;
                const progressData = progressDoc.data() as Record<string, { correct: boolean; userAnswer: string; answeredAt: any }>;

                const wrongAnswers = Object.entries(progressData)
                    .filter(([, entry]) => entry.correct === false)
                    .map(([questionId, entry]) => ({
                        questionId,
                        userAnswer: entry.userAnswer ?? '',
                        answeredAt: entry.answeredAt?.toDate?.()?.toISOString() ?? null,
                    }));

                if (wrongAnswers.length === 0) return;

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
                            subjectId: packId,
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