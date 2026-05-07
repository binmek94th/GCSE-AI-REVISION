// app/api/quiz-results/route.ts
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

/**
 * Calculates quiz score for a user + pack by reading
 * users/{uid}/question_progress/{packId}
 */
async function calculateQuizScore(userId: string, packId: string) {
    const progressDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .collection("question_progress")
        .doc(packId)
        .get();

    if (!progressDoc.exists) return null;

    const progressData = progressDoc.data() as Record<
        string,
        { correct: boolean; answeredAt: FirebaseFirestore.Timestamp | null; userAnswer: string }
    >;

    const questionIds = Object.keys(progressData);
    if (questionIds.length === 0) return null;

    let correctCount = 0;
    let lastAnsweredAt: FirebaseFirestore.Timestamp | null = null;

    questionIds.forEach((questionId) => {
        const answer = progressData[questionId];
        if (answer.correct === true) correctCount++;

        if (
            answer.answeredAt &&
            (!lastAnsweredAt || answer.answeredAt.toMillis() > lastAnsweredAt.toMillis())
        ) {
            lastAnsweredAt = answer.answeredAt;
        }
    });

    const score = Math.round((correctCount / questionIds.length) * 100);

    return {
        score,
        correctCount,
        totalCount: questionIds.length,
        lastAnsweredAt,
    };
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        const limit = parseInt(searchParams.get("limit") || "5", 10);

        if (!idToken) {
            return NextResponse.json({ message: "Missing ID token" }, { status: 400 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Use subjects subcollection (current architecture)
        const subjectsSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("subjects")
            .get();

        if (subjectsSnapshot.empty) {
            return NextResponse.json({ quizResults: [] }, { status: 200 });
        }

        const quizResults: {
            packId: string;
            subject: string;
            score: number;
            correctCount: number;
            totalCount: number;
            date: string | null;
        }[] = [];

        await Promise.all(
            subjectsSnapshot.docs.map(async (subjectDoc) => {
                const packId = subjectDoc.id;
                const subjectData = subjectDoc.data();

                const scoreData = await calculateQuizScore(userId, packId);
                if (!scoreData) return; // no quiz activity for this pack yet

                // Resolve display name: try study_packs collection first, fall back to subjects doc
                const studyPackDoc = await admin
                    .firestore()
                    .collection("study_packs")
                    .doc(packId)
                    .get();

                const subjectName =
                    studyPackDoc.exists
                        ? (studyPackDoc.data()?.subject ?? subjectData.subject ?? packId)
                        : (subjectData.subject ?? packId);

                quizResults.push({
                    packId,
                    subject: subjectName,
                    score: scoreData.score,
                    correctCount: scoreData.correctCount,
                    totalCount: scoreData.totalCount,
                    date: scoreData.lastAnsweredAt
                        ? (scoreData.lastAnsweredAt as FirebaseFirestore.Timestamp)
                            .toDate()
                            .toISOString()
                        : null,
                });
            })
        );

        // Sort by most recently answered, cap at limit
        quizResults.sort((a, b) => {
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        return NextResponse.json(
            { quizResults: quizResults.slice(0, limit) },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching quiz results:", error);
        return NextResponse.json(
            { message: "Failed to fetch quiz results" },
            { status: 500 }
        );
    }
}