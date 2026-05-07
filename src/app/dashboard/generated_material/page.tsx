'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, orderBy, query, where, deleteDoc, doc } from 'firebase/firestore';
import Spinner from '@/app/components/ui/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

type DifficultyLevel = 'gcse_foundation' | 'gcse_higher' | 'a_level';
type GenerationMode  = 'both' | 'materials' | 'questions' | 'flashcards';

interface SavedMaterial {
    id: string;
    subjectName: string;
    topics: string[];
    mode: GenerationMode;
    difficulty: DifficultyLevel;
    createdAt: { toDate: () => Date };
    sourceType: 'file' | 'text';
    sourceFileName: string | null;
    materialsCount: number;
    questionsCount: number;
    flashcardsCount: number;
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    gcse_foundation: 'GCSE Foundation',
    gcse_higher:     'GCSE Higher',
    a_level:         'A Level',
};

const MODE_LABELS: Record<GenerationMode, string> = {
    both:       'Notes + Quiz',
    materials:  'Study Notes',
    questions:  'Quiz',
    flashcards: 'Flashcards',
};

const MODE_COLORS: Record<GenerationMode, { bg: string; color: string }> = {
    both:       { bg: '#EFF6FF', color: '#1D4ED8' },
    materials:  { bg: '#F0FDF4', color: '#16A34A' },
    questions:  { bg: '#FFFBEB', color: '#D97706' },
    flashcards: { bg: '#FDF4FF', color: '#9333EA' },
};

// ─── Confirm Delete Dialog ────────────────────────────────────────────────────

function ConfirmDeleteDialog({
                                 subjectName,
                                 onConfirm,
                                 onCancel,
                                 deleting,
                             }: {
    subjectName: string;
    onConfirm: () => void;
    onCancel: () => void;
    deleting: boolean;
}) {
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
        }}>
            <div style={{
                background: '#fff', borderRadius: 16, padding: '28px 24px',
                maxWidth: 360, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                fontFamily: 'system-ui, sans-serif',
            }}>
                {/* Icon */}
                <div style={{
                    width: 44, height: 44, borderRadius: 12, marginBottom: 16,
                    background: '#FEF2F2',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                    🗑️
                </div>

                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                    Delete material?
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: '0 0 22px' }}>
                    <strong style={{ color: '#111827' }}>{subjectName}</strong> will be permanently deleted.
                    This cannot be undone.
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={onCancel}
                        disabled={deleting}
                        style={{
                            flex: 1, padding: '10px', fontSize: 13, fontWeight: 500,
                            borderRadius: 9, border: '1px solid #E5E7EB',
                            background: '#F9FAFB', color: '#374151',
                            cursor: deleting ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={deleting}
                        style={{
                            flex: 1, padding: '10px', fontSize: 13, fontWeight: 500,
                            borderRadius: 9, border: 'none',
                            background: deleting ? '#FCA5A5' : '#EF4444',
                            color: '#fff',
                            cursor: deleting ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GeneratedMaterialsListPage() {
    const router = useRouter();

    const [uid, setUid]             = useState<string | null>(null);
    const [authReady, setAuthReady] = useState(false);
    const [materials, setMaterials] = useState<SavedMaterial[]>([]);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState<string | null>(null);
    const [deleting, setDeleting]   = useState<string | null>(null);
    // ID of the material pending confirmation
    const [pendingDelete, setPendingDelete] = useState<SavedMaterial | null>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (u) => {
            setUid(u?.uid ?? null);
            setAuthReady(true);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!authReady || !uid) { setLoading(false); return; }

        async function fetchMaterials() {
            setLoading(true);
            setError(null);
            try {
                const q = query(
                    collection(db, 'user_generated_materials'),
                    where('userId', '==', uid),
                    orderBy('createdAt', 'desc')
                );
                const snap = await getDocs(q);
                const items: SavedMaterial[] = snap.docs.map(d => {
                    const data = d.data();
                    return {
                        id:              d.id,
                        subjectName:     data.subjectName ?? 'Untitled',
                        topics:          data.topics ?? [],
                        mode:            data.mode ?? 'both',
                        difficulty:      data.difficulty ?? 'gcse_higher',
                        createdAt:       data.createdAt,
                        sourceType:      data.sourceType ?? 'text',
                        sourceFileName:  data.sourceFileName ?? null,
                        materialsCount:  (data.materials ?? []).length,
                        questionsCount:  (data.questions ?? []).length,
                        flashcardsCount: (data.flashcards ?? []).length,
                    };
                });
                setMaterials(items);
            } catch (err: any) {
                console.error('Fetch error:', err);
                setError('Failed to load your materials. Please try again.');
            } finally {
                setLoading(false);
            }
        }

        fetchMaterials();
    }, [authReady, uid]);

    const confirmDelete = (m: SavedMaterial, e: React.MouseEvent) => {
        e.stopPropagation();
        setPendingDelete(m);
    };

    const handleDelete = async () => {
        if (!pendingDelete) return;
        setDeleting(pendingDelete.id);
        try {
            await deleteDoc(doc(db, 'user_generated_materials', pendingDelete.id));
            setMaterials(prev => prev.filter(m => m.id !== pendingDelete.id));
            setPendingDelete(null);
        } catch (err) {
            console.error('Delete error:', err);
        } finally {
            setDeleting(null);
        }
    };

    if (!authReady || loading) return <Spinner />;

    return (
        <>
            {pendingDelete && (
                <ConfirmDeleteDialog
                    subjectName={pendingDelete.subjectName}
                    deleting={deleting === pendingDelete.id}
                    onConfirm={handleDelete}
                    onCancel={() => setPendingDelete(null)}
                />
            )}

            <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 16px', colorScheme: 'light' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <div>
                        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#111827', margin: 0 }}>
                            My Generated Materials
                        </h1>
                        <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>
                            {materials.length === 0
                                ? 'No materials yet — generate some from the Upload tab.'
                                : `${materials.length} saved material${materials.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626', marginBottom: 20 }}>
                        {error}
                    </div>
                )}

                {/* Empty state */}
                {materials.length === 0 && !error && (
                    <div style={{
                        textAlign: 'center', padding: '60px 20px',
                        background: '#F9FAFB', borderRadius: 16,
                        border: '1px dashed #E5E7EB',
                    }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>📚</div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                            No materials yet
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280' }}>
                            Upload your notes and generate study materials to see them here.
                        </div>
                    </div>
                )}

                {/* Material cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {materials.map(m => {
                        const modeStyle = MODE_COLORS[m.mode] ?? MODE_COLORS.both;
                        const dateStr   = m.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                        }) ?? '';

                        return (
                            <div
                                key={m.id}
                                onClick={() => router.push(`/dashboard/generated_material/${m.id}`)}
                                style={{
                                    background: '#fff',
                                    border: '1px solid #E5E7EB',
                                    borderRadius: 12,
                                    padding: '16px 18px',
                                    cursor: 'pointer',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 16,
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLDivElement).style.borderColor = '#93C5FD';
                                    (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(59,130,246,0.08)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLDivElement).style.borderColor = '#E5E7EB';
                                    (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                                }}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                                    background: modeStyle.bg,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                                }}>
                                    {m.mode === 'both' ? '📚' : m.mode === 'materials' ? '📝' : m.mode === 'questions' ? '❓' : '🃏'}
                                </div>

                                {/* Main content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                            {m.subjectName}
                                        </span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                                            background: modeStyle.bg, color: modeStyle.color,
                                        }}>
                                            {MODE_LABELS[m.mode]}
                                        </span>
                                        <span style={{
                                            fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20,
                                            background: '#EFF6FF', color: '#1D4ED8',
                                        }}>
                                            {DIFFICULTY_LABELS[m.difficulty]}
                                        </span>
                                    </div>

                                    {m.topics.length > 0 && (
                                        <div style={{ marginBottom: 6 }}>
                                            {m.topics.slice(0, 4).map(t => (
                                                <span key={t} style={{
                                                    display: 'inline-block', fontSize: 11, color: '#6B7280',
                                                    background: '#F9FAFB', border: '1px solid #E5E7EB',
                                                    borderRadius: 20, padding: '1px 8px', margin: '0 4px 2px 0',
                                                }}>
                                                    {t}
                                                </span>
                                            ))}
                                            {m.topics.length > 4 && (
                                                <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                                                    +{m.topics.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#9CA3AF' }}>
                                        {m.materialsCount > 0  && <span>📄 {m.materialsCount} notes</span>}
                                        {m.questionsCount > 0  && <span>❓ {m.questionsCount} questions</span>}
                                        {m.flashcardsCount > 0 && <span>🃏 {m.flashcardsCount} cards</span>}
                                        {m.sourceFileName      && <span>📎 {m.sourceFileName}</span>}
                                        {dateStr               && <span style={{ marginLeft: 'auto' }}>{dateStr}</span>}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                    <button
                                        onClick={e => confirmDelete(m, e)}
                                        disabled={deleting === m.id}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            padding: '4px 2px',
                                            cursor: deleting === m.id ? 'not-allowed' : 'pointer',
                                            fontSize: 12,
                                            fontWeight: 500,
                                            color: deleting === m.id ? '#FCA5A5' : '#EF4444',
                                            opacity: deleting === m.id ? 0.6 : 1,
                                            fontFamily: 'inherit',
                                            whiteSpace: 'nowrap',
                                            textDecoration: 'underline',
                                            textUnderlineOffset: 2,
                                        }}
                                    >
                                        {deleting === m.id ? 'Deleting…' : 'Delete'}
                                    </button>
                                    <div style={{ color: '#9CA3AF', fontSize: 16 }}>›</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </>
    );
}