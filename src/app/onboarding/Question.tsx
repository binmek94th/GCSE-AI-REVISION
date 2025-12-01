'use client'
import { useEffect, useState } from 'react';
import { SubjectSelection } from '@/app/onboarding/Schema';
import { Skeleton } from "@/app/components/ui/skeleton";
import {StudyPlanLoading} from "@/app/onboarding/StudyPlanLoading";

interface Props {
    selectedSubjects: SubjectSelection;
    setNextDisabled: (disabled: boolean) => void;
    setPlan: (data: any) => void;
}

interface QuizAnswer {
    questionId: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    subject?: string; // Add subject field
}

interface Question {
    id: string;
    question: string;
    options: {
        [key: string]: string; // e.g., { "A": "HEH", "B": "EEE", "C": "DEH" }
    };
    answer?: string;
    subject: string;
    exam_board: string;
    tier: string;
}

const Quiz: React.FC<Props> = ({ selectedSubjects, setNextDisabled, setPlan }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false)
    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            setNextDisabled(true);
            setError(null);

            try {
                const response = await fetch('/api/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selections: selectedSubjects }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData?.message || 'Failed to fetch questions');
                }

                const data = await response.json();
                setQuestions(data.questions || []);
            } catch (err: any) {
                console.error('Error fetching questions:', err);
                setError(err.message || 'An unexpected error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [selectedSubjects, setNextDisabled]);

    const handleAnswerSelect = (questionId: string, optionKey: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: optionKey,
        }));
    };

    const handleSubmit = async () => {
        // // Get auth token
        // const user = auth.currentUser;
        // if (!user) {
        //     setError('You must be logged in to submit the quiz');
        //     return;
        // }
        //
        // const idToken = await user.getIdToken();

        const payload: QuizAnswer[] = questions.map((q) => ({
            questionId: q.id,
            question: q.question,
            selectedAnswer: answers[q.id] || '',
            correctAnswer: q.answer || '',
            subject: q.subject || 'General',
        }));

        setSubmitLoading(true);

        try {
            const response = await fetch('/api/questions/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    answers: payload,
                    selectedSubjects: selectedSubjects
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData?.message || 'Failed to submit quiz');
            }

            const data = await response.json();
            setPlan(data);
            setSubmitted(true);
            setNextDisabled(false);
        } catch (err: any) {
            console.error('Error submitting quiz:', err);
            setError(err.message || 'Failed to submit quiz');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) return <Skeleton />;
    if (error) return <p className="text-red-600">{error}</p>;
    if (questions.length === 0) return <p>No questions available.</p>;

    // Show loading component while submitting
    if (submitLoading) {
        return <StudyPlanLoading />;
    }

    if (submitted) {
        return (
            <div className="space-y-6">
                <div className="bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-bold text-green-600 mb-4">Quiz Completed! 🎉</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {questions.map((q, idx) => {
                // Convert options object to array of entries [key, value]
                const optionEntries = Object.entries(q.options || {}).sort((a, b) => a[0].localeCompare(b[0]));

                return (
                    <div key={q.id || idx} className="p-6 border rounded-lg bg-white shadow-sm">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-sm font-semibold text-blue-700">{idx + 1}</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900 mb-2">{q.question}</h4>
                            </div>
                        </div>

                        <div className="space-y-3 ml-11">
                            {optionEntries.map(([optionKey, optionValue]) => {
                                const isSelected = answers[q.id] === optionKey;
                                return (
                                    <button
                                        key={optionKey}
                                        onClick={() => handleAnswerSelect(q.id, optionKey)}
                                        className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${
                                            isSelected
                                                ? 'border-blue-600 bg-blue-50 shadow-sm'
                                                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                                                isSelected
                                                    ? 'border-blue-600 bg-blue-600 text-white'
                                                    : 'border-gray-300 text-gray-600'
                                            }`}>
                                                {optionKey}
                                            </span>
                                            <span className="text-gray-700">{optionValue}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            <div className="flex justify-center mt-8">
                <button
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length !== questions.length}
                    className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 ${
                        Object.keys(answers).length === questions.length
                            ? 'bg-green-500 text-white hover:bg-green-600 shadow-md hover:shadow-lg'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                >
                    Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
                </button>
            </div>
        </div>
    );
};

export default Quiz;