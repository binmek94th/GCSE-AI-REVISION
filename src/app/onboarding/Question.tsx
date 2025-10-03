'use client'
import { useEffect, useState } from 'react';
import { SubjectSelection } from '@/app/onboarding/Schema';
import { Skeleton } from "@/app/components/skeleton";

interface Props {
    selectedSubjects: SubjectSelection;
    setNextDisabled: (disabled: boolean) => void;
}

interface QuizAnswer {
    questionId: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
}

const Quiz: React.FC<Props> = ({ selectedSubjects, setNextDisabled }) => {
    const [questions, setQuestions] = useState<any[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);


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
        fetchQuestions()
        // if (selectedSubjects.length > 0) fetchQuestions();
    }, [selectedSubjects, setNextDisabled]);

    const handleAnswerSelect = (questionId: string, answer: string) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: answer,
        }));
    };

    const handleSubmit = async () => {
        const payload: QuizAnswer[] = questions.map((q) => ({
            questionId: q.id,
            question: q.question,
            selectedAnswer: answers[q.id] || '',
            correctAnswer: q.answer,
        }));

        try {
            const response = await fetch('/api/questions/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: payload }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData?.message || 'Failed to submit quiz');
            }

            setSubmitted(true);
            setNextDisabled(false);
        } catch (err: any) {
            console.error('Error submitting quiz:', err);
            setError(err.message || 'Failed to submit quiz');
        }
    };

    if (loading) return <Skeleton />;
    if (error) return <p className="text-red-600">{error}</p>;
    if (questions.length === 0) return <p>No questions available.</p>;
    if (submitted) return <p className="text-green-600 font-semibold">Quiz submitted successfully!</p>;

    return (
        <div className="space-y-6">
            {questions.map((q, idx) => (
                <div key={q.id || idx} className="p-6 border rounded-lg bg-white">
                    <div className="flex items-start gap-3 mb-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-blue-700">{idx + 1}</span>
                        </div>
                        <h4 className="font-medium text-gray-900 flex-1">{q.question}</h4>
                    </div>

                    <div className="space-y-3 ml-11">
                        {q.options.map((option: string, optIdx: number) => {
                            const isSelected = answers[q.id] === option;
                            return (
                                <button
                                    key={optIdx}
                                    onClick={() => handleAnswerSelect(q.id, option)}
                                    className={`w-full text-left p-4 rounded-lg border-2 ${
                                        isSelected
                                            ? 'border-blue-600 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                                    }`}
                                >
                                    {option}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <button
                onClick={handleSubmit}
                className="mt-4 px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600"
            >
                Submit Quiz
            </button>
        </div>
    );
};

export default Quiz;
