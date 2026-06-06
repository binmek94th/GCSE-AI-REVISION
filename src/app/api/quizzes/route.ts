import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

async function getQuestionsByPack(
    packId: string,
    userId: string,
    limit: number,
    page: number
) {
    function formatPackId(packId: string) {
        return packId
            .replace(/_/g, " ")
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    let formattedPackId = formatPackId(packId);

    if (formattedPackId === "Art And Design")
        formattedPackId = "Art and Design"

    const db = admin.firestore();

    // Get user preference
    const userDoc = await db.collection("users").doc(userId).get();
    const userPreferences = userDoc.exists ? userDoc.data()?.preferences : {};
    const examBoard = userPreferences?.examBoard;

    // Fetch all questions for the pack
    const questionsSnapshot = await db
        .collection("questions")
        .where("subject", "==", formattedPackId)
        .where("moderation_status", "==", "approved")
        .where("flag", "!=", "irrelevant")
        .orderBy("createdAt", "desc")
        .get();

    const progressDocRef = db
        .collection("users")
        .doc(userId)
        .collection("question_progress")
        .doc(packId);

    const progressDoc = await progressDocRef.get();
    const progressData = progressDoc.exists ? progressDoc.data() : {};

    // Filter questions based on progress AND exam board preference
    const availableQuestions = questionsSnapshot.docs.filter((doc) => {
        const question = doc.data();
        const questionId = doc.id;
        const progress = progressData?.[questionId];

        if (progress?.correct === true) return false;
        return !question.examBoard || question.examBoard === examBoard;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDocs = availableQuestions.slice(startIndex, endIndex);

    const questions = paginatedDocs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    return {
        questions,
        total: availableQuestions.length,
        hasMore: endIndex < availableQuestions.length,
    };
}


export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const packId = searchParams.get("packId");
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const page = parseInt(searchParams.get("page") || "1", 10);

        if (!idToken || !packId) {
            return NextResponse.json(
                { message: "Missing ID token or pack ID" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const studyPack = await admin.firestore().collection("study_packs")
            .doc(packId).get();

        const { questions, total, hasMore } = await getQuestionsByPack(
            studyPack.data().subject,
            userId,
            limit,
            page
        );

        return NextResponse.json(
            { questions, total, page, limit, hasMore },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching questions:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// ------------------------
// POST: Submit question answer
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
            { message: "Answer recorded" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error recording answer:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}