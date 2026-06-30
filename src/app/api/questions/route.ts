import { Question } from "@/app/types/types";
import { SubjectSelection } from "@/app/onboarding/Schema";
import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

type SelectedSubject = SubjectSelection["subjects"][number];

/* ------------------------------------------------------------------ *
 * Converters — one per collection, because the GCSE (`questions`) and  *
 * A-Level (`a-levelExamQuestions`) schemas differ. If a field is named *
 * differently in one collection, fix it in that collection's converter *
 * only — the other path is untouched.                                  *
 * ------------------------------------------------------------------ */

const gcseQuestionConverter = {
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
            tier: data.tier,          // GCSE is tiered
            level: data.level,
            flag: data.flag,
        } as Question;
    },
};

interface ALevelChoice {
    option: string;
    text: string;
    isCorrect: boolean;
}

const aLevelQuestionConverter = {
    toFirestore: (data: Question) => data,
    fromFirestore: (snapshot: admin.firestore.QueryDocumentSnapshot) => {
        const data = snapshot.data();

        // choices: [{ option: "A", text: "...", isCorrect: false }, ...]
        // The Quiz renders an { [letter]: text } map and scores against the
        // correct *letter*, not the long-form `answer` paragraph.
        const choices: ALevelChoice[] = Array.isArray(data.choices) ? data.choices : [];
        const options: { [key: string]: string } = {};
        let correctOption = "";
        for (const c of choices) {
            if (!c || typeof c.option !== "string") continue;
            options[c.option] = c.text;
            if (c.isCorrect) correctOption = c.option;
        }

        return {
            id: snapshot.id,
            question: data.questionText, // field is `questionText`
            options, // built from `choices`
            answer: correctOption, // letter of the correct choice, e.g. "B"
            subject: data.subject,
            exam_board: data.examBoard, // field is `examBoard`
            tier: data.tier, // "AS" / "A2"
            level: data.qualification, // field is `qualification`
            flag: data.flag, // not present on A-Level docs (stays undefined)
            imageUrl: data.imageUrl,
            isMultipleChoice: data.isMultipleChoice,
        } as unknown as Question;
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

function hasImage(q: Question): boolean {
    return Boolean((q as { imageUrl?: string | null }).imageUrl);
}

// A-Level: keep only real multiple-choice questions that actually have options.
function isUsableMultipleChoice(q: Question): boolean {
    const x = q as { isMultipleChoice?: boolean; options?: Record<string, string> };
    const optionCount = Object.keys(x.options ?? {}).length;
    return x.isMultipleChoice === true && optionCount >= 2;
}

/* ------------------------------------------------------------------ *
 * Per-collection fetchers. Each owns its own query + snapshot mapping. *
 * ------------------------------------------------------------------ */

async function fetchGcseQuestions(
    subj: SelectedSubject,
    examBoard: string,
): Promise<Question[]> {
    let query: FirebaseFirestore.Query<Question, FirebaseFirestore.DocumentData> =
        admin.firestore().collection("questions").withConverter(gcseQuestionConverter);

    query = query
        .where("subject", "==", subj.name)
        .where("exam_board", "==", examBoard);

    if (subj.tier) {
        query = query.where("tier", "==", subj.tier);
    }

    const snapshot = await query.get();
    return snapshot.docs
        .map((doc) => doc.data())
        .filter((q) => q.flag !== "irrelevant");
}

async function fetchALevelQuestions(
    subj: SelectedSubject,
    examBoard: string,
): Promise<Question[]> {
    const query: FirebaseFirestore.Query<Question, FirebaseFirestore.DocumentData> =
        admin.firestore()
            .collection("a-levelExamQuestions")
            .withConverter(aLevelQuestionConverter)
            .where("subject", "==", subj.name)
            .where("examBoard", "==", examBoard);
    // .where("moderation_status", "==", "approved");

    const snapshot = await query.get();
    return snapshot.docs
        .map((doc) => doc.data())
        .filter((q) => !hasImage(q))
        .filter((q) => isUsableMultipleChoice(q));
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const selection: SubjectSelection = body.selections;
        const level: string | undefined = body.level;

        if (!selection || !selection.examBoard || !Array.isArray(selection.subjects)) {
            return NextResponse.json({ message: "Invalid selection structure" }, { status: 400 });
        }

        if (!level) {
            return NextResponse.json({ message: "Missing level (GCSE / A-Level)" }, { status: 400 });
        }

        // Pick the path up front — the two collections are queried completely separately.
        const fetchForSubject = level === "A-Level" ? fetchALevelQuestions : fetchGcseQuestions;

        const allQuestions: Question[] = [];
        const QUESTIONS_PER_SUBJECT = 15;

        for (const subj of selection.subjects) {
            const questions = await fetchForSubject(subj, selection.examBoard);
            const selectedQuestions = shuffleArray(questions).slice(0, QUESTIONS_PER_SUBJECT);
            allQuestions.push(...selectedQuestions);
        }

        const finalQuestions = shuffleArray(allQuestions);

        return NextResponse.json({
            questions: finalQuestions,
            totalQuestions: finalQuestions.length,
            questionsPerSubject: QUESTIONS_PER_SUBJECT,
        });
    } catch (err) {
        console.error("Error fetching questions:", err);
        return NextResponse.json({ error: "Failed to fetch questions" }, { status: 500 });
    }
}