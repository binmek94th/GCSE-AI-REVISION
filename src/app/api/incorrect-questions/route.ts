import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// Helper function to format pack ID
function formatPackId(packId: string) {
    return packId
        .replace(/_/g, " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Helper function to shuffle array randomly
function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ------------------------
// GET: Fetch incorrect questions by subject
// ------------------------
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const packId = searchParams.get("packId");
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        const limit = parseInt(searchParams.get("limit") || "10", 10);

        if (!idToken || !packId) {
            return NextResponse.json(
                { message: "Missing ID token or pack ID" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Check if user owns the pack
        const boughtDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("boughtPacks")
            .doc(packId)
            .get();

        if (!boughtDoc.exists) {
            return NextResponse.json(
                { message: "Pack not purchased" },
                { status: 403 }
            );
        }

        // Get user's question progress for this pack
        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("question_progress")
            .doc(packId);

        const progressDoc = await progressDocRef.get();

        if (!progressDoc.exists) {
            return NextResponse.json(
                { questions: [], total: 0 },
                { status: 200 }
            );
        }

        const progressData = progressDoc.data() || {};

        // Filter for incorrect questions only
        const incorrectQuestionIds = Object.keys(progressData).filter(
            (questionId) => progressData[questionId]?.correct === false
        );

        if (incorrectQuestionIds.length === 0) {
            return NextResponse.json(
                { questions: [], total: 0 },
                { status: 200 }
            );
        }

        // Fetch full question details for all incorrect questions
        const questionPromises = incorrectQuestionIds.map((questionId) =>
            admin.firestore().collection("questions").doc(questionId).get()
        );

        const questionDocs = await Promise.all(questionPromises);

        // Map to question objects with progress data
        const questions = questionDocs
            .filter((doc) => doc.exists)
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                userAnswer: progressData[doc.id]?.userAnswer || null,
                answeredAt: progressData[doc.id]?.answeredAt || null,
            }));

        // Shuffle questions randomly
        const shuffledQuestions = shuffleArray(questions);

        // Apply limit
        const limitedQuestions = shuffledQuestions.slice(0, limit);

        return NextResponse.json(
            {
                questions: limitedQuestions,
                total: questions.length,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching incorrect questions:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// ------------------------
// POST: Update question status (mark as correct or reset)
// ------------------------
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { packId, questionId, correct, userAnswer } = body;
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken || !packId || !questionId || typeof correct !== "boolean") {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const boughtDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("boughtPacks")
            .doc(packId)
            .get();

        if (!boughtDoc.exists) {
            return NextResponse.json(
                { message: "Pack not purchased" },
                { status: 403 }
            );
        }

        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("question_progress")
            .doc(packId);

        await progressDocRef.set(
            {
                [questionId]: {
                    correct,
                    userAnswer: userAnswer || null,
                    answeredAt: admin.firestore.FieldValue.serverTimestamp(),
                },
            },
            { merge: true }
        );

        return NextResponse.json(
            { message: "Question status updated successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating question status:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// ------------------------
// DELETE: Remove question from progress (reset question)
// ------------------------
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const packId = searchParams.get("packId");
        const questionId = searchParams.get("questionId");
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken || !packId || !questionId) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Check if user owns the pack
        const boughtDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("boughtPacks")
            .doc(packId)
            .get();

        if (!boughtDoc.exists) {
            return NextResponse.json(
                { message: "Pack not purchased" },
                { status: 403 }
            );
        }

        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("question_progress")
            .doc(packId);

        await progressDocRef.update({
            [questionId]: admin.firestore.FieldValue.delete(),
        });

        return NextResponse.json(
            { message: "Question reset successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error resetting question:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}