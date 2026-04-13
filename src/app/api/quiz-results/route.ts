import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// ------------------------
// Calculate quiz score for a pack
// ------------------------
async function calculateQuizScore(userId: string, packId: string) {
    const progressDocRef = admin
        .firestore()
        .collection("users")
        .doc(userId)
        .collection("question_progress")
        .doc(packId);

    const progressDoc = await progressDocRef.get();

    if (!progressDoc.exists) {
        return null;
    }

    const progressData = progressDoc.data() || {};
    const questionIds = Object.keys(progressData);

    if (questionIds.length === 0) {
        return null;
    }

    let correctCount = 0;
    const totalCount = questionIds.length;
    let lastAnsweredAt: number | null = null;

    questionIds.forEach((questionId) => {
        const answer = progressData[questionId];
        if (answer.correct === true) {
            correctCount++;
        }

        // Track most recent answer time
        if (answer.answeredAt && (!lastAnsweredAt || answer.answeredAt > lastAnsweredAt)) {
            lastAnsweredAt = answer.answeredAt;
        }
    });

    const score = Math.round((correctCount / totalCount) * 100);

    return {
        score,
        correctCount,
        totalCount,
        lastAnsweredAt,
    };
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        const limit = parseInt(searchParams.get("limit") || "5", 10);

        if (!idToken) {
            return NextResponse.json(
                { message: "Missing ID token" },
                { status: 400 }
            );
        }

        // Verify auth
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Get all user's bought packs
        const boughtPacksSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("boughtPacks")
            .get();

        if (boughtPacksSnapshot.empty) {
            return NextResponse.json(
                { quizResults: [] },
                { status: 200 }
            );
        }

        // Calculate scores for each pack
        const quizResults = [];

        for (const packDoc of boughtPacksSnapshot.docs) {
            const packId = packDoc.id;


            const scoreData = await calculateQuizScore(userId, packId);

            if (scoreData) {
                const studyPackDoc = await admin
                    .firestore()
                    .collection("study_packs")
                    .doc(packId)
                    .get();

                const studyPackData = studyPackDoc.exists ? studyPackDoc.data() : {};

                console.log(studyPackData)

                quizResults.push({
                    packId,
                    subject: studyPackData?.title || studyPackData?.name || studyPackData.subject || "Unknown Pack",
                    score: scoreData.score,
                    correctCount: scoreData.correctCount,
                    totalCount: scoreData.totalCount,
                    date: scoreData.lastAnsweredAt
                        ? new Date((scoreData.lastAnsweredAt as any)._seconds * 1000).toLocaleDateString()
                        : "N/A",
                    timestamp: (scoreData.lastAnsweredAt as any)?._seconds || 0,
                });
            }
        }

        // Sort by most recent first
        quizResults.sort((a, b) => b.timestamp - a.timestamp);

        // Apply limit
        const limitedResults = quizResults.slice(0, limit);

        return NextResponse.json(
            { quizResults: limitedResults },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching quiz results:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}