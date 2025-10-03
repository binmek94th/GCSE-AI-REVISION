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

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const selection: SubjectSelection = body.selections;

        if (!selection || !selection.examBoard || !Array.isArray(selection.subjects)) {
            return NextResponse.json({ message: "Invalid selection structure" }, { status: 400 });
        }

        const allQuestions: Question[] = [];

        for (const subj of selection.subjects) {
            let query: FirebaseFirestore.Query<Question, FirebaseFirestore.DocumentData> =
                admin.firestore().collection("questions").withConverter(questionConverter);

            query = query
                .where("subject", "==", subj.name)
                .where("exam_board", "==", selection.examBoard)
                .where("tier", "==", subj.tier);

            const snapshot = await query.get();
            const questions = snapshot.docs.map((doc) => doc.data());
            allQuestions.push(...questions);
        }

        return NextResponse.json({ questions: allQuestions });
    } catch (err) {
        console.error("Error fetching questions:", err);
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
}
