import {NextResponse} from "next/server";
import admin from "firebase-admin";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const packId = searchParams.get("paperId");
        const questionCount = parseInt(searchParams.get("questionCount") || "20", 10);
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken || !packId) {
            return NextResponse.json({ message: "Missing ID token or paperId" }, { status: 400 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // ── Step 1: Resolve subject name from study_packs ──────────────────────
        const studyPackDoc = await admin.firestore().collection("study_packs").doc(packId).get();
        if (!studyPackDoc.exists) {
            return NextResponse.json(
                { message: `No study pack found for id: ${packId}` },
                { status: 404 }
            );
        }
        const subjectName: string = studyPackDoc.data()?.subject ?? packId;
        console.log(`Resolved pack "${packId}" → subject "${subjectName}"`);

        // ── Step 2: Fetch questions directly from questions collection ─────────
        const questionsSnapshot = await admin
            .firestore()
            .collection("questions")
            .where("subject", "==", subjectName)
            .where("moderation_status", "==", "approved")
            .where("flag", "!=", "irrelevant")
            .get();

        if (questionsSnapshot.empty) {
            return NextResponse.json(
                { message: `No questions found for subject: ${subjectName}` },
                { status: 404 }
            );
        }

        console.log(`Found ${questionsSnapshot.size} questions for subject "${subjectName}"`);

        const allQuestionDocs = questionsSnapshot.docs;

        // ── Step 3: User's question progress — keyed by packId ────────────────
        const progressDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("question_progress")
            .doc(packId)
            .get();

        const progressData = progressDoc.exists ? progressDoc.data() : {};
        console.log(`Progress for "${packId}": ${Object.keys(progressData ?? {}).length} answered`);

        // ── Step 4: Categorise questions ──────────────────────────────────────
        const incorrectQuestions: any[] = [];
        const unstudiedQuestions: any[] = [];
        const correctQuestions: any[] = [];

        allQuestionDocs.forEach((doc) => {
            const questionData = { id: doc.id, ...doc.data() };
            const progress = progressData?.[doc.id];

            if (!progress) {
                unstudiedQuestions.push(questionData);
            } else if (progress.correct === false) {
                incorrectQuestions.push(questionData);
            } else if (progress.correct === true) {
                correctQuestions.push(questionData);
            } else {
                unstudiedQuestions.push(questionData);
            }
        });

        console.log(`Incorrect: ${incorrectQuestions.length} | Unstudied: ${unstudiedQuestions.length} | Correct: ${correctQuestions.length}`);

        // ── Shuffle helper ─────────────────────────────────────────────────────
        const shuffle = <T>(arr: T[]): T[] => {
            const a = [...arr];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        };

        // ── Step 5: Build test: incorrect → unstudied → correct ───────────────
        let mockTestQuestions: any[] = shuffle(incorrectQuestions);

        if (mockTestQuestions.length < questionCount) {
            mockTestQuestions = [
                ...mockTestQuestions,
                ...shuffle(unstudiedQuestions).slice(0, questionCount - mockTestQuestions.length),
            ];
        }

        if (mockTestQuestions.length < questionCount) {
            mockTestQuestions = [
                ...mockTestQuestions,
                ...shuffle(correctQuestions).slice(0, questionCount - mockTestQuestions.length),
            ];
        }

        mockTestQuestions = shuffle(mockTestQuestions).slice(0, questionCount);

        return NextResponse.json({
            questions: mockTestQuestions,
            total: mockTestQuestions.length,
            metadata: {
                packId,
                subject: subjectName,
                totalAvailable: allQuestionDocs.length,
                incorrectCount: incorrectQuestions.length,
                unstudiedCount: unstudiedQuestions.length,
                correctCount: correctQuestions.length,
            },
        }, { status: 200 });

    } catch (error) {
        console.error("Error fetching mock test:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}