import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import admin from "firebase-admin";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { answers, selectedSubjects } = body as {
            answers: QuizAnswer[];
            selectedSubjects: { subjects: SubjectSelection[]; examBoard: string };
        };

        if (!answers || !selectedSubjects) {
            return NextResponse.json(
                { error: 'Missing required data' },
                { status: 400 }
            );
        }

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

        // Fetch study materials from Firebase for relevant subjects
        const relevantSubjects = selectedSubjects.subjects.map(s => s.name);
        const studyMaterialsSnapshot = await admin.firestore()
            .collection('study_materials')
            .where('subject', 'in', relevantSubjects)
            .get();

        const studyMaterials: StudyMaterial[] = studyMaterialsSnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title,
            subject: doc.data().subject,
            studyPackId: doc.data().studyPackId,
            content: doc.data().content,
            description: doc.data().description,
            difficulty: doc.data().difficulty,
        }));

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
        const prompt = `You are an expert GCSE tutor analyzing a student's quiz performance. Based on the quiz results and available study materials, recommend specific materials for the student to study.

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
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an expert GCSE tutor who provides personalized study recommendations based on quiz performance. Always respond with valid JSON."
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

        const enrichedRecommendations = suggestions.recommendations?.map((rec: any) => {
            const materials = rec.materialIds?.map((id: string) =>
                studyMaterials.find(m => m.id === id)
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
                totalQuestions: answers.length,
                incorrectCount: incorrectAnswers.length,
                subjectAnalysis
            }
        });

    } catch (error) {
        console.error('Error generating AI suggestions:', error);
        return NextResponse.json(
            { error: 'Failed to generate suggestions' },
            { status: 500 }
        );
    }
}