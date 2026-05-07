'use client';

import { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle, XCircle, ChevronRight, Trophy, Zap } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Choice { option: string; text: string; }

interface AssessmentQuestion {
    id: string;
    question: string;
    options: Record<string, string> | string[];
    correctAnswer: string;
    explanation?: string;
    subject: string;
    materialId: string;
    materialTitle: string;
    difficulty: number | string;
    /** The pack/subject ID used as the question_progress document key */
    packId?: string;
}

interface MaterialQuizModalProps {
    open: boolean;
    materialId: string;
    materialTitle: string;
    /** The pack ID to key question_progress under — falls back to question.packId */
    packId: string;
    questions: AssessmentQuestion[];
    onConfirmDone: (score: number, total: number) => void;
    onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normaliseOptions(options: Record<string, string> | string[]): Choice[] {
    if (Array.isArray(options)) {
        return options.map((text, i) => ({ option: String.fromCharCode(65 + i), text }));
    }
    return Object.entries(options)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([option, text]) => ({ option, text }));
}

function getDifficultyLabel(d: number | string): { label: string; color: string } {
    const n = typeof d === 'string' ? parseInt(d) : d;
    if (n <= 1) return { label: 'Easy',   color: '#22C55E' };
    if (n <= 2) return { label: 'Medium', color: '#F59E0B' };
    return              { label: 'Hard',  color: '#EF4444' };
}

/**
 * Persists a single quiz answer to:
 *   users/{uid}/question_progress/{packId}  (doc)
 *     → field: {questionId}: { correct, userAnswer, answeredAt }
 *
 * This is the same schema read by the mistake bank and quiz-results API.
 */
async function saveAnswer(
    packId: string,
    questionId: string,
    userAnswer: string,
    correct: boolean,
): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const ref = doc(db, 'users', user.uid, 'question_progress', packId);

    await setDoc(
        ref,
        {
            [questionId]: {
                correct,
                userAnswer,
                answeredAt: serverTimestamp(),
            },
        },
        { merge: true }  // preserve other questions in the same doc
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaterialQuizModal({
                                      open,
                                      materialId,
                                      materialTitle,
                                      packId,
                                      questions,
                                      onConfirmDone,
                                      onCancel,
                                  }: MaterialQuizModalProps) {

    const materialQuestions = questions.filter(q => q.materialId === materialId);

    const [step, setStep]                   = useState<'intro' | 'quiz' | 'result'>('intro');
    const [currentIndex, setCurrentIndex]   = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [hasConfirmed, setHasConfirmed]   = useState(false);
    const [scores, setScores]               = useState<boolean[]>([]);
    const [showExplanation, setShowExplanation] = useState(false);
    const [saving, setSaving]               = useState(false);
    const progressBarRef                    = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            setStep(materialQuestions.length > 0 ? 'intro' : 'intro');
            setCurrentIndex(0);
            setSelectedOption(null);
            setHasConfirmed(false);
            setScores([]);
            setShowExplanation(false);
        }
    }, [open, materialId]);

    // No questions — simple confirm dialog
    if (materialQuestions.length === 0) {
        return (
            <Dialog.Root open={open} onOpenChange={v => { if (!v) onCancel(); }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 focus:outline-none">
                        <div className="text-center space-y-4">
                            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-7 h-7 text-green-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Mark as done?</h2>
                            <p className="text-sm text-gray-500">No quiz questions are linked to this material yet.</p>
                            <div className="flex gap-3 pt-2">
                                <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => onConfirmDone(0, 0)}>
                                    Confirm Done
                                </Button>
                            </div>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        );
    }

    const current     = materialQuestions[currentIndex];
    const choices     = current ? normaliseOptions(current.options) : [];
    const isCorrect   = hasConfirmed && selectedOption === current?.correctAnswer;
    const correctCount = scores.filter(Boolean).length;
    const pct         = Math.round((correctCount / materialQuestions.length) * 100);
    const progressPct = ((currentIndex + (hasConfirmed ? 1 : 0)) / materialQuestions.length) * 100;

    // Called when the student clicks "Check Answer"
    const handleCheck = async () => {
        if (!selectedOption || !current) return;

        const correct = selectedOption === current.correctAnswer;

        setHasConfirmed(true);
        setShowExplanation(true);
        setScores(prev => [...prev, correct]);

        // ── Persist to Firestore ──────────────────────────────────────────────
        setSaving(true);
        try {
            const effectivePackId = packId || current.packId || 'unknown';
            await saveAnswer(effectivePackId, current.id, selectedOption, correct);
        } catch (err) {
            // Non-fatal — don't block the UI
            console.error('Failed to save quiz answer:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleNext = () => {
        if (currentIndex + 1 < materialQuestions.length) {
            setCurrentIndex(i => i + 1);
            setSelectedOption(null);
            setHasConfirmed(false);
            setShowExplanation(false);
        } else {
            setStep('result');
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={v => { if (!v) onCancel(); }}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-200" />
                <Dialog.Content
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-white rounded-2xl shadow-2xl focus:outline-none overflow-hidden"
                    style={{ maxHeight: '90vh' }}
                >

                    {/* ── Intro ─────────────────────────────────────────────── */}
                    {step === 'intro' && (
                        <div className="p-7">
                            <div style={{
                                background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                                borderRadius: 14, padding: '20px', marginBottom: 20, textAlign: 'center',
                            }}>
                                <div style={{ fontSize: 36, marginBottom: 8 }}>🧠</div>
                                <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 6px' }}>
                                    Quick Knowledge Check
                                </h2>
                                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                                    Before marking done, answer {materialQuestions.length} question{materialQuestions.length > 1 ? 's' : ''} on<br />
                                    <strong style={{ color: '#fff' }}>{materialTitle}</strong>
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                                {[
                                    { icon: '⚡', label: `${materialQuestions.length} questions` },
                                    { icon: '🎯', label: 'Instant feedback' },
                                    { icon: '📈', label: 'Track progress' },
                                ].map(item => (
                                    <div key={item.label} style={{
                                        flex: 1, background: '#F8FAFC', borderRadius: 10,
                                        padding: '10px 8px', textAlign: 'center',
                                        border: '1px solid #E2E8F0',
                                    }}>
                                        <div style={{ fontSize: 18, marginBottom: 3 }}>{item.icon}</div>
                                        <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500 }}>{item.label}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={() => onConfirmDone(0, 0)}
                                    style={{
                                        flex: 1, padding: '11px', fontSize: 13, fontWeight: 500,
                                        borderRadius: 10, border: '1.5px solid #E2E8F0',
                                        background: '#fff', color: '#64748B', cursor: 'pointer',
                                    }}
                                >
                                    Skip quiz
                                </button>
                                <button
                                    onClick={() => setStep('quiz')}
                                    style={{
                                        flex: 2, padding: '11px', fontSize: 13.5, fontWeight: 600,
                                        borderRadius: 10, border: 'none',
                                        background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                                        color: '#fff', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                    }}
                                >
                                    Start Quiz <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Quiz ──────────────────────────────────────────────── */}
                    {step === 'quiz' && current && (
                        <div>
                            {/* Header */}
                            <div style={{ padding: '16px 20px 0', borderBottom: '1px solid #F1F5F9' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#64748B' }}>
                                        Question {currentIndex + 1} of {materialQuestions.length}
                                    </span>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 5,
                                        fontSize: 11, fontWeight: 600,
                                        color: getDifficultyLabel(current.difficulty).color,
                                        background: `${getDifficultyLabel(current.difficulty).color}18`,
                                        padding: '2px 8px', borderRadius: 20,
                                    }}>
                                        <Zap className="w-3 h-3" />
                                        {getDifficultyLabel(current.difficulty).label}
                                    </div>
                                </div>
                                <div style={{ height: 4, background: '#F1F5F9', borderRadius: 4, marginBottom: 14 }}>
                                    <div
                                        ref={progressBarRef}
                                        style={{
                                            height: '100%', borderRadius: 4,
                                            background: 'linear-gradient(90deg, #1D4ED8, #3B82F6)',
                                            width: `${progressPct}%`, transition: 'width 0.4s ease',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Body */}
                            <div style={{ padding: '18px 20px', overflowY: 'auto', maxHeight: 'calc(90vh - 160px)' }}>
                                <p style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', lineHeight: 1.6, marginBottom: 16 }}>
                                    {current.question}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                                    {choices.map(c => {
                                        const isSelected  = selectedOption === c.option;
                                        const showCorrect = hasConfirmed && c.option === current.correctAnswer;
                                        const showWrong   = hasConfirmed && isSelected && c.option !== current.correctAnswer;

                                        let bg = '#F8FAFC', border = '#E2E8F0', textCol = '#374151';
                                        if (showCorrect)     { bg = '#F0FDF4'; border = '#86EFAC'; textCol = '#166534'; }
                                        else if (showWrong)  { bg = '#FEF2F2'; border = '#FCA5A5'; textCol = '#991B1B'; }
                                        else if (isSelected) { bg = '#EFF6FF'; border = '#93C5FD'; textCol = '#1E40AF'; }

                                        return (
                                            <button
                                                key={c.option}
                                                disabled={hasConfirmed}
                                                onClick={() => setSelectedOption(c.option)}
                                                style={{
                                                    display: 'flex', alignItems: 'flex-start', gap: 12,
                                                    padding: '11px 14px', borderRadius: 10,
                                                    border: `1.5px solid ${border}`,
                                                    background: bg,
                                                    cursor: hasConfirmed ? 'default' : 'pointer',
                                                    textAlign: 'left', width: '100%',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <span style={{
                                                    minWidth: 24, height: 24, borderRadius: 6,
                                                    background: showCorrect ? '#16A34A' : showWrong ? '#DC2626' : isSelected ? '#3B82F6' : '#E2E8F0',
                                                    color: (showCorrect || showWrong || isSelected) ? '#fff' : '#64748B',
                                                    fontSize: 11, fontWeight: 700,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                }}>
                                                    {showCorrect ? '✓' : showWrong ? '✗' : c.option}
                                                </span>
                                                <span style={{ fontSize: 13.5, color: textCol, lineHeight: 1.5, paddingTop: 2 }}>
                                                    {c.text}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                {showExplanation && current.explanation && (
                                    <div style={{
                                        padding: '11px 14px', borderRadius: 10, marginBottom: 14,
                                        background: isCorrect ? '#F0FDF4' : '#FEF9EC',
                                        border: `1px solid ${isCorrect ? '#BBF7D0' : '#FDE68A'}`,
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                            {isCorrect
                                                ? <CheckCircle className="w-4 h-4 text-green-600" />
                                                : <XCircle className="w-4 h-4 text-amber-600" />
                                            }
                                            <span style={{
                                                fontSize: 12, fontWeight: 700,
                                                color: isCorrect ? '#166534' : '#92400E',
                                            }}>
                                                {isCorrect ? 'Correct!' : `Correct answer: ${current.correctAnswer}`}
                                            </span>
                                        </div>
                                        <p style={{ fontSize: 12.5, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                                            {current.explanation}
                                        </p>
                                    </div>
                                )}

                                {/* Action buttons */}
                                {!hasConfirmed ? (
                                    <button
                                        disabled={!selectedOption || saving}
                                        onClick={handleCheck}
                                        style={{
                                            width: '100%', padding: '12px', fontSize: 13.5, fontWeight: 600,
                                            borderRadius: 10, border: 'none',
                                            background: selectedOption
                                                ? 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)'
                                                : '#E2E8F0',
                                            color: selectedOption ? '#fff' : '#94A3B8',
                                            cursor: selectedOption ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        {saving ? 'Saving…' : 'Check Answer'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleNext}
                                        style={{
                                            width: '100%', padding: '12px', fontSize: 13.5, fontWeight: 600,
                                            borderRadius: 10, border: 'none',
                                            background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                                            color: '#fff', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        }}
                                    >
                                        {currentIndex + 1 < materialQuestions.length
                                            ? <>Next Question <ChevronRight className="w-4 h-4" /></>
                                            : <>See Results <Trophy className="w-4 h-4" /></>
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Result ────────────────────────────────────────────── */}
                    {step === 'result' && (
                        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
                            <div style={{
                                width: 100, height: 100, borderRadius: '50%', margin: '0 auto 20px',
                                background: `conic-gradient(${pct >= 70 ? '#22C55E' : pct >= 40 ? '#F59E0B' : '#EF4444'} ${pct * 3.6}deg, #F1F5F9 0deg)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <div style={{
                                    width: 76, height: 76, borderRadius: '50%', background: '#fff',
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <span style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>{pct}%</span>
                                    <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>score</span>
                                </div>
                            </div>

                            <h2 style={{ fontSize: 19, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>
                                {pct === 100 ? '🎉 Perfect!' : pct >= 70 ? '👍 Well done!' : '📖 Keep revising!'}
                            </h2>
                            <p style={{ fontSize: 13.5, color: '#64748B', margin: '0 0 20px', lineHeight: 1.6 }}>
                                You got <strong style={{ color: '#0F172A' }}>{correctCount}/{materialQuestions.length}</strong> correct on<br />
                                <strong style={{ color: '#1D4ED8' }}>{materialTitle}</strong>
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 22, textAlign: 'left' }}>
                                {materialQuestions.map((q, i) => (
                                    <div
                                        key={q.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10,
                                            padding: '8px 12px', borderRadius: 8,
                                            background: scores[i] ? '#F0FDF4' : '#FEF2F2',
                                            border: `1px solid ${scores[i] ? '#BBF7D0' : '#FECACA'}`,
                                        }}
                                    >
                                        {scores[i]
                                            ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                            : <XCircle    className="w-4 h-4 text-red-400   flex-shrink-0" />
                                        }
                                        <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.4 }}>
                                            {q.question.length > 70 ? q.question.slice(0, 70) + '…' : q.question}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => onConfirmDone(correctCount, materialQuestions.length)}
                                style={{
                                    width: '100%', padding: '12px', fontSize: 14, fontWeight: 600,
                                    borderRadius: 10, border: 'none',
                                    background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                                    color: '#fff', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                }}
                            >
                                <CheckCircle className="w-4 h-4" />
                                Mark as Done & Continue
                            </button>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}