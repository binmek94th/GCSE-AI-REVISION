import SubjectExamDisplay from '@/app/components/SubjectExamDisplay';
import {adminDb} from "@/lib/firebaseAdmin"; // adjust path to wherever you place the client component

// Data barely changes — revalidate hourly instead of hitting Firestore on every request.
// Bump this up (or drop it entirely for a fully static build) if it changes even less often.
export const revalidate = 3600;

type ExamItem = {
    exam_board: string;
    subject: string;
    level: string;
    tier?: string;
    price?: number;
    note?: string;
};

async function getStudyPacks(): Promise<ExamItem[]> {
    const snap = await adminDb.collection('study_packs').get();

    return snap.docs
        .map(doc => {
            const data = doc.data();
            return {
                exam_board: (data.exam_board as string) ?? '',
                subject: (data.subject as string) ?? '',
                // Fail-open: default to GCSE if level is missing on a pack doc
                level: (data.level as string) ?? 'GCSE',
                tier: data.tier as string | undefined,
                price: typeof data.price === 'number' ? data.price : undefined,
                note: data.note as string | undefined,
            };
        })
        .filter(p => p.exam_board && p.subject); // drop malformed docs
}

export default async function SubjectsPage() {
    const packs = await getStudyPacks();

    return <SubjectExamDisplay initialPacks={packs} />;
}