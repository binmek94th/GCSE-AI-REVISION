'use client'
import { useEffect, useState } from 'react';
import { SubjectSelection } from '@/app/onboarding/Schema';
import { Skeleton } from "@/app/components/ui/skeleton";
import { StudyPlanLoading } from "@/app/onboarding/StudyPlanLoading";

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
    subject?: string;
}

interface Question {
    id: string;
    question: string;
    options: { [key: string]: string };
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
                setError(err.message || 'An unexpected error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [selectedSubjects, setNextDisabled]);

    const handleAnswerSelect = (questionId: string, optionKey: string) => {
        setAnswers(prev => ({ ...prev, [questionId]: optionKey }));
    };

    const handleSubmit = async () => {
        const payload: QuizAnswer[] = questions.map(q => ({
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ answers: payload, selectedSubjects }),
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
            setError(err.message || 'Failed to submit quiz');
        } finally {
            setSubmitLoading(false);
        }
    };

    if (loading) return <Skeleton />;
    if (error) return <p style={{ color: '#DC2626', fontSize: 14 }}>{error}</p>;
    if (questions.length === 0) return <p style={{ color: '#475569', fontSize: 14 }}>No questions available.</p>;
    if (submitLoading) return <StudyPlanLoading />;

    if (submitted) {
        return (
            <div style={{
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderRadius: 8,
                padding: '24px',
                textAlign: 'center'
            }}>
                <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: '#0EA5E9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px'
                }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0C4A6E', marginBottom: 4 }}>
                    Quiz completed!
                </h3>
                <p style={{ fontSize: 14, color: '#0369A1' }}>
                    Click Continue to see your study plan.
                </p>
            </div>
        );
    }

    const answeredCount = Object.keys(answers).length;

    return (
        <div>
            {questions.map((q, idx) => {
                const optionEntries = Object.entries(q.options || {}).sort((a, b) => a[0].localeCompare(b[0]));

                return (
                    <div key={q.id || idx} style={{
                        marginBottom: 16,
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '16px 18px',
                        backgroundColor: '#FFFFFF'
                    }}>
                        {/* Question header */}
                        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                            <div style={{
                                flexShrink: 0,
                                width: 26,
                                height: 26,
                                borderRadius: '50%',
                                backgroundColor: '#F0F9FF',
                                border: '1px solid #BAE6FD',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#0EA5E9' }}>{idx + 1}</span>
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', lineHeight: 1.5 }}>
                                    {q.question}
                                </p>
                                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                                    {q.subject}
                                </p>
                            </div>
                        </div>

                        {/* Options */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 38 }}>
                            {optionEntries.map(([key, value]) => {
                                const isSelected = answers[q.id] === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleAnswerSelect(q.id, key)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 10,
                                            padding: '10px 14px',
                                            borderRadius: 6,
                                            border: isSelected ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                            backgroundColor: isSelected ? '#F0F9FF' : '#F8FAFC',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <span style={{
                                            flexShrink: 0,
                                            width: 24,
                                            height: 24,
                                            borderRadius: '50%',
                                            border: isSelected ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                            backgroundColor: isSelected ? '#0EA5E9' : '#FFFFFF',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            color: isSelected ? '#FFFFFF' : '#475569'
                                        }}>
                                            {key}
                                        </span>
                                        <span style={{ fontSize: 14, color: '#0F172A' }}>{value}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                    onClick={handleSubmit}
                    disabled={answeredCount !== questions.length}
                    style={{
                        padding: '10px 24px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: answeredCount === questions.length ? '#0EA5E9' : '#E2E8F0',
                        color: answeredCount === questions.length ? '#FFFFFF' : '#94A3B8',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: answeredCount === questions.length ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                    }}
                >
                    Submit quiz ({answeredCount}/{questions.length} answered)
                </button>
            </div>
        </div>
    );
};

export default Quiz;