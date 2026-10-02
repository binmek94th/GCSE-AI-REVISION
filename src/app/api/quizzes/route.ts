import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";


// A-Level docs store options as `choices: [{option, text, isCorrect}]` and
// the question text as `questionText`, instead of GCSE's `options` +
// `question`. Mapped into the same shape GCSE docs already use (same as
// /api/questions' aLevelQuestionConverter) so QuizComponent.tsx — which only
// knows the GCSE field names — doesn't need to care which collection a
// question actually came from.
function normalizeALevelDoc(id: string, data: FirebaseFirestore.DocumentData) {
    const choices: { option: string; text: string; isCorrect: boolean }[] = Array.isArray(data.choices) ? data.choices : [];
    const options: Record<string, string> = {};
    let correctAnswer = "";
    for (const c of choices) {
        if (!c || typeof c.option !== "string") continue;
        options[c.option] = c.text;
        if (c.isCorrect) correctAnswer = c.option;
    }
    return {
        id,
        question: data.questionText ?? "",
        options,
        correctAnswer,
        explanation: data.explanation ?? "",
        subject: data.subject,
        examBoard: data.examBoard,
        flag: data.flag,
    };
}

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

    const db = admin.firestore();

    // Resolve the pack's real subject + level — previously this function
    // was handed the already-resolved subject name (reusing the `packId`
    // parameter name for it) and reformatted *that* as if it were an
    // underscore_separated pack id. It also used that subject string as the
    // question_progress document key instead of the actual pack id, which
    // diverges from every other route (mistake-bank, incorrect-questions,
    // progress) that keys question_progress by the real pack id.
    const studyPackDoc = await db.collection("study_packs").doc(packId).get();
    if (!studyPackDoc.exists) {
        return { questions: [], total: 0, hasMore: false };
    }
    const studyPackData = studyPackDoc.data()!;
    const level = studyPackData.level;
    const isALevel = level === "A-Level" || level === "alevel" || level === "a-level";

    let formattedSubject = formatPackId(studyPackData.subject ?? packId);
    if (formattedSubject === "Art And Design")
        formattedSubject = "Art and Design";

    // Get user preference
    const userDoc = await db.collection("users").doc(userId).get();
    const userPreferences = userDoc.exists ? userDoc.data()?.preferences : {};
    const examBoard = userPreferences?.examBoard;

    // GCSE and A-Level questions live in separate collections with
    // different schemas — this previously only ever queried the GCSE
    // 'questions' collection, so any subject whose approved questions only
    // exist in 'a-levelExamQuestions' (e.g. Business Studies, generated via
    // the question-generator script) always came back with zero results,
    // which the UI then showed as "you've completed all questions."
    const questionsCollection = isALevel ? "a-levelExamQuestions" : "questions";
    const questionsSnapshot = await db
        .collection(questionsCollection)
        .where("subject", "==", formattedSubject)
        .where("moderation_status", "==", "approved")
        .orderBy("createdAt", "desc")
        .get();

    const progressDocRef = db
        .collection("users")
        .doc(userId)
        .collection("question_progress")
        .doc(packId); // the real pack id — not the subject name

    const progressDoc = await progressDocRef.get();
    const progressData = progressDoc.exists ? progressDoc.data() : {};

    // Filter questions based on progress AND exam board preference
    const availableQuestions = questionsSnapshot.docs.filter((doc) => {
        const question = doc.data();
        const questionId = doc.id;
        const progress = progressData?.[questionId];

        if (progress?.correct === true) return false;
        if (question.flag === "irrelevant") return false;
        const exam_board = question.examBoard || question.exam_board;

        return !exam_board || exam_board === examBoard;
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedDocs = availableQuestions.slice(startIndex, endIndex);

    const questions = paginatedDocs.map((doc) =>
        isALevel
            ? normalizeALevelDoc(doc.id, doc.data())
            : { id: doc.id, ...doc.data() }
    );

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

        // ✅ Guard against a non-existent study pack — .data() returns
        // undefined when the doc doesn't exist, and .subject on that
        // was the source of the crash.
        if (!studyPack.exists) {
            return NextResponse.json(
                { message: `Study pack "${packId}" not found` },
                { status: 404 }
            );
        }

        // getQuestionsByPack resolves the pack's subject + level itself
        // now, using the real pack id throughout — including for the
        // question_progress lookup, which previously used the subject
        // name instead and so was checking the wrong document.
        const { questions, total, hasMore } = await getQuestionsByPack(
            packId,
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