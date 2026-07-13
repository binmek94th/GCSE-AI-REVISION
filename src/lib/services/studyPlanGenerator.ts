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
    _isGenerated?: boolean;
    [key: string]: any;
    _isUploadedQuestion?: boolean;
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
    subject: string;
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

// Max incomplete materials sent to the AI prompt per pack. Prevents token
// usage/cost from scaling unboundedly with catalog size — a pack with 100+
// approved materials would otherwise dump all of them into every daily
// generation for every enrolled-but-inactive user.
const MAX_MATERIALS_PER_PACK_IN_PROMPT = 15;

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


// ─────────────────────────────────────────────────────────────────────

// Selects which materials from a pack get surfaced to the AI, capped to keep
// prompt size predictable. Generated (student-uploaded, addedToPlan) materials
// are always included first since they were explicitly requested by the student;
// remaining slots are filled from the rest of incompleteMaterials in existing order.
function selectMaterialsForPrompt(
    materials: StudyMaterial[],
    maxCount: number
): StudyMaterial[] {
    if (materials.length <= maxCount) return materials;

    const generated = materials.filter(m => m._isGenerated);
    const rest = materials.filter(m => !m._isGenerated);

    const selected = generated.slice(0, maxCount);
    if (selected.length < maxCount) {
        selected.push(...rest.slice(0, maxCount - selected.length));
    }

    return selected;
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

// Compares two sets of enrolled pack IDs for equality, order-independent.
function packIdSetsEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((id, i) => id === sortedB[i]);
}

export async function generateDailyStudyPlans(): Promise<{
    success: boolean;
    usersProcessed: number;
    plansGenerated: number;
    plansRegeneratedForSubjectChange: number;
    plansSkipped: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let plansGenerated = 0;
    let plansRegeneratedForSubjectChange = 0;
    let plansSkipped = 0;

    try {
        console.log('Starting daily study plan generation run...');
        const usersSnapshot = await admin.firestore().collection('users').get();

        const promises = usersSnapshot.docs.map(async (userDoc) => {
            try {
                const result = await generateStudyPlanForUser(userDoc.id);
                if (result === 'generated') plansGenerated++;
                else if (result === 'regenerated_subjects_changed') plansRegeneratedForSubjectChange++;
                else if (result === 'skipped_already_exists') plansSkipped++;
            } catch (error) {
                const msg = `Failed for user ${userDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(msg);
                console.error(msg);
            }
        });

        await Promise.allSettled(promises);
        console.log(
            `Daily study plan generation run completed! ` +
            `Users scanned: ${usersSnapshot.size} | New: ${plansGenerated} | Regenerated (subjects changed): ${plansRegeneratedForSubjectChange} | Already up to date: ${plansSkipped} | Errors: ${errors.length}`
        );
        return { success: true, usersProcessed: usersSnapshot.size, plansGenerated, plansRegeneratedForSubjectChange, plansSkipped, errors };
    } catch (error) {
        console.error('Error in generateDailyStudyPlans:', error);
        throw error;
    }
}

/**
 * Generates today's study plan for a single user — but ONLY if:
 *   (a) no plan exists yet for today, OR
 *   (b) a plan exists, but the student's enrolled subjects have changed
 *       since it was generated (added or dropped a subject).
 *
 * Designed to be safely called repeatedly (e.g. every 10 minutes via
 * cron): most calls for most users will hit the early-exit check below
 * (existing plan + unchanged subjects) and return immediately without
 * touching materials, uploaded questions, or the OpenAI API.
 *
 * Returns which branch was taken, so the batch runner can report counts.
 */
export async function generateStudyPlanForUser(
    userId: string
): Promise<'generated' | 'regenerated_subjects_changed' | 'skipped_already_exists' | 'skipped_no_active_packs'> {
    try {
        const localDate = DateTime.now().setZone("Africa/Addis_Ababa");
        const dateKey = localDate.toISODate() || new Date().toISOString().split('T')[0];

        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        if (!userDoc.exists) throw new Error(`User ${userId} not found`);

        const userData = userDoc.data();
        const preferences: UserPreferences = userData?.preferences || {};

        const examBoard: string =
            userData?.examBoard ??
            userData?.preferences?.examBoard ??
            null;

        // ── Level (GCSE / A-Level) ────────────────────────────────────────────
        const level: string =
            userData?.level ??
            userData?.preferences?.level ??
            'GCSE';
        const isALevel = level === 'A-Level';

        // ── Enrolled subjects ─────────────────────────────────────────────────
        const subjectsSnapshot = await admin.firestore()
            .collection('users').doc(userId).collection('subjects').get();

        // Only process subjects matching the user's level.
        // Fail-open: docs not yet backfilled (no `level`) are still included.
        const subjectDocs = subjectsSnapshot.docs.filter(d => {
            const docLevel = d.data().level;
            return !docLevel || docLevel === level;
        });

        const currentPackIds = subjectDocs.map(d => d.id);

        // ✅ Existing-plan + subject-change check. A single cheap query (the
        // subjectsSnapshot fetch above, which we need either way) plus one
        // doc read here is far cheaper than the full generation path below,
        // so this stays fast even called every 10 minutes.
        const planRef = admin.firestore()
            .collection('users').doc(userId).collection('dailyStudyPlans').doc(dateKey);
        const existingPlanDoc = await planRef.get();

        let subjectsChanged = false;
        if (existingPlanDoc.exists) {
            const existingData = existingPlanDoc.data()!;
            const storedPackIds: string[] | undefined = existingData.enrolledPackIds;

            if (!storedPackIds) {
                // Legacy plan doc from before this field existed — we can't
                // know whether subjects changed, so fail open and treat it
                // as unchanged rather than force-regenerating every legacy
                // plan on the first cron run after this update ships.
                subjectsChanged = false;
            } else {
                subjectsChanged = !packIdSetsEqual(storedPackIds, currentPackIds);
            }

            if (!subjectsChanged) {
                return 'skipped_already_exists';
            }

            console.log(`User ${userId} enrolled subjects changed since today's plan was generated — regenerating.`);
        }

        console.log(`Generating study plan for user: ${userId} | level: ${level}`);

        if (subjectDocs.length === 0) {
            console.log(`User ${userId} has no ${level} subjects enrolled. Skipping.`);
            return 'skipped_no_active_packs';
        }

        const packAnalyses: PackAnalysis[] = [];

        for (const subjectDoc of subjectDocs) {
            const packId = subjectDoc.id;
            const subjectData = subjectDoc.data();

            const studyPackDoc = await admin.firestore()
                .collection('study_packs').doc(packId).get();

            const subjectName: string =
                studyPackDoc.exists
                    ? (studyPackDoc.data()?.subject ?? subjectData.subject ?? packId)
                    : (subjectData.subject ?? packId);

            // GCSE materials are keyed by subject name in `study_materials`.
            // A-Level materials live in `alevel_study_materials` and are linked
            // to the pack via `study_pack_id` (which equals the pack/enrolment id).
            const materialsQuery = isALevel
                ? admin.firestore()
                    .collection('alevel_study_materials')
                    .where('study_pack_id', '==', packId)
                    .where('moderation_status', '==', 'approved')
                : admin.firestore()
                    .collection('study_materials')
                    .where('subject', '==', subjectName)
                    .where('moderation_status', '==', 'approved');

            const materialsSnapshot = await materialsQuery.get();

            const allMaterials: StudyMaterial[] = materialsSnapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    subject_pack_id: packId,
                    material: d.content,
                    ...d,
                    // A-Level docs store a hash in `title`; the readable name is `topic`.
                    title: isALevel
                        ? (d.topic ?? d.title ?? 'Untitled')
                        : (d.title ?? 'Untitled'),
                } as StudyMaterial;
            });

            const progressDoc = await admin.firestore()
                .collection('users').doc(userId).collection('progress').doc(packId).get();

            const progressData = progressDoc.exists ? progressDoc.data() : {};

            const validMaterialIds = new Set(allMaterials.map(m => m.id));
            const completedMaterialIds = Object.keys(progressData || {}).filter(
                key => progressData![key] === true && validMaterialIds.has(key)
            );

            const incompleteMaterials = allMaterials.filter(
                m => !completedMaterialIds.includes(m.id)
            );

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

        // ── User-generated materials added to plan ────────────────────────────
        // Fetch any materials the student saved and chose "Add to plan" on.
        // These are stored in user_generated_materials with addedToPlan: true.
        const generatedSnap = await admin.firestore()
            .collection('user_generated_materials')
            .where('userId', '==', userId)
            .where('addedToPlan', '==', true)
            .get();

        if (!generatedSnap.empty) {
            // Group docs by subjectName so each subject maps to one pack entry
            const bySubject = new Map<string, StudyMaterial[]>();

            generatedSnap.docs.forEach(d => {
                const data = d.data();
                const subject: string = data.subjectName ?? 'My Notes';
                if (!bySubject.has(subject)) bySubject.set(subject, []);

                bySubject.get(subject)!.push({
                    id: d.id,
                    subject_pack_id: `generated_${subject}`,
                    title: data.subjectName ?? 'Generated Material',
                    difficulty: data.difficulty ?? 'basic',
                    topics: data.topics ?? [],
                    _isGenerated: true,
                } as StudyMaterial);
            });

            bySubject.forEach((materials, subject) => {
                const packId = `generated_${subject}`;

                // If an enrolled pack for this subject already exists, merge into it
                const existing = packAnalyses.find(p => p.packId === packId);
                if (existing) {
                    existing.incompleteMaterials.push(...materials);
                    existing.totalMaterials += materials.length;
                    return;
                }

                // Otherwise create a new virtual pack for these generated materials
                packAnalyses.push({
                    packId,
                    packName: subject,
                    subject,
                    examBoard: examBoard ?? 'N/A',
                    totalMaterials: materials.length,
                    completedMaterials: 0,
                    incompleteMaterials: materials,
                    totalQuestions: 0,
                    correctQuestions: 0,
                    incorrectQuestions: [],
                    progressPercent: 0,
                });
            });

        }
        // ─────────────────────────────────────────────────────────────────────

        // ── Uploaded questions the student asked AI to solve ───────────────────
        // Any unresolved (completed: false) uploaded_question docs get folded
        // into today's plan, grouped by subject, same as generated materials —
        // so topics the student got stuck on keep recurring until they mark
        // themselves as understanding it.
        const uploadedQuestionsSnap = await admin.firestore()
            .collection('users').doc(userId).collection('uploaded_question')
            .where('completed', '==', false)
            .get();

        if (!uploadedQuestionsSnap.empty) {
            const byUploadedSubject = new Map<string, StudyMaterial[]>();

            uploadedQuestionsSnap.docs.forEach(d => {
                const data = d.data();
                const subject: string = data.subject ?? 'General';
                if (!byUploadedSubject.has(subject)) byUploadedSubject.set(subject, []);

                byUploadedSubject.get(subject)!.push({
                    id: d.id,
                    subject_pack_id: `uploaded_${subject}`,
                    title: data.topic ?? 'Uploaded Question',
                    difficulty: data.difficulty ?? 'medium',
                    questionText: data.questionText,
                    solution: data.solution,
                    _isGenerated: true, // reuse the same "prioritize" flag the AI prompt already respects
                    _isUploadedQuestion: true,
                } as StudyMaterial);
            });

            byUploadedSubject.forEach((materials, subject) => {
                const packId = `uploaded_${subject}`;

                // Merge into an existing pack for this subject if one exists
                // (either an enrolled pack or the generated-materials virtual pack).
                const existing = packAnalyses.find(p => p.subject === subject);
                if (existing) {
                    existing.incompleteMaterials.push(...materials);
                    existing.totalMaterials += materials.length;
                    return;
                }

                packAnalyses.push({
                    packId,
                    packName: subject,
                    subject,
                    examBoard: examBoard ?? 'N/A',
                    totalMaterials: materials.length,
                    completedMaterials: 0,
                    incompleteMaterials: materials,
                    totalQuestions: 0,
                    correctQuestions: 0,
                    incorrectQuestions: [],
                    progressPercent: 0,
                });
            });
        }

        const activePacks = packAnalyses.filter(
            pack => pack.incompleteMaterials.length > 0 || pack.incorrectQuestions.length > 0
        );

        if (activePacks.length === 0) {
            console.log(`User ${userId} has completed all materials. Skipping.`);
            return 'skipped_no_active_packs';
        }

        const rawPlan = await generateStudyPlanWithAI(preferences, activePacks, level);
        const lookup = buildMaterialLookup(activePacks);
        const validatedSessions = enrichAndValidateSessions(rawPlan.sessions, activePacks, lookup);
        const finalSessions = padSessions(validatedSessions, activePacks, 8, 20);

        const studyPlan: StudyPlan = { ...rawPlan, sessions: finalSessions };

        await planRef.set({
            plan: studyPlan,
            createdAt: existingPlanDoc.exists ? existingPlanDoc.data()!.createdAt : new Date(),
            regeneratedAt: existingPlanDoc.exists ? new Date() : null,
            date: dateKey,
            level,
            preferences,
            status: 'active',
            // ✅ Snapshot of enrolled pack IDs used to build this plan — read
            // back on the next call to detect subject-list changes.
            enrolledPackIds: currentPackIds,
        });

        const wasRegeneration = existingPlanDoc.exists;
        console.log(
            `${wasRegeneration ? 'Re-generated' : 'Generated'} study plan for user: ${userId} | ` +
            `level: ${level} | sessions: ${finalSessions.length} | packs: ${activePacks.length}`
        );
        return wasRegeneration ? 'regenerated_subjects_changed' : 'generated';
    } catch (error) {
        console.error(`Error generating study plan for user ${userId}:`, error);
        throw error;
    }
}

async function generateStudyPlanWithAI(
    preferences: UserPreferences,
    packAnalyses: PackAnalysis[],
    level: string,
): Promise<StudyPlan> {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const minSessions = 8;
    const sessionDuration = 20;

    try {
        const hoursPerWeek = preferences.hoursPerWeek || '10-15';
        const [minHours, maxHours] = hoursPerWeek.split('-').map(h => parseInt(h));
        const avgDailyHours = ((minHours + maxHours) / 2) / 7;

        const packsContext = packAnalyses.map(pack => {
            const materialsForPrompt = selectMaterialsForPrompt(
                pack.incompleteMaterials,
                MAX_MATERIALS_PER_PACK_IN_PROMPT
            );

            return {
                packId: pack.packId,
                subject: pack.subject,
                packName: pack.packName,
                examBoard: pack.examBoard,
                progressPercent: pack.progressPercent,
                totalMaterials: pack.totalMaterials,
                completedMaterials: pack.completedMaterials,
                incompleteMaterials: materialsForPrompt.map(m => ({
                    id: m.id,
                    title: m.title,
                    difficulty: m.difficulty || 'basic',
                    isGenerated: m._isGenerated ?? false,
                })),
                // Lets the model know there's more available than what's shown,
                // so it doesn't assume the pack only has these few materials.
                totalIncompleteAvailable: pack.incompleteMaterials.length,
                totalQuestions: pack.totalQuestions,
                correctQuestions: pack.correctQuestions,
                incorrectQuestionsCount: pack.incorrectQuestions.length,
                priorityScore: pack.progressPercent,
            };
        }).sort((a, b) => a.priorityScore - b.priorityScore);

        const prompt = `You are an educational planning assistant. Generate a personalized ${level} study plan for today.

User Information:
- Qualification Level: ${level}
- Target Grade: ${preferences.targetGrade || 'Not specified'}
- Daily Study Time Available: ${avgDailyHours.toFixed(1)} hours (${Math.round(avgDailyHours * 60)} minutes)

Study Packs (sorted by priority — lowest progress first):
${JSON.stringify(packsContext, null, 2)}

Note: incompleteMaterials shown per pack is capped at ${MAX_MATERIALS_PER_PACK_IN_PROMPT}. totalIncompleteAvailable shows the real count when it's higher — don't assume the pack has no more materials than what's listed.

RULES:
1. Create AT LEAST ${minSessions} sessions of ${sessionDuration} minutes each.
2. Each session MUST use an "id" value that appears verbatim in the incompleteMaterials array for that pack. Do NOT invent IDs.
3. Distribute sessions equally across all packs/subjects.
4. Use different materials for different sessions where possible.
5. Include short breaks every 2–3 sessions and a longer break mid-day.
6. Materials with isGenerated: true are the student's own uploaded notes — treat them as high priority since the student explicitly requested them.

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
                    content: `You are an expert ${level} educational planner. Always respond with valid JSON only.
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