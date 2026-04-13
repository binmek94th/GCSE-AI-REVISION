import admin from "@/lib/firebaseAdmin";
import OpenAI from 'openai';
import { DateTime } from "luxon";

interface UserPreferences {
    hoursPerWeek: string;
    targetGrade: string;
    studyStyle?: string;
}

interface StudyMaterial {
    id: string;
    subject_pack_id: string;
    title: string;
    difficulty?: string;
    [key: string]: any;
}

interface QuestionResult {
    questionId: string;
    answeredAt: Date;
    correct: boolean;
    userAnswer: string;
}

interface PackAnalysis {
    packId: string;
    packName: string;
    subject: string;        // the resolved subject name, e.g. "Biology"
    examBoard: string;
    totalMaterials: number;
    completedMaterials: number;
    incompleteMaterials: StudyMaterial[];
    totalQuestions: number;
    correctQuestions: number;
    incorrectQuestions: QuestionResult[];
    progressPercent: number;
}

interface StudySession {
    subject: string;
    packId: string;
    materialId: string;
    material: StudyMaterial | null;
    materialTitle: string;
    difficulty: string;
    duration: string;
    timeSlot: string;
    objectives: string[];
    focusArea: string;
}

interface Break {
    after: string;
    duration: string;
    type: string;
}

interface StudyPlan {
    totalStudyTime: string;
    sessions: StudySession[];
    breaks: Break[];
    dailyGoal: string;
    tips: string[];
    error?: string;
}

function buildMaterialLookup(
    packAnalyses: PackAnalysis[]
): Map<string, Map<string, StudyMaterial>> {
    const lookup = new Map<string, Map<string, StudyMaterial>>();
    for (const pack of packAnalyses) {
        const byId = new Map<string, StudyMaterial>();
        for (const mat of pack.incompleteMaterials) {
            byId.set(mat.id, mat);
        }
        lookup.set(pack.packId, byId);
    }
    return lookup;
}

function enrichAndValidateSessions(
    sessions: StudySession[],
    packAnalyses: PackAnalysis[],
    lookup: Map<string, Map<string, StudyMaterial>>
): StudySession[] {
    const fallbackPointers = new Map<string, number>();
    for (const pack of packAnalyses) {
        fallbackPointers.set(pack.packId, 0);
    }

    const validated: StudySession[] = [];

    for (const session of sessions) {
        const packMaterials = lookup.get(session.packId);

        if (!packMaterials) {
            console.warn(`Session dropped – unknown packId: ${session.packId}`);
            continue;
        }

        const pack = packAnalyses.find(p => p.packId === session.packId)!;
        let material = packMaterials.get(session.materialId) ?? null;

        if (!material) {
            const ptr = fallbackPointers.get(session.packId) ?? 0;
            const available = pack.incompleteMaterials;

            if (available.length === 0) {
                console.warn(`Session dropped – no incomplete materials for pack: ${session.packId}`);
                continue;
            }

            material = available[ptr % available.length];
            fallbackPointers.set(session.packId, ptr + 1);

            console.warn(
                `AI used invalid materialId "${session.materialId}" for pack "${session.packId}". ` +
                `Replaced with: "${material.id}" (${material.title})`
            );
        }

        validated.push({
            ...session,
            materialId: material.id,
            materialTitle: material.title,
            difficulty: material.difficulty || session.difficulty || 'medium',
            material,
        });
    }

    return validated;
}

function padSessions(
    sessions: StudySession[],
    packAnalyses: PackAnalysis[],
    minSessions: number,
    sessionDuration: number
): StudySession[] {
    if (sessions.length >= minSessions) return sessions;

    const timeSlots = ['Morning', 'Late Morning', 'Afternoon', 'Evening'];
    const usedMaterialIds = new Set(sessions.map(s => s.materialId));

    let packIndex = 0;
    const padded = [...sessions];

    while (padded.length < minSessions) {
        const pack = packAnalyses[packIndex % packAnalyses.length];
        packIndex++;

        const unusedMaterial = pack.incompleteMaterials.find(m => !usedMaterialIds.has(m.id));
        if (!unusedMaterial) continue;

        usedMaterialIds.add(unusedMaterial.id);
        padded.push({
            subject: pack.subject,
            packId: pack.packId,
            materialId: unusedMaterial.id,
            materialTitle: unusedMaterial.title,
            difficulty: unusedMaterial.difficulty || 'medium',
            duration: `${sessionDuration} minutes`,
            timeSlot: timeSlots[padded.length % timeSlots.length],
            objectives: [`Study ${unusedMaterial.title}`],
            focusArea: 'new_material',
            material: unusedMaterial,
        });
    }

    return padded;
}

export async function generateDailyStudyPlans(): Promise<{
    success: boolean;
    usersProcessed: number;
    errors: string[];
}> {
    const errors: string[] = [];

    try {
        console.log('Starting daily study plan generation...');
        const usersSnapshot = await admin.firestore().collection('users').get();

        const promises = usersSnapshot.docs.map(async (userDoc) => {
            try {
                await generateStudyPlanForUser(userDoc.id);
            } catch (error) {
                const msg = `Failed for user ${userDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(msg);
                console.error(msg);
            }
        });

        await Promise.allSettled(promises);
        console.log('Daily study plan generation completed!');
        return { success: true, usersProcessed: usersSnapshot.size, errors };
    } catch (error) {
        console.error('Error in generateDailyStudyPlans:', error);
        throw error;
    }
}

export async function generateStudyPlanForUser(userId: string): Promise<void> {
    try {
        console.log(`Generating study plan for user: ${userId}`);

        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error(`User ${userId} not found`);

        const userData = userDoc.data();
        const preferences: UserPreferences = userData?.preferences || {};

        // ── Resolve examBoard — same fallback chain as enroll-subject ──────────
        const examBoard: string =
            userData?.examBoard ??
            userData?.preferences?.examBoard ??
            null;

        // ── Load user's enrolled subjects from users/{uid}/subjects ────────────
        const subjectsSnapshot = await admin.firestore()
            .collection('users').doc(userId).collection('subjects').get();

        if (subjectsSnapshot.empty) {
            console.log(`User ${userId} has no enrolled subjects. Skipping.`);
            return;
        }

        const packAnalyses: PackAnalysis[] = [];

        for (const subjectDoc of subjectsSnapshot.docs) {
            const packId = subjectDoc.id;
            const subjectData = subjectDoc.data();

            // ── Resolve the real subject name from study_packs ─────────────────
            // study_materials.subject stores names like "Biology", not pack IDs
            const studyPackDoc = await admin.firestore()
                .collection('study_packs').doc(packId).get();

            const subjectName: string =
                studyPackDoc.exists
                    ? (studyPackDoc.data()?.subject ?? subjectData.subject ?? packId)
                    : (subjectData.subject ?? packId);

            // ── Fetch materials the same way /api/study-materials does ─────────
            let materialsQuery = admin.firestore()
                .collection('study_materials')
                .where('subject', '==', subjectName)
                .where('moderation_status', '==', 'approved');

            if (examBoard) {
                materialsQuery = (materialsQuery as any).where('exam_board', '==', examBoard);
            }

            const materialsSnapshot = await materialsQuery.get();

            const allMaterials: StudyMaterial[] = materialsSnapshot.docs.map(doc => ({
                id: doc.id,
                subject_pack_id: packId,
                ...doc.data(),
            } as StudyMaterial));

            // ── Progress: which materials has the user completed? ──────────────
            const progressDoc = await admin.firestore()
                .collection('users').doc(userId).collection('progress').doc(packId).get();

            const progressData = progressDoc.exists ? progressDoc.data() : {};

            // Only count progress against materials that actually exist + are approved
            const validMaterialIds = new Set(allMaterials.map(m => m.id));
            const completedMaterialIds = Object.keys(progressData || {}).filter(
                key => progressData![key] === true && validMaterialIds.has(key)
            );

            const incompleteMaterials = allMaterials.filter(
                m => !completedMaterialIds.includes(m.id)
            );

            // ── Question progress ──────────────────────────────────────────────
            const questionProgressDoc = await admin.firestore()
                .collection('users').doc(userId).collection('question_progress').doc(packId).get();

            const questionProgressData = questionProgressDoc.exists
                ? questionProgressDoc.data() : {};

            const incorrectQuestions: QuestionResult[] = [];
            let totalQuestions = 0;
            let correctQuestions = 0;

            if (questionProgressData) {
                Object.keys(questionProgressData).forEach(questionId => {
                    const q = questionProgressData[questionId];
                    totalQuestions++;
                    if (q.correct) {
                        correctQuestions++;
                    } else {
                        incorrectQuestions.push({
                            questionId,
                            answeredAt: q.answeredAt?.toDate() || new Date(),
                            correct: q.correct,
                            userAnswer: q.userAnswer,
                        });
                    }
                });
            }

            const progressPercent = allMaterials.length > 0
                ? Math.round((completedMaterialIds.length / allMaterials.length) * 100)
                : 0;

            packAnalyses.push({
                packId,
                packName: subjectData.subject || subjectName,
                subject: subjectName,
                examBoard: examBoard ?? subjectData.examBoard ?? 'Unknown',
                totalMaterials: allMaterials.length,
                completedMaterials: completedMaterialIds.length,
                incompleteMaterials,
                totalQuestions,
                correctQuestions,
                incorrectQuestions,
                progressPercent,
            });
        }

        const activePacks = packAnalyses.filter(
            pack => pack.incompleteMaterials.length > 0 || pack.incorrectQuestions.length > 0
        );

        if (activePacks.length === 0) {
            console.log(`User ${userId} has completed all materials. Skipping.`);
            return;
        }

        const rawPlan = await generateStudyPlanWithAI(preferences, activePacks);
        const lookup = buildMaterialLookup(activePacks);
        const validatedSessions = enrichAndValidateSessions(rawPlan.sessions, activePacks, lookup);
        const finalSessions = padSessions(validatedSessions, activePacks, 8, 20);

        const studyPlan: StudyPlan = { ...rawPlan, sessions: finalSessions };

        const localDate = DateTime.now().setZone("Africa/Addis_Ababa");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dateKey = localDate.toISODate() || today.toISOString().split('T')[0];

        await admin.firestore()
            .collection('users').doc(userId).collection('dailyStudyPlans').doc(dateKey)
            .set({
                plan: studyPlan,
                createdAt: new Date(),
                date: dateKey,
                preferences,
                status: 'active',
            });

        console.log(`Study plan generated for user: ${userId} | sessions: ${finalSessions.length} | packs: ${activePacks.length}`);
    } catch (error) {
        console.error(`Error generating study plan for user ${userId}:`, error);
        throw error;
    }
}

async function generateStudyPlanWithAI(
    preferences: UserPreferences,
    packAnalyses: PackAnalysis[],
): Promise<StudyPlan> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const minSessions = 8;
    const sessionDuration = 20;

    try {
        const hoursPerWeek = preferences.hoursPerWeek || '10-15';
        const [minHours, maxHours] = hoursPerWeek.split('-').map(h => parseInt(h));
        const avgDailyHours = ((minHours + maxHours) / 2) / 7;

        const packsContext = packAnalyses.map(pack => ({
            packId: pack.packId,
            subject: pack.subject,
            packName: pack.packName,
            examBoard: pack.examBoard,
            progressPercent: pack.progressPercent,
            totalMaterials: pack.totalMaterials,
            completedMaterials: pack.completedMaterials,
            incompleteMaterials: pack.incompleteMaterials.map(m => ({
                id: m.id,
                title: m.title,
                difficulty: m.difficulty || 'basic',
            })),
            totalQuestions: pack.totalQuestions,
            correctQuestions: pack.correctQuestions,
            incorrectQuestionsCount: pack.incorrectQuestions.length,
            priorityScore: pack.progressPercent,
        })).sort((a, b) => a.priorityScore - b.priorityScore);

        const prompt = `You are an educational planning assistant. Generate a personalized study plan for today.

User Information:
- Target Grade: ${preferences.targetGrade || 'Not specified'}
- Daily Study Time Available: ${avgDailyHours.toFixed(1)} hours (${Math.round(avgDailyHours * 60)} minutes)

Study Packs (sorted by priority — lowest progress first):
${JSON.stringify(packsContext, null, 2)}

RULES:
1. Create AT LEAST ${minSessions} sessions of ${sessionDuration} minutes each.
2. Each session MUST use an "id" value that appears verbatim in the incompleteMaterials array for that pack. Do NOT invent IDs.
3. Distribute sessions equally across all packs/subjects.
4. Use different materials for different sessions where possible.
5. Include short breaks every 2–3 sessions and a longer break mid-day.

Respond ONLY with a JSON object in this exact shape:
{
  "totalStudyTime": "X hours Y minutes",
  "sessions": [
    {
      "subject": "<subject from pack>",
      "packId": "<exact packId>",
      "materialId": "<exact id from incompleteMaterials — never invent this>",
      "materialTitle": "<exact title from incompleteMaterials>",
      "difficulty": "<easy|medium|hard>",
      "duration": "${sessionDuration} minutes",
      "timeSlot": "<Morning|Late Morning|Afternoon|Evening>",
      "objectives": ["<objective 1>", "<objective 2>"],
      "focusArea": "<new_material|review_incorrect|practice>"
    }
  ],
  "breaks": [
    { "after": "Session X", "duration": "X minutes", "type": "short|long" }
  ],
  "dailyGoal": "<specific goal>",
  "tips": ["<tip 1>", "<tip 2>"]
}`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert educational planner. Always respond with valid JSON only.
Never invent material IDs — only use IDs from the incompleteMaterials arrays provided.
Create at least ${minSessions} sessions rotating across all subjects.`,
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
        });

        return JSON.parse(response.choices[0].message.content || '{}') as StudyPlan;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);

        // Fallback: build plan directly from real Firestore data
        const sessions: StudySession[] = [];
        const timeSlots = ['Morning', 'Late Morning', 'Afternoon', 'Evening'];
        let sessionCount = 0;

        while (sessionCount < minSessions) {
            const pack = packAnalyses[sessionCount % packAnalyses.length];
            const materialIndex = Math.floor(sessionCount / packAnalyses.length);

            if (materialIndex < pack.incompleteMaterials.length) {
                const material = pack.incompleteMaterials[materialIndex];
                sessions.push({
                    subject: pack.subject,
                    packId: pack.packId,
                    materialId: material.id,
                    materialTitle: material.title,
                    difficulty: material.difficulty || 'medium',
                    duration: `${sessionDuration} minutes`,
                    timeSlot: timeSlots[sessionCount % timeSlots.length],
                    objectives: [`Study ${material.title}`],
                    focusArea: 'new_material',
                    material,
                });
                sessionCount++;
            } else {
                break;
            }
        }

        return {
            totalStudyTime: `${Math.round((sessions.length * sessionDuration) / 60)} hours ${(sessions.length * sessionDuration) % 60} minutes`,
            sessions,
            breaks: [
                { after: 'Session 2', duration: '10 minutes', type: 'short' },
                { after: 'Session 5', duration: '20 minutes', type: 'long' },
            ],
            dailyGoal: 'Complete multiple study materials across all subjects',
            tips: ['Take breaks between sessions', 'Stay hydrated', 'Review difficult concepts'],
            error: 'AI generation failed, using fallback plan',
        };
    }
}