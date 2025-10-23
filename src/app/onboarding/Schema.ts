export interface SubjectSelection {
    examBoard: string;
    subjects: Subject[];
}

interface Subject {
    name: string;
    tier: string;
}

export interface QuizSuggestionMaterial {
    id: string;
    title: string;
    subject: string;
    content: string;
    difficulty: string;
}

export interface QuizSuggestionRecommendation {
    subject: string;
    materialIds: string[];
    reasoning: string;
    materials: QuizSuggestionMaterial[];
}

export interface QuizSuggestions {
    overallAnalysis: string;
    recommendations: QuizSuggestionRecommendation[];
    studyPlan: string;
}

export interface QuizSubjectAnalysis {
    subject: string;
    accuracy: number;
    correct: number;
    total: number;
    incorrectQuestions: string[];
}

export interface QuizMetadata {
    totalQuestions: number;
    incorrectCount: number;
    subjectAnalysis: QuizSubjectAnalysis[];
}

export interface QuizResultSuggestion {
    suggestions: QuizSuggestions;
    metadata: QuizMetadata;
}
