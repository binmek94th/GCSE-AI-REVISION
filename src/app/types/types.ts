
export interface Question {
    id: string;
    question: string;
    options: string[];
    answer: string;
    subject: string;
    flag?: string;
}
