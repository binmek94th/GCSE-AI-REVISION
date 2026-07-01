import { NextRequest, NextResponse } from 'next/server';
import admin from "../../../lib/firebaseAdmin";
import { DateTime } from "luxon";

export async function GET(req: NextRequest) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const db = admin.firestore();

        // ---- Resolve the user's level (drives which collections we read) ----
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data() || {};
        const level =
            userData?.level ?? userData?.preferences?.level ?? "GCSE";
        const isALevel = level === "A-Level";

        // GCSE and A-Level content live in separate collections.
        const MATERIALS_COLLECTION = isALevel
            ? "alevel_study_materials"
            : "study_materials";
        const QUESTIONS_COLLECTION = isALevel
            ? "a-levelExamQuestions"
            : "questions";

        const localNow = DateTime.now().setZone("Africa/Addis_Ababa");
        const startOfDay = localNow.startOf("day").toJSDate();
        const endOfDay = localNow.endOf("day").toJSDate();

        const moodSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("mood_history")
            .where("timestamp", ">=", startOfDay)
            .where("timestamp", "<=", endOfDay)
            .limit(1)
            .get();

        let mood = "neutral";
        if (!moodSnapshot.empty) {
            const moodDoc = moodSnapshot.docs[0].data();
            mood = moodDoc.mood || "neutral";
        }

        // ---- Get Study Plan ----
        const dateKey = localNow.toISODate(); // "YYYY-MM-DD"

        const querySnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("dailyStudyPlans")
            .where("date", "==", dateKey)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json(
                { error: "No study plan found for today" },
                { status: 404 }
            );
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();

        const moodMultiplierMap: Record<string, number> = {
            great: 1.0,
            good: 0.8,
            neutral: 0.7,
            tired: 0.4,
            bad: 0.3,
        };
        const multiplier = moodMultiplierMap[mood] ?? 0.7;

        const adjustedPlan = { ...data.plan };
        if (Array.isArray(adjustedPlan.sessions)) {
            const count = Math.ceil(adjustedPlan.sessions.length * multiplier);
            adjustedPlan.sessions = adjustedPlan.sessions.slice(0, count);
            adjustedPlan.breaks = adjustedPlan.breaks.slice(0, Math.max(0, count - 1));
        }

        // ---- Fetch Material Details (level-specific collection) ----
        const allMaterialIds = adjustedPlan.sessions
            ?.map((s: any) => s.materialId)
            .filter(Boolean) || [];

        const materialDocs: Record<string, any> = {};

        if (allMaterialIds.length > 0) {
            const materialPromises = allMaterialIds.map((id: string) =>
                db.collection(MATERIALS_COLLECTION).doc(id).get()
            );
            const materialSnapshots = await Promise.all(materialPromises);

            for (const snap of materialSnapshots) {
                if (snap.exists) {
                    materialDocs[snap.id] = { id: snap.id, ...snap.data() };
                }
            }
        }

        // ---- Collect All Question IDs from Materials ----
        const allQuestionIds: string[] = [];
        const questionToMaterialMap: Record<string, { materialId: string; subject: string; materialTitle: string }> = {};

        for (const session of adjustedPlan.sessions || []) {
            const material = materialDocs[session.materialId];
            if (material && Array.isArray(material.questions)) {
                for (const q of material.questions) {
                    if (q.id) {
                        allQuestionIds.push(q.id);
                        questionToMaterialMap[q.id] = {
                            materialId: material.id,
                            subject: material.subject || session.subject,
                            // A-Level materials use `topic` as the heading, not `title`.
                            materialTitle:
                                material.title || material.topic || session.materialTitle,
                        };
                    }
                }
            }
        }

        // ---- Fetch Full Question Details (level-specific collection) ----
        const fullQuestions: any[] = [];
        const questionsBySubject: Record<string, any[]> = {};

        if (allQuestionIds.length > 0) {
            // Fetch questions in batches (Firestore 'in' query supports up to 10 items)
            const batchSize = 10;
            const questionBatches: string[][] = [];

            for (let i = 0; i < allQuestionIds.length; i += batchSize) {
                questionBatches.push(allQuestionIds.slice(i, i + batchSize));
            }

            for (const batch of questionBatches) {
                const questionsSnapshot = await db
                    .collection(QUESTIONS_COLLECTION)
                    .where(admin.firestore.FieldPath.documentId(), "in", batch)
                    .get();

                questionsSnapshot.docs.forEach((qDoc) => {
                    const qData = qDoc.data();
                    const metadata = questionToMaterialMap[qDoc.id];

                    let questionData: any;

                    if (isALevel) {
                        // A-Level schema: questionText + choices[].{option,text,isCorrect}.
                        // Normalise to the same options-map / correctAnswer shape GCSE uses.
                        const choices = Array.isArray(qData.choices) ? qData.choices : [];
                        const optionsMap: Record<string, string> = {};
                        let correctAnswer: string | null = null;
                        for (const c of choices) {
                            if (c && c.option != null) {
                                optionsMap[c.option] = c.text;
                                if (c.isCorrect) correctAnswer = c.option;
                            }
                        }

                        questionData = {
                            id: qDoc.id,
                            question: qData.questionText ?? qData.question ?? "",
                            options: optionsMap,
                            correctAnswer,
                            explanation: qData.explanation || null,
                            subject: metadata?.subject || qData.subject,
                            materialId: metadata?.materialId,
                            materialTitle: metadata?.materialTitle,
                            difficulty: qData.difficulty || "Elementary",
                            createdAt: qData.createdAt?.toDate?.().toISOString?.() || qData.createdAt,
                        };
                    } else {
                        // GCSE schema: question + options (map) + correctAnswer.
                        questionData = {
                            id: qDoc.id,
                            question: qData.question,
                            options: qData.options,
                            correctAnswer: qData.correctAnswer,
                            explanation: qData.explanation || null,
                            subject: metadata?.subject || qData.subject,
                            materialId: metadata?.materialId,
                            materialTitle: metadata?.materialTitle,
                            difficulty: qData.difficulty || "Elementary",
                            createdAt: qData.createdAt?.toDate?.().toISOString?.() || qData.createdAt,
                        };
                    }

                    // Group by subject
                    const subject = questionData.subject;
                    if (!questionsBySubject[subject]) {
                        questionsBySubject[subject] = [];
                    }
                    questionsBySubject[subject].push(questionData);
                });
            }

            // Limit to 10 questions per subject
            for (const subject in questionsBySubject) {
                const subjectQuestions = questionsBySubject[subject].slice(0, 10);
                fullQuestions.push(...subjectQuestions);
            }
        }

        // ---- Update Sessions with Material (without questions) ----
        adjustedPlan.sessions = adjustedPlan.sessions?.map((session: any) => {
            const material = materialDocs[session.materialId];
            if (material) {
                // Remove questions array from material to avoid duplication
                const { questions, ...materialWithoutQuestions } = material;
                return {
                    ...session,
                    material: materialWithoutQuestions,
                };
            }
            return {
                ...session,
                material: null,
            };
        });

        // ---- Build Final Response ----
        const studyPlan = {
            id: doc.id,
            ...data,
            level,
            plan: adjustedPlan,
            assessment: {
                totalQuestions: fullQuestions.length,
                questions: fullQuestions,
                bySubject: fullQuestions.reduce((acc: any, q: any) => {
                    const subject = q.subject || "Unknown";
                    if (!acc[subject]) {
                        acc[subject] = [];
                    }
                    acc[subject].push(q.id);
                    return acc;
                }, {}),
            },
            createdAt: data.createdAt?.toDate?.().toISOString?.() || data.createdAt,
            date:
                typeof data.date === "string"
                    ? data.date
                    : data.date?.toDate?.().toISOString(),
            mood,
        };

        return NextResponse.json(studyPlan);
    } catch (error) {
        console.error("Error fetching study plan:", error);

        if (error instanceof Error && error.message.includes("auth")) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch study plan" },
            { status: 500 }
        );
    }
}