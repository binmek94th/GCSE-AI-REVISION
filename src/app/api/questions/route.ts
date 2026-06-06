import { Question } from "@/app/types/types";
import { SubjectSelection } from "@/app/onboarding/Schema";
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

const questionConverter = {
    toFirestore: (data: Question) => data,
    fromFirestore: (snapshot: admin.firestore.QueryDocumentSnapshot) => {
        const data = snapshot.data();
        return {
            id: snapshot.id,
            question: data.question,
            options: data.options,
            answer: data.answer,
            subject: data.subject,
            exam_board: data.exam_board,
            tier: data.tier,
        } as Question;
    },
};

function shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const selection: SubjectSelection = body.selections;

        if (!selection || !selection.examBoard || !Array.isArray(selection.subjects)) {
            return NextResponse.json({ message: "Invalid selection structure" }, { status: 400 });
        }

        const allQuestions: Question[] = [];
        const QUESTIONS_PER_SUBJECT = 15;

        for (const subj of selection.subjects) {
            let query: FirebaseFirestore.Query<Question, FirebaseFirestore.DocumentData> =
                admin.firestore().collection("questions").withConverter(questionConverter);

            query = query
                .where("subject", "==", subj.name)
                .where("exam_board", "==", selection.examBoard)
                .where("tier", "==", subj.tier)
                .where("moderation_status" , "==", "approved")
                .where("flag", "!=", "irrelevant")

            const snapshot = await query.get();
            const questions = snapshot.docs.map((doc) => doc.data());

            const shuffledQuestions = shuffleArray(questions);

            const selectedQuestions = shuffledQuestions.slice(0, QUESTIONS_PER_SUBJECT);

            allQuestions.push(...selectedQuestions);
        }

        const finalQuestions = shuffleArray(allQuestions);

        return NextResponse.json({
            questions: finalQuestions,
            totalQuestions: finalQuestions.length,
            questionsPerSubject: QUESTIONS_PER_SUBJECT
        });
    } catch (err) {
        console.error("Error fetching questions:", err);
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
}