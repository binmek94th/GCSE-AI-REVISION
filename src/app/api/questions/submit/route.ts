import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import admin from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

interface QuizAnswer {
    questionId: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    subject?: string;
}

interface SubjectSelection {
    name: string;
    tier: string;
}

interface StudyMaterial {
    id: string;
    title: string;
    subject: string;
    studyPackId: string;
    content?: string;
    description?: string;
    difficulty?: string;
}

const MODEL = "gpt-4o-mini";
const MAX_OUTPUT_TOKENS = 2000;

// Caps the number of study materials sent to the AI per subject. Without this,
// the prompt scales unboundedly with how many approved materials exist for a
// subject, regardless of what the student actually needs reviewed.
const MAX_MATERIALS_PER_SUBJECT_IN_PROMPT = 20;

// Firestore 'in' queries have a value-count limit. Chunking keeps this safe
// even if a future onboarding flow allows more subject selections than the
// current UI does.
const FIRESTORE_IN_CHUNK_SIZE = 10;

const FREE_DAILY_LIMIT = 5;
const PRO_DAILY_LIMIT = 20;

// GCSE and A-Level study materials live in separate collections.
function materialsCollectionForLevel(level: string): string {
    return level === "A-Level" ? "alevel_study_materials" : "study_materials";
}

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getUidFromRequest(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const idToken = authHeader.slice(7);
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        return decoded.uid;
    } catch {
        return null;
    }
}

// ─── Rate limit check + increment ─────────────────────────────────────────────
async function checkAndIncrementLimit(uid: string, isPro: boolean): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
}> {
    const limit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
    const limitRef = admin.firestore()
        .collection("users")
        .doc(uid)
        .collection("quizSuggestionLimits")
        .doc(todayKey());

    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(limitRef);
        const used = snap.exists ? (snap.data()!.count as number) : 0;

        if (used >= limit) return { allowed: false, remaining: 0, limit };

        tx.set(
            limitRef,
            { count: FieldValue.increment(1), lastUsed: FieldValue.serverTimestamp() },
            { merge: true }
        );

        return { allowed: true, remaining: limit - used - 1, limit };
    });
}

// ─── Chunked 'in' query helper ─────────────────────────────────────────────────
/**
 * Firestore's 'in' operator only accepts a bounded number of values.
 * Splits `values` into chunks and runs the queries in parallel, merging
 * results (deduped by doc id) into a single array.
 */
async function queryInChunks(
    collection: string,
    field: string,
    values: string[],
    extraFilters: (q: FirebaseFirestore.Query) => FirebaseFirestore.Query
): Promise<FirebaseFirestore.QueryDocumentSnapshot[]> {
    const chunks: string[][] = [];
    for (let i = 0; i < values.length; i += FIRESTORE_IN_CHUNK_SIZE) {
        chunks.push(values.slice(i, i + FIRESTORE_IN_CHUNK_SIZE));
    }

    const results = await Promise.all(
        chunks.map((chunk) => {
            let q: FirebaseFirestore.Query = admin.firestore()
                .collection(collection)
                .where(field, "in", chunk);
            q = extraFilters(q);
            return q.get();
        })
    );

    const seen = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
    for (const snap of results) {
        for (const doc of snap.docs) {
            seen.set(doc.id, doc);
        }
    }
    return Array.from(seen.values());
}

// ─── Cap materials sent to the prompt, per subject ─────────────────────────────
function capMaterialsPerSubject(
    materials: StudyMaterial[],
    maxPerSubject: number
): StudyMaterial[] {
    const bySubject = new Map<string, StudyMaterial[]>();
    for (const m of materials) {
        if (!bySubject.has(m.subject)) bySubject.set(m.subject, []);
        bySubject.get(m.subject)!.push(m);
    }

    const capped: StudyMaterial[] = [];
    for (const list of bySubject.values()) {
        capped.push(...list.slice(0, maxPerSubject));
    }
    return capped;
}

// ─── Request body validation ───────────────────────────────────────────────────
function validateBody(body: unknown): {
    answers: QuizAnswer[];
    selectedSubjects: { subjects: SubjectSelection[]; examBoard: string };
    level?: string;
} {
    if (!body || typeof body !== "object") {
        throw new Error("Invalid request body");
    }
    const { answers, selectedSubjects, level } = body as Record<string, unknown>;

    if (!Array.isArray(answers) || answers.length === 0) {
        throw new Error("answers must be a non-empty array");
    }
    if (
        !selectedSubjects ||
        typeof selectedSubjects !== "object" ||
        !Array.isArray((selectedSubjects as Record<string, unknown>).subjects) ||
        (selectedSubjects as { subjects: unknown[] }).subjects.length === 0
    ) {
        throw new Error("selectedSubjects.subjects must be a non-empty array");
    }

    return {
        answers: answers as QuizAnswer[],
        selectedSubjects: selectedSubjects as { subjects: SubjectSelection[]; examBoard: string },
        level: typeof level === "string" ? level : undefined,
    };
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    // 1. Auth
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Subscription tier
    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    if (!userSnap.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = userSnap.data()!;
    const isPro = userData.subscriptionStatus === "active";

    // 3. Rate limit
    const { allowed, remaining, limit } = await checkAndIncrementLimit(uid, isPro);
    if (!allowed) {
        return NextResponse.json(
            {
                error: `Daily suggestion limit reached (${limit}/day). ${isPro ? "Limit resets at midnight." : "Upgrade to Pro for more suggestions."}`,
                limitReached: true,
                limit,
            },
            { status: 429 }
        );
    }

    try {
        // 4. Parse + validate body
        let parsed;
        try {
            parsed = validateBody(await req.json());
        } catch (err) {
            return NextResponse.json(
                { error: err instanceof Error ? err.message : "Invalid request data" },
                { status: 400 }
            );
        }
        const { answers, selectedSubjects, level } = parsed;

        // Default to GCSE if the client didn't send a level (back-compat).
        const resolvedLevel = level === "A-Level" ? "A-Level" : "GCSE";
        const materialsCollection = materialsCollectionForLevel(resolvedLevel);

        // Calculate subject results from answers
        const subjectResults: Record<string, { correct: number; total: number; questions: QuizAnswer[] }> = {};

        answers.forEach(answer => {
            const subject = answer.subject || 'Unknown';
            if (!subjectResults[subject]) {
                subjectResults[subject] = { correct: 0, total: 0, questions: [] };
            }
            subjectResults[subject].total++;
            if (answer.selectedAnswer === answer.correctAnswer) {
                subjectResults[subject].correct++;
            }
            subjectResults[subject].questions.push(answer);
        });

        // Fetch approved study materials from the level-appropriate collection,
        // chunked to respect Firestore's 'in' value limit.
        const relevantSubjects = selectedSubjects.subjects.map(s => s.name);
        const materialDocs = await queryInChunks(
            materialsCollection,
            'subject',
            relevantSubjects,
            (q) => q.where('moderation_status', '==', 'approved')
        );

        const isALevel = resolvedLevel === "A-Level";
        const allStudyMaterials: StudyMaterial[] = materialDocs.map(doc => {
            const d = doc.data();
            return {
                id: doc.id,
                title: isALevel ? (d.topic ?? d.title ?? 'Untitled') : (d.title ?? 'Untitled'),
                subject: d.subject,
                // A-Level docs store this snake_case; GCSE docs are camelCase.
                studyPackId: isALevel ? (d.study_pack_id ?? d.studyPackId) : (d.studyPackId ?? d.study_pack_id),
                content: d.content,
                description: d.description,
                difficulty: d.difficulty,
            };
        });

        // Cap what actually goes into the prompt — the full fetched set is
        // still available below for enrichment/lookup after the AI responds.
        const studyMaterials = capMaterialsPerSubject(allStudyMaterials, MAX_MATERIALS_PER_SUBJECT_IN_PROMPT);

        // Analyze incorrect answers
        const incorrectAnswers = answers.filter(a => a.selectedAnswer !== a.correctAnswer);

        // Build analysis for each subject
        const subjectAnalysis = Object.entries(subjectResults).map(([subject, result]) => {
            const accuracy = Math.round((result.correct / result.total) * 100);
            const incorrectInSubject = result.questions.filter(
                q => q.selectedAnswer !== q.correctAnswer
            );

            return {
                subject,
                accuracy,
                correct: result.correct,
                total: result.total,
                incorrectQuestions: incorrectInSubject.map(q => q.question),
            };
        });

        // Create prompt for OpenAI
        const prompt = `You are an expert ${resolvedLevel} tutor analyzing a student's quiz performance. Based on the quiz results and available study materials, recommend specific materials for the student to study.

Quiz Performance:
${subjectAnalysis.map(s => `
- ${s.subject}: ${s.accuracy}% (${s.correct}/${s.total} correct)
  Struggled with: ${s.incorrectQuestions.slice(0, 3).join('; ')}
`).join('')}

Available Study Materials:
${studyMaterials.map(m => `
- ID: ${m.id}
  Title: ${m.title}
  Subject: ${m.subject}
  ${m.description ? `Description: ${m.description}` : ''}
`).join('\n')}

Based on this analysis, provide:
1. For each subject where the student scored below 70%, recommend 2-3 specific study materials (by ID) that would help
2. A brief explanation (1-2 sentences) of why each material is recommended
3. Prioritize materials that address the specific topics the student struggled with list

Format your response as a JSON object with this structure:
{
  "overallAnalysis": "Brief overview of student's performance",
  "recommendations": [
    {
      "subject": "subject name",
      "materialIds": ["id1", "id2"],
      "reasoning": "Why these materials will help"
    }
  ],
  "studyPlan": "Brief 2-3 sentence study plan"
}`;

        const completion = await openai.chat.completions.create({
            model: MODEL,
            max_tokens: MAX_OUTPUT_TOKENS,
            messages: [
                {
                    role: "system",
                    content: `You are an expert ${resolvedLevel} tutor who provides personalized study recommendations based on quiz performance. Always respond with valid JSON.`
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            response_format: { type: "json_object" }
        });

        const aiResponse = completion.choices[0].message.content;
        const suggestions = JSON.parse(aiResponse || '{}');

        // Look up recommended materials against the FULL fetched set (not just
        // the capped prompt subset) in case of edge cases, though the AI can
        // only have recommended IDs it actually saw in the prompt.
        const enrichedRecommendations = suggestions.recommendations?.map((rec: any) => {
            const materials = rec.materialIds?.map((id: string) =>
                allStudyMaterials.find(m => m.id === id)
            ).filter(Boolean);

            return {
                ...rec,
                materials
            };
        }) || [];

        return NextResponse.json({
            suggestions: {
                ...suggestions,
                recommendations: enrichedRecommendations
            },
            metadata: {
                level: resolvedLevel,
                totalQuestions: answers.length,
                incorrectCount: incorrectAnswers.length,
                subjectAnalysis
            },
            remaining,
        });

    } catch (error) {
        console.error('Error generating AI suggestions:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}