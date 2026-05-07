'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Spinner from '@/app/components/ui/Spinner';
import { MarkdownContent } from "@/app/dashboard/study_materials/Markdown";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Choice { option: string; text: string; isCorrect: boolean; }
interface Question { text: string; choices: Choice[]; explanation: string; }
interface MaterialSection { title: string; content: string; }
interface Flashcard { term: string; definition: string; }

type DifficultyLevel = 'gcse_foundation' | 'gcse_higher' | 'a_level';
type GenerationMode = 'both' | 'materials' | 'questions' | 'flashcards';
type ActiveTab = 'notes' | 'questions' | 'flashcards';

interface GeneratedMaterial {
    userId: string;
    subjectName: string;
    topics: string[];
    materials: MaterialSection[];
    questions: Question[];
    flashcards: Flashcard[];
    mode: GenerationMode;
    difficulty: DifficultyLevel;
    createdAt: { toDate: () => Date };
    sourceType: 'file' | 'text';
    sourceFileName: string | null;
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    gcse_foundation: 'GCSE Foundation',
    gcse_higher: 'GCSE Higher',
    a_level: 'A Level',
};

const DIFFICULTY_COLORS: Record<DifficultyLevel, { bg: string; text: string; border: string }> = {
    gcse_foundation: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
    gcse_higher:     { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    a_level:         { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GeneratedMaterialPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [uid, setUid]             = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [material, setMaterial]   = useState<GeneratedMaterial | null>(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ActiveTab>('notes');
    const [quizAnswers, setQuizAnswers]     = useState<Record<number, string>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [flippedCards, setFlippedCards]   = useState<Record<number, boolean>>({});

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUid(u?.uid ?? null);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!authReady) return;
        if (!uid) { setError('You must be signed in to view this material.'); setLoading(false); return; }
        if (!id)  { setError('Material not found.'); setLoading(false); return; }

        let cancelled = false;
        async function fetchMaterial() {
            setLoading(true); setError(null);
            try {
                const snap = await getDoc(doc(db, 'user_generated_materials', id));
                if (cancelled) return;
                if (!snap.exists()) { setError('Material not found.'); return; }
                const data = snap.data() as GeneratedMaterial;
                if (data.userId !== uid) { setError('You do not have permission to view this material.'); return; }
                setMaterial(data);
                if (data.materials.length > 0) setActiveTab('notes');
                else if (data.questions.length > 0) setActiveTab('questions');
                else if (data.flashcards.length > 0) setActiveTab('flashcards');
            } catch (err) {
                if (!cancelled) { console.error(err); setError('Failed to load material. Please try again.'); }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        fetchMaterial();
        return () => { cancelled = true; };
    }, [authReady, uid, id]);

    const selectAnswer = (qIndex: number, option: string) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({ ...prev, [qIndex]: option }));
    };

    const score = quizSubmitted && material
        ? material.questions.filter((q, i) => quizAnswers[i] === q.choices.find(c => c.isCorrect)?.option).length
        : 0;

    const tabs: { key: ActiveTab; label: string; icon: string; count?: number; available: boolean }[] = [
        { key: 'notes',      label: 'Study Notes', icon: '📄', available: (material?.materials.length ?? 0) > 0 },
        { key: 'questions',  label: 'Quiz',         icon: '🧠', count: material?.questions.length,  available: (material?.questions.length ?? 0) > 0 },
        { key: 'flashcards', label: 'Flashcards',   icon: '🃏', count: material?.flashcards.length, available: (material?.flashcards.length ?? 0) > 0 },
    ];

    if (!authReady || loading) return <Spinner />;

    if (error || !material) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-xl border border-red-100 p-8 max-w-md w-full text-center">
                    <div className="text-4xl mb-4">⚠️</div>
                    <p className="text-red-700 font-medium mb-6">{error ?? 'Something went wrong.'}</p>
                    <button onClick={() => router.back()}
                            className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
                        ← Go back
                    </button>
                </div>
            </div>
        );
    }

    const diffStyle = DIFFICULTY_COLORS[material.difficulty];
    const createdDate = material.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    }) ?? '';

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F0F4FF 0%, #F8FAFF 50%, #EEF2FF 100%)', colorScheme: 'light' }}>

            {/* ── Hero header with depth ── */}
            <div style={{
                background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%)',
                padding: '32px 24px 64px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Decorative circles for depth */}
                <div style={{
                    position: 'absolute', top: -40, right: -40,
                    width: 200, height: 200, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: -60, left: '30%',
                    width: 280, height: 280, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', top: 20, left: '60%',
                    width: 120, height: 120, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                    pointerEvents: 'none',
                }} />

                <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
                    <button
                        onClick={() => router.back()}
                        style={{
                            background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: 8, padding: '6px 14px', fontSize: 13, color: 'rgba(255,255,255,0.85)',
                            cursor: 'pointer', marginBottom: 20, fontFamily: 'inherit',
                            backdropFilter: 'blur(4px)',
                        }}
                    >
                        ← Back
                    </button>

                    <h1 style={{
                        fontSize: 28, fontWeight: 700, color: '#fff',
                        margin: '0 0 14px', lineHeight: 1.2,
                        textShadow: '0 2px 12px rgba(0,0,0,0.2)',
                    }}>
                        {material.subjectName}
                    </h1>

                    {/* Meta badges */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                        <span style={{
                            background: diffStyle.bg, color: diffStyle.text,
                            border: `1px solid ${diffStyle.border}`,
                            fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                        }}>
                            {DIFFICULTY_LABELS[material.difficulty]}
                        </span>
                        {material.sourceFileName && (
                            <span style={{
                                background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20,
                                backdropFilter: 'blur(4px)',
                            }}>
                                📎 {material.sourceFileName}
                            </span>
                        )}
                        {createdDate && (
                            <span style={{
                                background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.75)',
                                border: '1px solid rgba(255,255,255,0.15)',
                                fontSize: 12, fontWeight: 500, padding: '4px 12px', borderRadius: 20,
                            }}>
                                {createdDate}
                            </span>
                        )}
                    </div>

                    {/* Topic chips */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {material.topics.map(t => (
                            <span key={t} style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.18)',
                                borderRadius: 20, padding: '3px 11px',
                                fontSize: 12, color: 'rgba(255,255,255,0.8)',
                                backdropFilter: 'blur(4px)',
                            }}>
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Content card floating over header ── */}
            <div style={{ maxWidth: 760, margin: '-28px auto 40px', padding: '0 16px', position: 'relative', zIndex: 2 }}>
                <div style={{
                    background: '#fff',
                    borderRadius: 20,
                    boxShadow: '0 8px 40px rgba(30,58,138,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid rgba(219,234,254,0.8)',
                    overflow: 'hidden',
                }}>

                    {/* Tab bar */}
                    <div style={{
                        display: 'flex',
                        borderBottom: '1px solid #F1F5F9',
                        background: '#FAFBFF',
                        padding: '0 8px',
                    }}>
                        {tabs.filter(t => t.available).map(t => (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '14px 16px',
                                    fontSize: 13.5, fontWeight: activeTab === t.key ? 600 : 400,
                                    color: activeTab === t.key ? '#1D4ED8' : '#64748B',
                                    background: 'none', border: 'none',
                                    borderBottom: `2.5px solid ${activeTab === t.key ? '#1D4ED8' : 'transparent'}`,
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 0.15s',
                                    marginBottom: -1,
                                }}
                            >
                                <span style={{ fontSize: 15 }}>{t.icon}</span>
                                {t.label}
                                {t.count !== undefined && t.count > 0 && (
                                    <span style={{
                                        fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
                                        background: activeTab === t.key ? '#EFF6FF' : '#F1F5F9',
                                        color: activeTab === t.key ? '#1D4ED8' : '#94A3B8',
                                    }}>{t.count}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '24px 24px 32px' }}>

                        {/* ── Notes ── */}
                        {activeTab === 'notes' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {material.materials.map((m, i) => (
                                    <div key={i} style={{
                                        background: 'linear-gradient(135deg, #FAFBFF 0%, #F8FAFF 100%)',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: 14,
                                        padding: '18px 20px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}>
                                        {/* Left accent bar */}
                                        <div style={{
                                            position: 'absolute', left: 0, top: 0, bottom: 0,
                                            width: 3, background: 'linear-gradient(180deg, #1D4ED8, #60A5FA)',
                                            borderRadius: '14px 0 0 14px',
                                        }} />
                                        <div style={{ paddingLeft: 12 }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                                                <span style={{
                                                    fontSize: 11, fontWeight: 700, color: '#1D4ED8',
                                                    textTransform: 'uppercase', letterSpacing: '0.07em',
                                                }}>
                                                    Section {i + 1}
                                                </span>
                                            </div>
                                            <h3 style={{
                                                fontSize: 15, fontWeight: 600, color: '#0F172A',
                                                margin: '0 0 10px', lineHeight: 1.4,
                                            }}>
                                                {m.title}
                                            </h3>
                                            <div style={{ fontSize: 13.5, color: '#334155', lineHeight: 1.8 }}>
                                                <MarkdownContent content={m.content} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── Quiz ── */}
                        {activeTab === 'questions' && (
                            <div>
                                {/* Score banner */}
                                {quizSubmitted && (
                                    <div style={{
                                        background: score / material.questions.length >= 0.7
                                            ? 'linear-gradient(135deg, #F0FDF4, #DCFCE7)'
                                            : 'linear-gradient(135deg, #FEF2F2, #FEE2E2)',
                                        border: `1px solid ${score / material.questions.length >= 0.7 ? '#BBF7D0' : '#FECACA'}`,
                                        borderRadius: 14, padding: '20px 24px',
                                        marginBottom: 20,
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                    }}>
                                        <div>
                                            <div style={{
                                                fontSize: 26, fontWeight: 700,
                                                color: score / material.questions.length >= 0.7 ? '#15803D' : '#DC2626',
                                            }}>
                                                {score} / {material.questions.length}
                                                <span style={{ fontSize: 14, fontWeight: 500, marginLeft: 8, opacity: 0.7 }}>
                                                    ({Math.round(score / material.questions.length * 100)}%)
                                                </span>
                                            </div>
                                            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                                                {score === material.questions.length ? '🎉 Perfect score! Excellent work.'
                                                    : score / material.questions.length >= 0.7 ? 'Good effort — review the ones you missed.'
                                                        : "Keep studying — you'll get there!"}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}
                                            style={{
                                                padding: '9px 18px', fontSize: 13, fontWeight: 600,
                                                borderRadius: 10, border: '1px solid #E2E8F0',
                                                background: '#fff', color: '#374151', cursor: 'pointer',
                                                fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                                            }}
                                        >
                                            ↺ Retry
                                        </button>
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                    {material.questions.map((q, i) => {
                                        const selected = quizAnswers[i];
                                        return (
                                            <div key={i} style={{
                                                background: '#FAFBFF',
                                                border: '1px solid #E2E8F0',
                                                borderRadius: 14, padding: '18px 20px',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                            }}>
                                                <div style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                                    fontSize: 11, fontWeight: 700, color: '#1D4ED8',
                                                    textTransform: 'uppercase', letterSpacing: '0.07em',
                                                    background: '#EFF6FF', border: '1px solid #BFDBFE',
                                                    borderRadius: 20, padding: '3px 10px', marginBottom: 10,
                                                }}>
                                                    Q{i + 1}
                                                </div>
                                                <p style={{ fontSize: 14.5, fontWeight: 600, color: '#0F172A', margin: '0 0 14px', lineHeight: 1.5 }}>
                                                    {q.text}
                                                </p>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    {q.choices.map(c => {
                                                        const isSelected = selected === c.option;
                                                        const isCorrect  = quizSubmitted && c.isCorrect;
                                                        const isWrong    = quizSubmitted && isSelected && !c.isCorrect;

                                                        let bg     = isSelected && !quizSubmitted ? '#EFF6FF' : '#fff';
                                                        let border = isSelected && !quizSubmitted ? '1.5px solid #93C5FD' : '1px solid #E2E8F0';
                                                        let color  = '#334155';
                                                        let shadow = '0 1px 3px rgba(0,0,0,0.05)';

                                                        if (isCorrect) { bg = '#F0FDF4'; border = '1.5px solid #86EFAC'; color = '#15803D'; shadow = '0 2px 8px rgba(21,128,61,0.1)'; }
                                                        if (isWrong)   { bg = '#FEF2F2'; border = '1.5px solid #FCA5A5'; color = '#DC2626'; shadow = '0 2px 8px rgba(220,38,38,0.1)'; }

                                                        return (
                                                            <div
                                                                key={c.option}
                                                                onClick={() => selectAnswer(i, c.option)}
                                                                style={{
                                                                    display: 'flex', gap: 10, alignItems: 'flex-start',
                                                                    fontSize: 13.5, padding: '11px 14px', borderRadius: 10,
                                                                    border, background: bg, color,
                                                                    cursor: quizSubmitted ? 'default' : 'pointer',
                                                                    transition: 'all 0.15s',
                                                                    boxShadow: shadow,
                                                                }}
                                                            >
                                                                <span style={{
                                                                    fontSize: 11, fontWeight: 700, minWidth: 22, height: 22,
                                                                    borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0,
                                                                    background: isCorrect ? '#16A34A' : isWrong ? '#DC2626'
                                                                        : isSelected ? '#1D4ED8' : '#E2E8F0',
                                                                    color: (isCorrect || isWrong || isSelected) ? '#fff' : '#64748B',
                                                                }}>
                                                                    {c.option}
                                                                </span>
                                                                <span style={{ lineHeight: 1.5 }}>{c.text}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                {quizSubmitted && q.explanation && (
                                                    <div style={{
                                                        marginTop: 12, fontSize: 13, color: '#92400E', lineHeight: 1.65,
                                                        background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)',
                                                        border: '1px solid #FDE68A',
                                                        borderRadius: 10, padding: '10px 14px',
                                                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                                    }}>
                                                        💡 {q.explanation}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {!quizSubmitted && (
                                    <button
                                        onClick={() => setQuizSubmitted(true)}
                                        disabled={Object.keys(quizAnswers).length < material.questions.length}
                                        style={{
                                            width: '100%', padding: '13px', fontSize: 14, fontWeight: 600,
                                            borderRadius: 12, border: 'none', fontFamily: 'inherit', marginTop: 16,
                                            background: Object.keys(quizAnswers).length === material.questions.length
                                                ? 'linear-gradient(135deg, #1D4ED8, #2563EB)'
                                                : '#E2E8F0',
                                            color: Object.keys(quizAnswers).length === material.questions.length ? '#fff' : '#94A3B8',
                                            cursor: Object.keys(quizAnswers).length === material.questions.length ? 'pointer' : 'not-allowed',
                                            boxShadow: Object.keys(quizAnswers).length === material.questions.length
                                                ? '0 4px 14px rgba(29,78,216,0.35)'
                                                : 'none',
                                            transition: 'all 0.2s',
                                        }}
                                    >
                                        Submit answers · {Object.keys(quizAnswers).length}/{material.questions.length} answered
                                    </button>
                                )}
                            </div>
                        )}

                        {/* ── Flashcards ── */}
                        {activeTab === 'flashcards' && (
                            <div>
                                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 18, marginTop: 0 }}>
                                    Click a card to reveal the definition.
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {material.flashcards.map((f, i) => (
                                        <div
                                            key={i}
                                            onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                                            style={{
                                                borderRadius: 14, padding: '18px',
                                                cursor: 'pointer', minHeight: 110,
                                                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                background: flippedCards[i]
                                                    ? 'linear-gradient(135deg, #EFF6FF, #DBEAFE)'
                                                    : 'linear-gradient(135deg, #FAFBFF, #F8FAFF)',
                                                border: flippedCards[i] ? '1.5px solid #93C5FD' : '1px solid #E2E8F0',
                                                boxShadow: flippedCards[i]
                                                    ? '0 4px 16px rgba(29,78,216,0.12), inset 0 1px 0 rgba(255,255,255,0.9)'
                                                    : '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
                                                transform: flippedCards[i] ? 'translateY(-1px)' : 'none',
                                            }}
                                        >
                                            {flippedCards[i] ? (
                                                <>
                                                    <div style={{
                                                        fontSize: 10, fontWeight: 700, color: '#1D4ED8',
                                                        textTransform: 'uppercase', letterSpacing: '0.08em',
                                                        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
                                                    }}>
                                                        <span style={{
                                                            width: 16, height: 16, borderRadius: 4,
                                                            background: '#1D4ED8', color: '#fff',
                                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 9,
                                                        }}>✓</span>
                                                        Definition
                                                    </div>
                                                    <p style={{ fontSize: 13, color: '#1E40AF', lineHeight: 1.65, margin: 0, fontWeight: 400 }}>
                                                        {f.definition}
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <div style={{
                                                        fontSize: 10, fontWeight: 700, color: '#94A3B8',
                                                        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
                                                    }}>
                                                        Term
                                                    </div>
                                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', lineHeight: 1.4, margin: 0 }}>
                                                        {f.term}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setFlippedCards({})}
                                    style={{
                                        marginTop: 16, padding: '9px 18px', fontSize: 13, fontWeight: 500,
                                        borderRadius: 10, border: '1px solid #E2E8F0',
                                        background: '#fff', color: '#374151', cursor: 'pointer',
                                        fontFamily: 'inherit', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                                    }}
                                >
                                    Reset all cards
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}