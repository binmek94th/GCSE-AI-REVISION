'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Spinner from '@/app/components/ui/Spinner';
import {MarkdownContent} from "@/app/dashboard/study_materials/Markdown";

// ─── Types ────────────────────────────────────────────────────────────────────
// TODO: this page is flat in design
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


// ─── Main page ────────────────────────────────────────────────────────────────

export default function GeneratedMaterialPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const [uid, setUid]             = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);

    const [material, setMaterial]           = useState<GeneratedMaterial | null>(null);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState<string | null>(null);
    const [activeTab, setActiveTab]         = useState<ActiveTab>('notes');
    const [quizAnswers, setQuizAnswers]     = useState<Record<number, string>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [flippedCards, setFlippedCards]   = useState<Record<number, boolean>>({});

    // ── Wait for Firebase Auth to resolve ────────────────────────────────────
    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUid(u?.uid ?? null);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    // ── Fetch once auth is ready ──────────────────────────────────────────────
    useEffect(() => {
        if (!authReady) return;

        if (!uid) {
            setError('You must be signed in to view this material.');
            setLoading(false);
            return;
        }

        if (!id) {
            setError('Material not found.');
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function fetchMaterial() {
            setLoading(true);
            setError(null);
            try {
                const snap = await getDoc(doc(db, 'user_generated_materials', id));
                if (cancelled) return;

                if (!snap.exists()) { setError('Material not found.'); return; }

                const data = snap.data() as GeneratedMaterial;

                if (data.userId !== uid) {
                    setError('You do not have permission to view this material.');
                    return;
                }

                setMaterial(data);

                if (data.materials.length > 0)       setActiveTab('notes');
                else if (data.questions.length > 0)  setActiveTab('questions');
                else if (data.flashcards.length > 0) setActiveTab('flashcards');
            } catch (err) {
                if (!cancelled) {
                    console.error('Fetch error:', err);
                    setError('Failed to load material. Please try again.');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchMaterial();
        return () => { cancelled = true; };
    }, [authReady, uid, id]);

    // ── Quiz helpers ──────────────────────────────────────────────────────────

    const selectAnswer = (qIndex: number, option: string) => {
        if (quizSubmitted) return;
        setQuizAnswers(prev => ({ ...prev, [qIndex]: option }));
    };

    const score = quizSubmitted && material
        ? material.questions.filter((q, i) =>
            quizAnswers[i] === q.choices.find(c => c.isCorrect)?.option
        ).length
        : 0;

    const tabs: { key: ActiveTab; label: string; count?: number; available: boolean }[] = [
        { key: 'notes',      label: 'Study Notes', available: (material?.materials.length ?? 0) > 0 },
        { key: 'questions',  label: 'Quiz',        count: material?.questions.length,  available: (material?.questions.length ?? 0) > 0 },
        { key: 'flashcards', label: 'Flashcards',  count: material?.flashcards.length, available: (material?.flashcards.length ?? 0) > 0 },
    ];

    // ─── Render ───────────────────────────────────────────────────────────────

    if (!authReady || loading) return <Spinner />;

    if (error || !material) {
        return (
            <div style={styles.page}>
                <div style={styles.errorBox}>{error ?? 'Something went wrong.'}</div>
                <button onClick={() => router.back()} style={styles.secondaryBtn}>← Go back</button>
            </div>
        );
    }

    const createdDate = material.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
    }) ?? '';

    return (
        <div style={styles.page}>

            <button onClick={() => router.back()} style={styles.backBtn}>← Back</button>

            {/* Header */}
            <div style={styles.header}>
                <div style={{ flex: 1 }}>
                    <h1 style={styles.title}>{material.subjectName}</h1>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        <span style={{ ...styles.badge, background: '#E6F1FB', color: '#185FA5' }}>
                            {DIFFICULTY_LABELS[material.difficulty]}
                        </span>
                        {material.sourceFileName && (
                            <span style={{ ...styles.badge, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
                                📎 {material.sourceFileName}
                            </span>
                        )}
                        {createdDate && (
                            <span style={{ ...styles.badge, background: 'var(--color-background-secondary)', color: 'var(--color-text-secondary)' }}>
                                {createdDate}
                            </span>
                        )}
                    </div>
                    <div style={{ marginTop: 10 }}>
                        {material.topics.map(t => (
                            <span key={t} style={styles.topicChip}>{t}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div style={styles.tabRow}>
                {tabs.filter(t => t.available).map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        style={{
                            ...styles.tab,
                            borderBottom: activeTab === t.key ? '2px solid #185FA5' : '2px solid transparent',
                            color: activeTab === t.key ? '#185FA5' : 'var(--color-text-secondary)',
                            fontWeight: activeTab === t.key ? 500 : 400,
                        }}
                    >
                        {t.label}
                        {t.count !== undefined && t.count > 0 && (
                            <span style={styles.countBadge}>{t.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── Notes ── */}
            {activeTab === 'notes' && (
                <div style={{ marginTop: 20 }}>
                    {material.materials.map((m, i) => (
                        <div key={i} style={styles.contentBlock}>
                            <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 8 }}>
                                {m.title}
                            </h3>
                            <MarkdownContent content={m.content} />
                        </div>
                    ))}
                </div>
            )}

            {/* ── Quiz ── */}
            {activeTab === 'questions' && (
                <div style={{ marginTop: 20 }}>
                    {quizSubmitted && (
                        <div style={styles.scoreCard}>
                            <div style={{ fontSize: 24, fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                {score} / {material.questions.length}
                            </div>
                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4 }}>
                                {score === material.questions.length
                                    ? 'Perfect score! Excellent work.'
                                    : score >= material.questions.length * 0.7
                                        ? 'Good effort — review the ones you missed.'
                                        : "Keep studying — you'll get there!"}
                            </div>
                            <button
                                onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); }}
                                style={{ ...styles.secondaryBtn, marginTop: 14 }}
                            >
                                Retry quiz
                            </button>
                        </div>
                    )}

                    {material.questions.map((q, i) => {
                        const correct  = q.choices.find(c => c.isCorrect);
                        const selected = quizAnswers[i];

                        return (
                            <div key={i} style={styles.contentBlock}>
                                <div style={styles.qNum}>Question {i + 1}</div>
                                <p style={styles.qText}>{q.text}</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {q.choices.map(c => {
                                        let bg     = 'transparent';
                                        let border = '0.5px solid var(--color-border-tertiary)';
                                        let color  = 'var(--color-text-secondary)';

                                        if (!quizSubmitted && selected === c.option) {
                                            bg = '#E6F1FB'; border = '1.5px solid #378ADD'; color = '#185FA5';
                                        } else if (quizSubmitted && c.isCorrect) {
                                            bg = '#EAF3DE'; border = '0.5px solid #C0DD97'; color = '#3B6D11';
                                        } else if (quizSubmitted && selected === c.option && !c.isCorrect) {
                                            bg = '#FCEBEB'; border = '0.5px solid #F7C1C1'; color = '#A32D2D';
                                        }

                                        return (
                                            <div
                                                key={c.option}
                                                onClick={() => selectAnswer(i, c.option)}
                                                style={{
                                                    display: 'flex', gap: 10, alignItems: 'flex-start',
                                                    fontSize: 13, padding: '9px 12px', borderRadius: 8,
                                                    border, background: bg, color,
                                                    cursor: quizSubmitted ? 'default' : 'pointer',
                                                    transition: 'all 0.15s',
                                                }}
                                            >
                                                <span style={{ fontWeight: 500, minWidth: 18, fontSize: 12 }}>{c.option}</span>
                                                <span>{c.text}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                                {quizSubmitted && q.explanation && (
                                    <div style={styles.explanation}>💡 {q.explanation}</div>
                                )}
                            </div>
                        );
                    })}

                    {!quizSubmitted && (
                        <button
                            onClick={() => setQuizSubmitted(true)}
                            disabled={Object.keys(quizAnswers).length < material.questions.length}
                            style={{
                                ...styles.primaryBtn,
                                opacity: Object.keys(quizAnswers).length < material.questions.length ? 0.5 : 1,
                                cursor: Object.keys(quizAnswers).length < material.questions.length ? 'not-allowed' : 'pointer',
                            }}
                        >
                            Submit answers ({Object.keys(quizAnswers).length}/{material.questions.length} answered)
                        </button>
                    )}
                </div>
            )}

            {/* ── Flashcards ── */}
            {activeTab === 'flashcards' && (
                <div style={{ marginTop: 20 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                        Click a card to reveal the definition.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {material.flashcards.map((f, i) => (
                            <div
                                key={i}
                                onClick={() => setFlippedCards(prev => ({ ...prev, [i]: !prev[i] }))}
                                style={{
                                    background: flippedCards[i] ? '#E6F1FB' : 'var(--color-background-primary)',
                                    border: flippedCards[i] ? '0.5px solid #B5D4F4' : '0.5px solid var(--color-border-tertiary)',
                                    borderRadius: 12, padding: '18px 16px',
                                    cursor: 'pointer', minHeight: 100,
                                    display: 'flex', flexDirection: 'column',
                                    justifyContent: 'center', transition: 'all 0.2s',
                                }}
                            >
                                {flippedCards[i] ? (
                                    <>
                                        <div style={{ fontSize: 11, fontWeight: 500, color: '#378ADD', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Definition
                                        </div>
                                        <p style={{ fontSize: 13, color: '#185FA5', lineHeight: 1.6, margin: 0 }}>{f.definition}</p>
                                    </>
                                ) : (
                                    <>
                                        <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-tertiary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                            Term
                                        </div>
                                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.5, margin: 0 }}>{f.term}</p>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setFlippedCards({})}
                        style={{ ...styles.secondaryBtn, marginTop: 16 }}
                    >
                        Reset all cards
                    </button>
                </div>
            )}
        </div>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
    page:         { maxWidth: 720, margin: '0 auto', padding: '24px 16px' } as React.CSSProperties,
    errorBox:     { background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#A32D2D', marginBottom: 16 } as React.CSSProperties,
    backBtn:      { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-secondary)', padding: '0 0 16px', fontFamily: 'var(--font-sans)' } as React.CSSProperties,
    header:       { display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 24, paddingBottom: 24, borderBottom: '0.5px solid var(--color-border-tertiary)' } as React.CSSProperties,
    title:        { fontSize: 22, fontWeight: 500, color: 'var(--color-text-primary)', lineHeight: 1.3 } as React.CSSProperties,
    badge:        { fontSize: 12, padding: '4px 10px', borderRadius: 20, fontWeight: 500 } as React.CSSProperties,
    topicChip:    { display: 'inline-block', background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 20, padding: '3px 10px', fontSize: 12, color: 'var(--color-text-secondary)', margin: '2px 4px 2px 0' } as React.CSSProperties,
    tabRow:       { display: 'flex', gap: 0, borderBottom: '0.5px solid var(--color-border-tertiary)' } as React.CSSProperties,
    tab:          { background: 'none', border: 'none', borderBottom: '2px solid transparent', cursor: 'pointer', fontSize: 14, padding: '10px 16px', fontFamily: 'var(--font-sans)', display: 'flex', alignItems: 'center', gap: 6, transition: 'color 0.15s' } as React.CSSProperties,
    countBadge:   { fontSize: 11, background: 'var(--color-background-secondary)', borderRadius: 20, padding: '1px 7px', color: 'var(--color-text-tertiary)' } as React.CSSProperties,
    contentBlock: { background: 'var(--color-background-primary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '16px 18px', marginBottom: 12 } as React.CSSProperties,
    scoreCard:    { background: 'var(--color-background-secondary)', border: '0.5px solid var(--color-border-tertiary)', borderRadius: 12, padding: '20px', marginBottom: 20, textAlign: 'center' as const },
    qNum:         { fontSize: 11, fontWeight: 500, color: '#185FA5', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: '0.04em' },
    qText:        { fontSize: 15, fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: 12, lineHeight: 1.5 } as React.CSSProperties,
    explanation:  { marginTop: 12, fontSize: 12, color: 'var(--color-text-secondary)', background: 'var(--color-background-secondary)', borderRadius: 8, padding: '8px 12px', borderLeft: '2px solid var(--color-border-secondary)' } as React.CSSProperties,
    primaryBtn:   { width: '100%', padding: '12px', fontSize: 14, fontWeight: 500, borderRadius: 8, border: 'none', background: '#185FA5', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-sans)', marginTop: 4 } as React.CSSProperties,
    secondaryBtn: { padding: '9px 16px', fontSize: 13, fontWeight: 500, borderRadius: 8, border: '0.5px solid var(--color-border-secondary)', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)', cursor: 'pointer', fontFamily: 'var(--font-sans)' } as React.CSSProperties,
};