import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// Helper function to format subject names
function formatSubjectName(subject: string): string {
    const formatted = subject
        .replace(/_/g, " ")
        .split(" ")
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

    if (formatted === "Art And Design") return "Art & Design";
    return formatted;
}

// ------------------------
// GET: Fetch mock test questions by subject
// ------------------------
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const subject = searchParams.get("subject");
        const questionCount = parseInt(searchParams.get("questionCount") || "20", 10);
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken || !subject) {
            return NextResponse.json(
                { message: "Missing ID token or subject" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const formattedSubject = formatSubjectName(subject);

        // Check if user has access to this subject
        const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .get();

        const userData = userDoc.data();
        const hasSubscription = userData?.subscription?.status === "active";

        // If no subscription, check if they bought the specific pack
        if (!hasSubscription) {
            const boughtDoc = await admin
                .firestore()
                .collection("users")
                .doc(userId)
                .collection("boughtPacks")
                .doc(subject)
                .get();

            if (!boughtDoc.exists) {
                return NextResponse.json(
                    { message: "Subject not purchased. Please subscribe or buy this study pack." },
                    { status: 403 }
                );
            }
        }

        // Fetch all questions for this subject
        const questionsSnapshot = await admin
            .firestore()
            .collection("questions")
            .where("subject", "==", formattedSubject)
            .get();

        if (questionsSnapshot.empty) {
            return NextResponse.json(
                { message: "No questions available for this subject" },
                { status: 404 }
            );
        }

        // Get user's question progress for this subject
        // The progress document uses the original subject parameter (e.g., "mathematics")
        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("question_progress")
            .doc(subject);

        const progressDoc = await progressDocRef.get();
        const progressData = progressDoc.exists ? progressDoc.data() : {};

        console.log(`Progress data for ${subject}:`, progressData ? Object.keys(progressData).length + " questions" : "No data");

        // Separate questions into three categories
        const incorrectQuestions: any[] = [];
        const unstudiedQuestions: any[] = [];
        const correctQuestions: any[] = [];

        questionsSnapshot.docs.forEach((doc) => {
            const questionId = doc.id;
            const questionData = { id: doc.id, ...doc.data() };
            const progress = progressData?.[questionId];

            if (!progress) {
                // Never attempted
                unstudiedQuestions.push(questionData);
            } else if (progress.correct === false) {
                // Previously answered incorrectly
                incorrectQuestions.push(questionData);
            } else if (progress.correct === true) {
                // Previously answered correctly
                correctQuestions.push(questionData);
            } else {
                // If progress exists but correct is undefined/null, treat as unstudied
                unstudiedQuestions.push(questionData);
            }
        });

        console.log(`Question categorization - Incorrect: ${incorrectQuestions.length}, Unstudied: ${unstudiedQuestions.length}, Correct: ${correctQuestions.length}`);

        // Shuffle function
        const shuffle = (array: any[]) => {
            const shuffled = [...array];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        // Build the mock test with priority:
        // 1. Previously incorrect questions
        // 2. Unstudied questions
        // 3. Previously correct questions (if needed)
        let mockTestQuestions: any[] = [];

        // Add all incorrect questions first
        mockTestQuestions = [...shuffle(incorrectQuestions)];

        // Fill remaining slots with unstudied questions
        if (mockTestQuestions.length < questionCount) {
            const remaining = questionCount - mockTestQuestions.length;
            mockTestQuestions = [
                ...mockTestQuestions,
                ...shuffle(unstudiedQuestions).slice(0, remaining)
            ];
        }

        // If still not enough, add some correct questions
        if (mockTestQuestions.length < questionCount) {
            const remaining = questionCount - mockTestQuestions.length;
            mockTestQuestions = [
                ...mockTestQuestions,
                ...shuffle(correctQuestions).slice(0, remaining)
            ];
        }

        // Final shuffle to mix question priorities
        mockTestQuestions = shuffle(mockTestQuestions).slice(0, questionCount);

        return NextResponse.json(
            {
                questions: mockTestQuestions,
                total: mockTestQuestions.length,
                metadata: {
                    subject: formattedSubject,
                    incorrectCount: incorrectQuestions.length,
                    unstudiedCount: unstudiedQuestions.length,
                    correctCount: correctQuestions.length,
                }
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching mock test:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

// ------------------------
// POST: Submit mock test results
// ------------------------
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { subject, results, score, correctCount, totalCount, timeTaken } = body;
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken || !subject || !results || typeof score !== "number") {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Store mock test result
        const mockTestResult = {
            subject,
            score,
            correctCount,
            totalCount,
            timeTaken: timeTaken || null,
            date: admin.firestore.FieldValue.serverTimestamp(),
            results: results, // Array of {questionId, correct, userAnswer}
        };

        await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("mock_tests")
            .add(mockTestResult);

        // Update question progress for each question
        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("question_progress")
            .doc(subject);

        const progressUpdates: any = {};
        results.forEach((result: any) => {
            progressUpdates[result.questionId] = {
                correct: result.correct,
                userAnswer: result.userAnswer || null,
                answeredAt: admin.firestore.FieldValue.serverTimestamp(),
            };
        });

        await progressDocRef.set(progressUpdates, { merge: true });

        return NextResponse.json(
            {
                message: "Mock test results saved successfully",
                score,
                correctCount,
                totalCount
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error saving mock test results:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}