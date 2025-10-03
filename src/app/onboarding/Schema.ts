export interface SubjectSelection {
    examBoard: string;
    subjects: Subject[];
}

interface Subject {
    name: string;
    tier: string;
}