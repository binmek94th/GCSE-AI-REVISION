'use client'
import { useEffect, useState } from 'react';
import { SubjectSelection } from '@/app/onboarding/Schema';
import { Skeleton } from "@/app/components/ui/skeleton";
import { StudyPlanLoading } from "@/app/onboarding/StudyPlanLoading";

interface Props {
    selectedSubjects: SubjectSelection;
    level: string;
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
    level?: string;
    imageUrl?: string | null;
    imageDescription?: string;
}

const Quiz: React.FC<Props> = ({ selectedSubjects, level, setNextDisabled, setPlan }) => {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [activeSubject, setActiveSubject] = useState<string>('');

    useEffect(() => {
        const fetchQuestions = async () => {
            setLoading(true);
            setNextDisabled(true);
            setError(null);
            try {
                const response = await fetch('/api/questions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selections: selectedSubjects, level }),
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData?.message || 'Failed to fetch questions');
                }
                const data = await response.json();
                const qs: Question[] = data.questions || [];
                setQuestions(qs);
                if (qs.length > 0) setActiveSubject(qs[0].subject);
            } catch (err: any) {
                setError(err.message || 'An unexpected error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [selectedSubjects, level, setNextDisabled]);

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
                body: JSON.stringify({ answers: payload, selectedSubjects, level }),
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
            <div style={{ backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 8, padding: 24, textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', backgroundColor: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                    </svg>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0C4A6E', marginBottom: 4 }}>Quiz completed!</h3>
                <p style={{ fontSize: 14, color: '#0369A1' }}>Click Continue to see your study plan.</p>
            </div>
        );
    }

    const answeredCount = Object.keys(answers).length;

    // Group by subject preserving order
    const subjectOrder: string[] = [];
    const grouped = questions.reduce<Record<string, Question[]>>((acc, q) => {
        if (!acc[q.subject]) { acc[q.subject] = []; subjectOrder.push(q.subject); }
        acc[q.subject].push(q);
        return acc;
    }, {});

    const activeQuestions = grouped[activeSubject] || [];
    const activeIdx = subjectOrder.indexOf(activeSubject);

    // Global question number offset for the active tab
    const questionOffset = subjectOrder
        .slice(0, activeIdx)
        .reduce((sum, s) => sum + grouped[s].length, 0);

    const isLastSubject = activeIdx === subjectOrder.length - 1;

    return (
        <div>
            {/* ── Subject tabs ── */}
            <div style={{
                display: 'flex',
                borderBottom: '1.5px solid #E2E8F0',
                marginBottom: 20,
                overflowX: 'auto',
                gap: 0,
            }}>
                {subjectOrder.map((subject) => {
                    const subjectQs = grouped[subject];
                    const answered = subjectQs.filter(q => answers[q.id]).length;
                    const complete = answered === subjectQs.length;
                    const isActive = subject === activeSubject;

                    return (
                        <button
                            key={subject}
                            onClick={() => setActiveSubject(subject)}
                            style={{
                                padding: '10px 16px',
                                border: 'none',
                                borderBottom: isActive ? '2px solid #0EA5E9' : '2px solid transparent',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? '#0EA5E9' : '#475569',
                                whiteSpace: 'nowrap',
                                transition: 'all 0.15s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                marginBottom: -1,
                            }}
                        >
                            {subject}

                            {complete ? (
                                // Green-ish check when all answered
                                <span style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: 16, height: 16, borderRadius: '50%',
                                    backgroundColor: '#0EA5E9', flexShrink: 0,
                                }}>
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </span>
                            ) : answered > 0 ? (
                                // Grey pill showing partial progress
                                <span style={{
                                    fontSize: 11, fontWeight: 600, color: '#FFFFFF',
                                    backgroundColor: '#94A3B8', borderRadius: 99,
                                    padding: '1px 6px', flexShrink: 0,
                                }}>
                                    {answered}/{subjectQs.length}
                                </span>
                            ) : null}
                        </button>
                    );
                })}
            </div>

            {/* ── Questions for active subject ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activeQuestions.map((q, idx) => {
                    const questionNumber = questionOffset + idx + 1;
                    const optionEntries = Object.entries(q.options || {}).sort((a, b) => a[0].localeCompare(b[0]));

                    return (
                        <div key={q.id} style={{ border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px 18px', backgroundColor: '#FFFFFF' }}>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                                <div style={{
                                    flexShrink: 0, width: 26, height: 26, borderRadius: '50%',
                                    backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0EA5E9' }}>{questionNumber}</span>
                                </div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: '#0F172A', lineHeight: 1.5, margin: 0 }}>
                                    {q.question}
                                </p>
                            </div>

                            {/* Figure / diagram for the question (only when an image exists) */}
                            {q.imageUrl && (
                                <div style={{ paddingLeft: 38, marginBottom: 14 }}>
                                    <img
                                        src={q.imageUrl}
                                        alt={q.imageDescription || 'Question figure'}
                                        loading="lazy"
                                        style={{
                                            display: 'block',
                                            maxWidth: '100%',
                                            height: 'auto',
                                            borderRadius: 8,
                                            border: '1px solid #E2E8F0',
                                            backgroundColor: '#FFFFFF',
                                        }}
                                    />
                                    {q.imageDescription && (
                                        <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, fontStyle: 'italic' }}>
                                            {q.imageDescription}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 38 }}>
                                {optionEntries.map(([key, value]) => {
                                    const isSelected = answers[q.id] === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleAnswerSelect(q.id, key)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 10,
                                                padding: '10px 14px', borderRadius: 6,
                                                border: isSelected ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                                backgroundColor: isSelected ? '#F0F9FF' : '#F8FAFC',
                                                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                                            }}
                                        >
                                            <span style={{
                                                flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
                                                border: isSelected ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                                backgroundColor: isSelected ? '#0EA5E9' : '#FFFFFF',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, fontWeight: 600,
                                                color: isSelected ? '#FFFFFF' : '#475569',
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
            </div>

            {/* ── Footer: total progress + prev/next/submit ── */}
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontSize: 13, color: '#94A3B8' }}>
                    {answeredCount} / {questions.length} answered
                </span>

                <div style={{ display: 'flex', gap: 8 }}>
                    {activeIdx > 0 && (
                        <button
                            onClick={() => setActiveSubject(subjectOrder[activeIdx - 1])}
                            style={{
                                padding: '9px 16px', borderRadius: 8,
                                border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF',
                                color: '#0F172A', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            ← Prev
                        </button>
                    )}

                    {!isLastSubject ? (
                        <button
                            onClick={() => setActiveSubject(subjectOrder[activeIdx + 1])}
                            style={{
                                padding: '9px 16px', borderRadius: 8,
                                border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF',
                                color: '#0F172A', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                            }}
                        >
                            Next →
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={answeredCount !== questions.length}
                            style={{
                                padding: '9px 22px', borderRadius: 8, border: 'none',
                                backgroundColor: answeredCount === questions.length ? '#0EA5E9' : '#E2E8F0',
                                color: answeredCount === questions.length ? '#FFFFFF' : '#94A3B8',
                                fontSize: 13, fontWeight: 500,
                                cursor: answeredCount === questions.length ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s',
                            }}
                        >
                            Submit quiz
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Quiz;