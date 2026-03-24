'use client'

import { BookOpen, TrendingUp, Target, Lightbulb, CheckCircle2, XCircle, X, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { QuizResultSuggestion, QuizSuggestionRecommendation } from "@/app/onboarding/Schema";
import { MarkdownContent } from "@/app/dashboard/study_materials/Markdown";
import { useRouter } from "next/navigation";

interface Props {
    data: QuizResultSuggestion;
    onMaterialClick?: (materialId: string) => void;
}

export function QuizSuggestionsDisplay({ data, onMaterialClick }: Props) {
    const { suggestions, metadata } = data;
    const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
    const router = useRouter();

    const accuracyColor = (a: number) => a >= 80 ? '#0EA5E9' : a >= 60 ? '#D97706' : '#DC2626';
    const accuracyBg = (a: number) => a >= 80 ? '#F0F9FF' : a >= 60 ? '#FFFBEB' : '#FEF2F2';
    const accuracyBorder = (a: number) => a >= 80 ? '#BAE6FD' : a >= 60 ? '#FDE68A' : '#FECACA';
    const barColor = (a: number) => a >= 80 ? '#0EA5E9' : a >= 60 ? '#F59E0B' : '#EF4444';

    return (
        /* Force light mode */
        <div style={{ colorScheme: 'light', backgroundColor: '#F8FAFC', minHeight: '100vh', padding: '2rem 0' }}>
            {/* Material modal */}
            {selectedMaterial && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 16,
                    backgroundColor: 'rgba(0,0,0,0.3)'
                }}>
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: 12,
                        border: '1px solid #E2E8F0',
                        maxWidth: 720,
                        width: '100%',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}>
                        {/* Modal header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #E2E8F0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        }}>
                            <div>
                                <h2 style={{ fontSize: 17, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                                    {selectedMaterial.title}
                                </h2>
                                <div style={{ display: 'flex', gap: 6 }}>
                                    <span style={{
                                        backgroundColor: '#F0F9FF',
                                        color: '#0C4A6E',
                                        border: '1px solid #BAE6FD',
                                        borderRadius: 99,
                                        padding: '2px 10px',
                                        fontSize: 12,
                                        fontWeight: 500
                                    }}>
                                        {selectedMaterial.subject}
                                    </span>
                                    {selectedMaterial.difficulty && (
                                        <span style={{
                                            backgroundColor: '#EFF6FF',
                                            color: '#1D4ED8',
                                            border: '1px solid #BFDBFE',
                                            borderRadius: 99,
                                            padding: '2px 10px',
                                            fontSize: 12,
                                            fontWeight: 500
                                        }}>
                                            {selectedMaterial.difficulty}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMaterial(null)}
                                style={{
                                    padding: 6,
                                    borderRadius: 6,
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <X style={{ width: 16, height: 16, color: '#475569' }} />
                            </button>
                        </div>

                        {/* Modal body */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', backgroundColor: '#FFFFFF' }}>
                            {selectedMaterial.content
                                ? <MarkdownContent content={selectedMaterial.content} />
                                : <p style={{ color: '#94A3B8', fontSize: 14, textAlign: 'center', paddingTop: 32 }}>No content available.</p>
                            }
                        </div>

                        {/* Modal footer */}
                        <div style={{
                            padding: '14px 24px',
                            borderTop: '1px solid #E2E8F0',
                            backgroundColor: '#F8FAFC',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setSelectedMaterial(null)}
                                style={{
                                    padding: '8px 20px',
                                    borderRadius: 8,
                                    border: 'none',
                                    backgroundColor: '#0EA5E9',
                                    color: '#FFFFFF',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Overall analysis */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '20px 24px'
                }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <div style={{
                            flexShrink: 0,
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            backgroundColor: '#F0F9FF',
                            border: '1px solid #BAE6FD',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Lightbulb style={{ width: 18, height: 18, color: '#0EA5E9' }} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                                Overall analysis
                            </h3>
                            <p style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.65 }}>
                                {suggestions.overallAnalysis}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 12
                }}>
                    {[
                        { label: 'Total questions', value: metadata.totalQuestions, color: '#0F172A' },
                        { label: 'Correct', value: metadata.totalQuestions - metadata.incorrectCount, color: '#22C55E' },
                        { label: 'Incorrect', value: metadata.incorrectCount, color: '#DC2626' },
                        { label: 'Overall score', value: `${Math.round(((metadata.totalQuestions - metadata.incorrectCount) / metadata.totalQuestions) * 100)}%`, color: '#0EA5E9' },
                    ].map(stat => (
                        <div key={stat.label} style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 8,
                            padding: '14px 16px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: 22, fontWeight: 600, color: stat.color, marginBottom: 2 }}>
                                {stat.value}
                            </div>
                            <div style={{ fontSize: 12, color: '#94A3B8' }}>{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Performance by subject */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '20px 24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <TrendingUp style={{ width: 18, height: 18, color: '#0EA5E9' }} />
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
                            Performance by subject
                        </h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {metadata.subjectAnalysis.map((subject, idx) => (
                            <div key={idx} style={{
                                padding: '14px 16px',
                                borderRadius: 8,
                                border: `1px solid ${accuracyBorder(subject.accuracy)}`,
                                backgroundColor: accuracyBg(subject.accuracy)
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>
                                            {subject.subject}
                                        </span>
                                        {subject.accuracy >= 70
                                            ? <CheckCircle2 style={{ width: 14, height: 14, color: '#22C55E' }} />
                                            : <XCircle style={{ width: 14, height: 14, color: '#DC2626' }} />
                                        }
                                    </div>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: accuracyColor(subject.accuracy) }}>
                                        {subject.accuracy}%
                                    </span>
                                </div>

                                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#475569', marginBottom: 8 }}>
                                    <span><strong style={{ color: '#0F172A' }}>{subject.correct}</strong> correct</span>
                                    <span>·</span>
                                    <span><strong style={{ color: '#0F172A' }}>{subject.total - subject.correct}</strong> incorrect</span>
                                    <span>·</span>
                                    <span><strong style={{ color: '#0F172A' }}>{subject.total}</strong> total</span>
                                </div>

                                <div style={{ height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${subject.accuracy}%`,
                                        backgroundColor: barColor(subject.accuracy),
                                        borderRadius: 99,
                                        transition: 'width 0.6s ease'
                                    }} />
                                </div>

                                {subject.incorrectQuestions.length > 0 && (
                                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                                        <p style={{ fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Areas needing attention
                                        </p>
                                        {subject.incorrectQuestions.map((q, qIdx) => (
                                            <p key={qIdx} style={{ fontSize: 12, color: '#475569', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                                · {q}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recommendations */}
                <div style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 12,
                    padding: '20px 24px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <BookOpen style={{ width: 18, height: 18, color: '#0EA5E9' }} />
                        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>
                            Recommended study materials
                        </h3>
                    </div>

                    {suggestions.recommendations.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <CheckCircle2 style={{ width: 40, height: 40, color: '#0EA5E9', margin: '0 auto 8px' }} />
                            <p style={{ fontSize: 14, color: '#475569' }}>Great work — you're doing well across all subjects.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {suggestions.recommendations.map((rec: QuizSuggestionRecommendation, idx) => (
                                <div key={idx} style={{
                                    border: '1px solid #E2E8F0',
                                    borderRadius: 8,
                                    padding: '16px 18px'
                                }}>
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                                        <div style={{
                                            flexShrink: 0,
                                            width: 28,
                                            height: 28,
                                            borderRadius: '50%',
                                            backgroundColor: '#0EA5E9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: 12,
                                            fontWeight: 700,
                                            color: '#FFFFFF'
                                        }}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                                                {rec.subject}
                                            </h4>
                                            <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.55 }}>
                                                {rec.reasoning}
                                            </p>
                                        </div>
                                    </div>

                                    {rec.materials && rec.materials.length > 0 && (
                                        <div style={{ paddingLeft: 40, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {rec.materials.map(material => (
                                                <button
                                                    key={material.id}
                                                    onClick={() => { setSelectedMaterial(material); onMaterialClick?.(material.id); }}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '12px 14px',
                                                        borderRadius: 8,
                                                        border: '1px solid #E2E8F0',
                                                        backgroundColor: '#F8FAFC',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.15s'
                                                    }}
                                                    onMouseEnter={e => {
                                                        (e.currentTarget as HTMLElement).style.borderColor = '#0EA5E9';
                                                        (e.currentTarget as HTMLElement).style.backgroundColor = '#F0F9FF';
                                                    }}
                                                    onMouseLeave={e => {
                                                        (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0';
                                                        (e.currentTarget as HTMLElement).style.backgroundColor = '#F8FAFC';
                                                    }}
                                                >
                                                    <div>
                                                        <p style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', marginBottom: 3 }}>
                                                            {material.title}
                                                        </p>
                                                        <div style={{ display: 'flex', gap: 6 }}>
                                                            <span style={{
                                                                fontSize: 11,
                                                                backgroundColor: '#F8FAFC',
                                                                color: '#475569',
                                                                borderRadius: 4,
                                                                padding: '2px 8px'
                                                            }}>
                                                                {material.subject}
                                                            </span>
                                                            {material.difficulty && (
                                                                <span style={{
                                                                    fontSize: 11,
                                                                    backgroundColor: '#EFF6FF',
                                                                    color: '#3B82F6',
                                                                    borderRadius: 4,
                                                                    padding: '2px 8px'
                                                                }}>
                                                                    {material.difficulty}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <ArrowRight style={{ width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }} />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Study plan */}
                {suggestions.studyPlan && (
                    <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 12,
                        padding: '20px 24px'
                    }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <div style={{
                                flexShrink: 0,
                                width: 36,
                                height: 36,
                                borderRadius: '50%',
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Target style={{ width: 18, height: 18, color: '#D97706' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                                    Your personalised study plan
                                </h3>
                                <p style={{ fontSize: 14, color: '#0F172A', lineHeight: 1.65 }}>
                                    {suggestions.studyPlan}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Continue button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={() => router.push("/dashboard")}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '10px 24px',
                            borderRadius: 8,
                            border: 'none',
                            backgroundColor: '#0EA5E9',
                            color: '#FFFFFF',
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s'
                        }}
                    >
                        Go to dashboard
                        <ArrowRight style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>
        </div>
    );
}