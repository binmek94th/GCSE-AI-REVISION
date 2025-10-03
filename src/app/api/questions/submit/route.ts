import {NextRequest, NextResponse} from "next/server";

interface QuizAnswer {
    questionId: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { answers } = body as { answers: QuizAnswer[] };

        if (!answers || !Array.isArray(answers) || answers.length === 0) {
            return NextResponse.json({ message: 'No answers provided' }, { status: 400 });
        }

        // const quizRef = dbAdmin.collection('quizAttempts').doc();
        // await quizRef.set({
        //     answers,
        //     submittedAt: new Date().toISOString(),
        // });

        return NextResponse.json({ message: 'Quiz submitted successfully'});
    } catch (err) {
        console.error('Error submitting quiz:', err);
        return NextResponse.json({ message: 'Failed to submit quiz' }, { status: 500 });
    }
}