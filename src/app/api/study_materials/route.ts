import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// ------------------------
// Normalize a raw question doc into the shape MaterialQuizModal expects
// ------------------------
interface NormalizedQuestion {
    id: string;
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation: string;
    subject: string;
    materialId: string;
    materialTitle: string;
    difficulty: number | string;
}

function normalizeGcseQuestion(
    qDoc: FirebaseFirestore.QueryDocumentSnapshot,
    materialId: string,
    materialTitle: string,
    subject: string
): NormalizedQuestion {
    const d = qDoc.data();
    return {
        id: qDoc.id,
        question: d.question ?? d.questionText ?? "",
        options: d.options ?? {},
        correctAnswer: d.correctAnswer ?? d.answer ?? "",
        explanation: d.explanation ?? "",
        subject,
        materialId,
        materialTitle,
        difficulty: d.difficulty ?? "medium",
    };
}

function normalizeALevelQuestion(
    qDoc: FirebaseFirestore.QueryDocumentSnapshot,
    materialId: string,
    materialTitle: string,
    subject: string
): NormalizedQuestion {
    const d = qDoc.data();
    const choices: { option: string; text: string; isCorrect?: boolean }[] = Array.isArray(d.choices) ? d.choices : [];
    const options: Record<string, string> = {};
    let correctAnswer = "";
    choices.forEach((c) => {
        if (c?.option == null) return;
        options[c.option] = c.text ?? "";
        if (c.isCorrect) correctAnswer = c.option;
    });

    return {
        id: qDoc.id,
        question: d.questionText ?? d.question ?? "",
        options,
        correctAnswer,
        explanation: d.explanation ?? "",
        subject,
        materialId,
        materialTitle,
        difficulty: d.difficulty ?? "medium",
    };
}

// ------------------------
// Fetch full question data for every material's embedded {id, text} refs,
// batched across all materials in the current page (Firestore 'in' query
// max 10 values per batch).
// ------------------------
async function attachFullQuestions(
    materials: any[],
    questionsCollection: string,
    isALevel: boolean
): Promise<any[]> {
    // Build a lookup: questionId -> { materialId, materialTitle, subject }
    const questionMeta: Record<string, { materialId: string; materialTitle: string; subject: string }> = {};
    const allQuestionIds: string[] = [];

    for (const m of materials) {
        if (!Array.isArray(m.questions)) continue;
        const materialTitle = isALevel ? (m.topic ?? m.title ?? "Untitled") : (m.title ?? "Untitled");
        for (const ref of m.questions) {
            if (!ref?.id) continue;
            allQuestionIds.push(ref.id);
            questionMeta[ref.id] = { materialId: m.id, materialTitle, subject: m.subject };
        }
    }

    if (allQuestionIds.length === 0) {
        // No embedded refs anywhere — leave questions as empty arrays.
        return materials.map((m) => ({ ...m, questions: [] }));
    }

    const batchSize = 10;
    const batches: string[][] = [];
    for (let i = 0; i < allQuestionIds.length; i += batchSize) {
        batches.push(allQuestionIds.slice(i, i + batchSize));
    }

    const db = admin.firestore();
    const fullQuestionsByMaterial: Record<string, NormalizedQuestion[]> = {};

    await Promise.all(
        batches.map(async (batch) => {
            const snapshot = await db
                .collection(questionsCollection)
                .where(admin.firestore.FieldPath.documentId(), "in", batch)
                .get();

            snapshot.docs.forEach((qDoc) => {
                const meta = questionMeta[qDoc.id];
                if (!meta) return;

                const qData = qDoc.data();
                // Fail-open: only skip if explicitly not approved. Missing
                // moderation_status is treated as approved.
                if (qData.moderation_status && qData.moderation_status !== "approved") return;

                const normalized = isALevel
                    ? normalizeALevelQuestion(qDoc, meta.materialId, meta.materialTitle, meta.subject)
                    : normalizeGcseQuestion(qDoc, meta.materialId, meta.materialTitle, meta.subject);

                if (!fullQuestionsByMaterial[meta.materialId]) fullQuestionsByMaterial[meta.materialId] = [];
                fullQuestionsByMaterial[meta.materialId].push(normalized);
            });
        })
    );

    return materials.map((m) => ({
        ...m,
        questions: fullQuestionsByMaterial[m.id] ?? [],
    }));
}

// ------------------------
// Fetch materials with pagination (level-aware: GCSE vs A-Level collection)
// ------------------------
async function getMaterialsByPack(
    packId: string,
    examBoard: string,
    limit: number,
    page: number,
    materialsCollection: string,
    orderField: string,
    questionsCollection: string,
    isALevel: boolean
) {
    const collectionRef = admin
        .firestore()
        .collection(materialsCollection)
        .where("exam_board", "==", examBoard)
        .where("moderation_status", "==", "approved")
        .where("subject", "==", packId)
        .orderBy(orderField);

    const allDocsSnapshot = await collectionRef.get();
    const allDocs = allDocsSnapshot.docs;

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedDocs = allDocs.slice(startIndex, endIndex);

    let materials = paginatedDocs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    // ✅ Resolve each material's lightweight {id, text} question refs into
    // full question objects, from the level-appropriate collection.
    materials = await attachFullQuestions(materials, questionsCollection, isALevel);

    return {
        materials,
        total: allDocs.length,
        hasMore: endIndex < allDocs.length,
    };
}

// ------------------------
// GET: Fetch materials + progress
// ------------------------
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

        // Verify auth
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const studyPack = await admin.firestore().collection("study_packs")
            .doc(packId).get();

        const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .get();

        const userData = userDoc.data();
        const examBoard = userData?.preferences?.examBoard;

        if (!examBoard) {
            return NextResponse.json(
                { message: "User exam board preference not set" },
                { status: 400 }
            );
        }

        // ✅ Resolve user's level and pick the matching materials AND
        // questions collections. GCSE and A-Level content live in separate
        // collections with slightly different schemas — A-Level materials
        // use `topic` instead of `title`, and A-Level questions use
        // `questionText` + `choices[]` instead of `question` + `options`.
        const level = userData?.level ?? userData?.preferences?.level ?? "GCSE";
        const isALevel = level === "A-Level";
        const MATERIALS_COLLECTION = isALevel ? "alevel_study_materials" : "study_materials";
        const ORDER_FIELD = isALevel ? "topic" : "title";
        const QUESTIONS_COLLECTION = isALevel ? "a-levelExamQuestions" : "questions";

        // Fetch materials (now with full question data attached)
        const { materials, total, hasMore } = await getMaterialsByPack(
            studyPack.data().subject,
            examBoard,
            limit,
            page,
            MATERIALS_COLLECTION,
            ORDER_FIELD,
            QUESTIONS_COLLECTION,
            isALevel
        );

        // Fetch user progress
        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("progress")
            .doc(packId);

        const progressDoc = await progressDocRef.get();
        const progressData = progressDoc.exists ? progressDoc.data() : {};

        // Merge progress info
        const materialsWithProgress = materials.map((m) => ({
            ...m,
            done: !!progressData?.[m.id],
        }));

        return NextResponse.json(
            { materials: materialsWithProgress, total, page, limit, hasMore },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching materials:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { packId, materialId, done } = body;
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken || !packId || !materialId) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        const userRef = admin.firestore().collection("users").doc(userId);

        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("progress")
            .doc(packId);

        await progressDocRef.set(
            {
                [materialId]: {
                    done: done ?? true,
                    completedAt: new Date().toISOString(),
                },
            },
            { merge: true }
        );

        const userSnap = await userRef.get();
        const userData = userSnap.data() || {};

        const currentBadges = userData.badges?.milestone || [];

        // ✅ Step 3: Count total finished materials across all packs
        const progressDocs = await userRef.collection("progress").get();
        let totalCompleted = 0;

        progressDocs.forEach((doc) => {
            const data = doc.data();
            totalCompleted += Object.values(data).filter((v) => v === true).length;
        });

        const newBadges = [...currentBadges];
        if (totalCompleted > 1 && !currentBadges.includes("First Steps")) {
            newBadges.push("First Steps");

            await userRef.update({
                "badges.milestone": newBadges,
            });

            console.log(`🎉 User ${userId} earned the "First Steps" badge`);
        }

        return NextResponse.json({ message: "Progress updated" }, { status: 200 });
    } catch (error) {
        console.error("Error updating progress:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}