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
    subject: string;
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
    materialTitle: string;
    difficulty: string;
    duration: string;
    timeSlot: string;
    objectives: string[];
    focusArea: string; // "new_material" | "review_incorrect" | "practice"
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

// Initialize OpenAI

/**
 * Main function to generate study plans for all users
 */
export async function generateDailyStudyPlans(): Promise<{
    success: boolean;
    usersProcessed: number;
    errors: string[];
}> {
    const errors: string[] = [];

    try {
        console.log('Starting daily study plan generation...');

        // Get all users
        const usersSnapshot = await admin.firestore().collection('users').get();

        const promises = usersSnapshot.docs.map(async (userDoc) => {
            try {
                await generateStudyPlanForUser(userDoc.id);
            } catch (error) {
                const errorMessage = `Failed for user ${userDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                errors.push(errorMessage);
                console.error(errorMessage);
            }
        });

        // Wait for all study plans to be generated
        await Promise.allSettled(promises);

        console.log('Daily study plan generation completed!');

        return {
            success: true,
            usersProcessed: usersSnapshot.size,
            errors,
        };
    } catch (error) {
        console.error('Error in generateDailyStudyPlans:', error);
        throw error;
    }
}

/**
 * Generate study plan for a single user
 */
export async function generateStudyPlanForUser(userId: string): Promise<void> {
    try {
        console.log(`Generating study plan for user: ${userId}`);

        // Get user data
        const userDoc = await admin.firestore().collection('users').doc(userId).get();

        if (!userDoc.exists) {
            throw new Error(`User ${userId} not found`);
        }

        const userData = userDoc.data();
        const preferences: UserPreferences = userData?.preferences || {};

        // Get bought study packs
        const boughtPacksSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('boughtPacks')
            .get();

        if (boughtPacksSnapshot.empty) {
            console.log(`User ${userId} has no bought packs. Skipping.`);
            return;
        }

        // Analyze each pack: materials, progress, and question performance
        const packAnalyses: PackAnalysis[] = [];

        for (const packDoc of boughtPacksSnapshot.docs) {
            const packId = packDoc.id;
            const packData = packDoc.data();

            // Get all study materials for this pack
            const materialsSnapshot = await admin.firestore()
                .collection('study_materials')
                .where('study_pack_id', '==', packId)
                .get();

            const allMaterials: StudyMaterial[] = materialsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as StudyMaterial));

            // Get user's progress for this pack
            const progressSnapshot = await admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('progress')
                .doc(packId)
                .get();

            const progressData = progressSnapshot.exists ? progressSnapshot.data() : {};
            const completedMaterialIds = Object.keys(progressData || {}).filter(
                key => progressData![key] === true
            );

            // Get incomplete materials
            const incompleteMaterials = allMaterials.filter(
                material => !completedMaterialIds.includes(material.id)
            );

            // Get question progress for this pack
            const questionProgressSnapshot = await admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('question_progress')
                .doc(packId)
                .get();

            const questionProgressData = questionProgressSnapshot.exists
                ? questionProgressSnapshot.data()
                : {};

            const incorrectQuestions: QuestionResult[] = [];
            let totalQuestions = 0;
            let correctQuestions = 0;

            if (questionProgressData) {
                Object.keys(questionProgressData).forEach(questionId => {
                    const questionData = questionProgressData[questionId];
                    totalQuestions++;

                    if (questionData.correct) {
                        correctQuestions++;
                    } else {
                        incorrectQuestions.push({
                            questionId,
                            answeredAt: questionData.answeredAt?.toDate() || new Date(),
                            correct: questionData.correct,
                            userAnswer: questionData.userAnswer,
                        });
                    }
                });
            }

            const progressPercent = allMaterials.length > 0
                ? Math.round((completedMaterialIds.length / allMaterials.length) * 100)
                : 0;

            packAnalyses.push({
                packId,
                packName: packData.name || packData.subject || 'Unnamed Pack',
                subject: packData.subject || 'General',
                totalMaterials: allMaterials.length,
                completedMaterials: completedMaterialIds.length,
                incompleteMaterials,
                totalQuestions,
                correctQuestions,
                incorrectQuestions,
                progressPercent,
            });
        }

        // Filter out packs with no incomplete materials
        const activePacks = packAnalyses.filter(
            pack => pack.incompleteMaterials.length > 0 || pack.incorrectQuestions.length > 0
        );

        if (activePacks.length === 0) {
            console.log(`User ${userId} has completed all materials. Skipping.`);
            return;
        }

        const studyPlan = await generateStudyPlanWithAI(
            preferences,
            activePacks,
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0);


        const localDate = DateTime.now().setZone("Africa/Addis_Ababa");
        const dateKey = localDate.toISODate() || today.toISOString().split('T')[0];


        await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('dailyStudyPlans')
            .doc(dateKey)
            .set({
                plan: studyPlan,
                createdAt: new Date(), // UTC timestamp for consistency
                date: dateKey,         // Local date string (e.g., 2025-10-17)
                preferences,
                status: 'active',
            });


        console.log(`Study plan generated successfully for user: ${userId}`);
    } catch (error) {
        console.error(`Error generating study plan for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Generate study plan using OpenAI API
 */
async function generateStudyPlanWithAI(
    preferences: UserPreferences,
    packAnalyses: PackAnalysis[],
): Promise<StudyPlan> {
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
    });

    try {
        // Calculate daily study hours
        const hoursPerWeek = preferences.hoursPerWeek || '10-15';
        const [minHours, maxHours] = hoursPerWeek.split('-').map((h) => parseInt(h));
        const avgDailyHours = ((minHours + maxHours) / 2) / 7;

        const minSessions = 8;
        const sessionDuration = 20; // minutes per material

        const packsContext = packAnalyses.map((pack) => ({
            packId: pack.packId,
            subject: pack.subject,
            packName: pack.packName,
            progressPercent: pack.progressPercent,

            // Materials info
            totalMaterials: pack.totalMaterials,
            completedMaterials: pack.completedMaterials,
            incompleteMaterials: pack.incompleteMaterials.map(m => ({
                id: m.id,
                title: m.title,
                difficulty: m.difficulty || 'medium',
            })),

            // Question performance
            totalQuestions: pack.totalQuestions,
            correctQuestions: pack.correctQuestions,
            incorrectQuestionsCount: pack.incorrectQuestions.length,

            // Priority score (lower is higher priority)
            priorityScore: pack.progressPercent,
        })).sort((a, b) => a.priorityScore - b.priorityScore);

        const prompt = `You are an educational planning assistant. Generate a personalized study plan for today.

User Information:
- Target Grade: ${preferences.targetGrade || 'Not specified'}
- Daily Study Time Available: ${avgDailyHours.toFixed(1)} hours (${Math.round(avgDailyHours * 60)} minutes)
- Study Preferences: ${JSON.stringify(preferences, null, 2)}

Study Packs Analysis (sorted by priority - lowest progress first):
${JSON.stringify(packsContext, null, 2)}

CRITICAL REQUIREMENTS:

1. **MINIMUM SESSION COUNT**: You MUST create AT LEAST ${minSessions} study sessions (8 or more). Aim for ${Math.min(12, Math.floor((avgDailyHours * 60) / sessionDuration))} sessions if time allows.

2. **SESSION DURATION**: Each study session should be approximately ${sessionDuration} minutes (this is the standard time to complete one material).

3. **Equal Time Distribution**: Distribute study time EQUALLY across ALL subjects/packs. Each subject should get approximately the same number of sessions.

4. **Material Selection - MANDATORY**:
   - You MUST select specific materials from the incompleteMaterials array
   - NEVER use "N/A" or generic titles like "Review Incorrect Questions"
   - Each session MUST have a real materialId from incompleteMaterials
   - Even for review sessions, pick a specific material to review
   - Use the material's actual title, not generic descriptions
   - Different sessions should use DIFFERENT materials (don't repeat materials unless necessary)

5. **Priority Order**:
   - First: Select incomplete materials the user hasn't studied yet
   - If a pack has incorrectQuestionsCount > 0, pick materials related to those weak areas
   - Choose materials with appropriate difficulty for target grade
   - Rotate between subjects to maintain variety

6. **Study Session Structure**:
   - Each session must have a REAL material ID from incompleteMaterials (never "N/A")
   - Use the exact materialTitle from incompleteMaterials
   - Include clear learning objectives based on the specific material
   - Balance difficulty throughout the day
   - Alternate between subjects to prevent fatigue

7. **Time Allocation**:
   - Total study time should utilize available time: ${avgDailyHours.toFixed(1)} hours
   - With ${sessionDuration} min per session, aim for ${Math.floor((avgDailyHours * 60) / sessionDuration)} sessions
   - Minimum ${minSessions} sessions required, even if it means slightly less time per session
   - Distribute sessions equally across subjects

8. **Breaks**:
   - Include a 5-10 minute break after every 2-3 sessions
   - Include a 15-20 minute break after 4-5 sessions (for lunch/longer rest)

9. **Focus Areas**:
   - "new_material": For materials not yet completed
   - "review_incorrect": Only use if picking materials related to incorrect questions, but still use a REAL material
   - "practice": For reinforcement of completed materials

Format your response as a JSON object:
{
  "totalStudyTime": "X hours Y minutes",
  "sessions": [
    {
      "subject": "Subject name from packs",
      "packId": "exact pack ID from above (e.g., 'biology', 'maths')",
      "materialId": "MUST be exact material ID from incompleteMaterials - NEVER use 'N/A'",
      "materialTitle": "MUST be exact material title from incompleteMaterials",
      "difficulty": "easy/medium/hard (from the material)",
      "duration": "${sessionDuration} minutes",
      "timeSlot": "Morning/Late Morning/Afternoon/Evening",
      "objectives": ["specific objective 1 based on this material", "specific objective 2"],
      "focusArea": "new_material" or "review_incorrect" or "practice"
    }
    // ... MINIMUM ${minSessions} sessions, preferably more
  ],
  "breaks": [
    {
      "after": "Session X",
      "duration": "X minutes",
      "type": "short/long"
    }
  ],
  "dailyGoal": "Specific goal based on the actual materials selected",
  "tips": ["personalized tip 1", "personalized tip 2"]
}

EXAMPLE of CORRECT session:
{
  "subject": "Biology",
  "packId": "biology",
  "materialId": "9Y96ljQg2a9gncuTfIat",
  "materialTitle": "Introduction to Ecosystems",
  "difficulty": "medium",
  "duration": "20 minutes",
  "timeSlot": "Morning",
  "objectives": ["Learn components of an ecosystem", "Understand food chains"],
  "focusArea": "new_material"
}

REMEMBER: 
- CREATE AT LEAST ${minSessions} SESSIONS (this is mandatory!)
- Each session = ${sessionDuration} minutes
- ALWAYS use real material IDs from incompleteMaterials
- NEVER use "N/A" or generic titles
- Use different materials for different sessions
- Rotate between subjects for variety
- Each pack should have multiple sessions`;

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert educational planner. You create comprehensive study schedules with at least ${minSessions} study sessions, giving equal time to all subjects and prioritizing incomplete materials. Each material takes approximately ${sessionDuration} minutes to complete. Always respond with valid JSON and use only the specific material IDs provided. Create as many sessions as the available time allows, with a minimum of ${minSessions} sessions.`,
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 4000, // Increased to accommodate more sessions
            response_format: { type: 'json_object' },
        });

        const studyPlan = JSON.parse(
            response.choices[0].message.content || '{}'
        ) as StudyPlan;

        // Validate that we have minimum sessions
        if (studyPlan.sessions.length < minSessions) {
            console.warn(`AI generated only ${studyPlan.sessions.length} sessions, expected at least ${minSessions}`);
        }

        return studyPlan;
    } catch (error) {
        console.error('Error calling OpenAI API:', error);

        // Return a more comprehensive fallback plan with multiple sessions
        const sessions = [];
        const minSessions = 8;
        let sessionCount = 0;

        // Create sessions rotating through packs
        while (sessionCount < minSessions && sessionCount < packAnalyses.length * 3) {
            const packIndex = sessionCount % packAnalyses.length;
            const pack = packAnalyses[packIndex];
            const materialIndex = Math.floor(sessionCount / packAnalyses.length);

            if (materialIndex < pack.incompleteMaterials.length) {
                const material = pack.incompleteMaterials[materialIndex];
                sessions.push({
                    subject: pack.subject,
                    packId: pack.packId,
                    materialId: material.id,
                    materialTitle: material.title,
                    difficulty: material.difficulty || 'medium',
                    duration: '20 minutes',
                    timeSlot: sessionCount < 3 ? 'Morning' : sessionCount < 6 ? 'Afternoon' : 'Evening',
                    objectives: [`Study ${material.title}`],
                    focusArea: 'new_material',
                });
                sessionCount++;
            }
        }

        return {
            totalStudyTime: `${Math.round((sessions.length * 20) / 60)} hours ${(sessions.length * 20) % 60} minutes`,
            sessions: sessions,
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