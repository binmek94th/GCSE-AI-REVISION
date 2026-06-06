'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, orderBy, query, where, deleteDoc, doc } from 'firebase/firestore';
import Spinner from '@/app/components/ui/Spinner';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
    BookOpen, FileText, HelpCircle, Copy, Layers, Trash2, ChevronRight,
    Loader2, Paperclip, Calendar, AlertCircle, AlertTriangle,
} from 'lucide-react';

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

// Tailwind classes for each mode's badge + icon tile
const MODE_BADGE: Record<GenerationMode, string> = {
    both:       'bg-blue-100 text-blue-800',
    materials:  'bg-green-100 text-green-800',
    questions:  'bg-amber-100 text-amber-800',
    flashcards: 'bg-purple-100 text-purple-800',
};

const MODE_ICON_TILE: Record<GenerationMode, string> = {
    both:       'bg-blue-100 text-blue-600',
    materials:  'bg-green-100 text-green-600',
    questions:  'bg-amber-100 text-amber-600',
    flashcards: 'bg-purple-100 text-purple-600',
};

const MODE_ICON: Record<GenerationMode, typeof Layers> = {
    both:       Layers,
    materials:  BookOpen,
    questions:  HelpCircle,
    flashcards: Copy,
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="max-w-sm w-full">
                <CardContent className="pt-6 space-y-4">
                    <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-900">Delete material?</h3>
                        <p className="text-sm text-gray-800 leading-relaxed">
                            <span className="font-semibold text-gray-900">{subjectName}</span> will be permanently
                            deleted. This cannot be undone.
                        </p>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <Button variant="outline" className="flex-1 cursor-pointer" onClick={onCancel} disabled={deleting}>
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                            onClick={onConfirm}
                            disabled={deleting}
                        >
                            {deleting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                            ) : (
                                <><Trash2 className="w-4 h-4 mr-2" />Yes, delete</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
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

            <div className="max-w-3xl mx-auto px-4 py-6">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-gray-900">My Generated Materials</h1>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                        {materials.length === 0
                            ? 'No materials yet — generate some from the Upload tab.'
                            : `${materials.length} saved material${materials.length !== 1 ? 's' : ''}`}
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div className="mb-5 p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                        <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                )}

                {/* Empty state */}
                {materials.length === 0 && !error && (
                    <div className="text-center py-16 px-5 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                        <BookOpen className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <div className="text-base font-bold text-gray-900 mb-1">No materials yet</div>
                        <div className="text-sm font-medium text-gray-700">
                            Upload your notes and generate study materials to see them here.
                        </div>
                    </div>
                )}

                {/* Material cards */}
                <div className="flex flex-col gap-3">
                    {materials.map(m => {
                        const Icon    = MODE_ICON[m.mode] ?? Layers;
                        const dateStr = m.createdAt?.toDate?.()?.toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric',
                        }) ?? '';

                        return (
                            <Card
                                key={m.id}
                                onClick={() => router.push(`/dashboard/generated_material/${m.id}`)}
                                className="cursor-pointer transition-colors hover:border-blue-300 hover:shadow-sm"
                            >
                                <CardContent className="flex items-center gap-4 py-4">
                                    {/* Icon tile */}
                                    <div className={`w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${MODE_ICON_TILE[m.mode] ?? MODE_ICON_TILE.both}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>

                                    {/* Main content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                            <span className="text-sm font-bold text-gray-900">{m.subjectName}</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${MODE_BADGE[m.mode] ?? MODE_BADGE.both}`}>
                                                {MODE_LABELS[m.mode]}
                                            </span>
                                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                                {DIFFICULTY_LABELS[m.difficulty]}
                                            </span>
                                        </div>

                                        {m.topics.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mb-2">
                                                {m.topics.slice(0, 4).map(t => (
                                                    <span key={t} className="text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded-full px-2 py-0.5">
                                                        {t}
                                                    </span>
                                                ))}
                                                {m.topics.length > 4 && (
                                                    <span className="text-xs font-medium text-gray-600 self-center">
                                                        +{m.topics.length - 4} more
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-700 flex-wrap">
                                            {m.materialsCount > 0 && (
                                                <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{m.materialsCount} notes</span>
                                            )}
                                            {m.questionsCount > 0 && (
                                                <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />{m.questionsCount} questions</span>
                                            )}
                                            {m.flashcardsCount > 0 && (
                                                <span className="flex items-center gap-1"><Copy className="w-3.5 h-3.5" />{m.flashcardsCount} cards</span>
                                            )}
                                            {m.sourceFileName && (
                                                <span className="flex items-center gap-1 min-w-0"><Paperclip className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate max-w-[140px]">{m.sourceFileName}</span></span>
                                            )}
                                            {dateStr && (
                                                <span className="flex items-center gap-1 ml-auto"><Calendar className="w-3.5 h-3.5" />{dateStr}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                                            onClick={e => confirmDelete(m, e)}
                                            disabled={deleting === m.id}
                                        >
                                            {deleting === m.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </Button>
                                        <ChevronRight className="w-5 h-5 text-gray-400" />
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </>
    );
}