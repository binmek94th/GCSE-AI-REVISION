'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import Link from 'next/link'
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerationMode = 'both' | 'materials' | 'questions' | 'flashcards';
type DifficultyLevel = 'gcse_foundation' | 'gcse_higher' | 'a_level';
type ViewerTab = 'notes' | 'questions' | 'flashcards';

interface Choice { option: string; text: string; isCorrect: boolean; }
interface Question { text: string; choices: Choice[]; explanation: string; }
interface MaterialSection { title: string; content: string; }
interface Flashcard { term: string; definition: string; }

interface GeneratedContent {
    subject: string;
    topics: string[];
    materials: MaterialSection[];
    questions: Question[];
    flashcards: Flashcard[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FREE_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT = 15;
const MAX_FILE_SIZE_MB = 10;

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    gcse_foundation: 'GCSE Foundation',
    gcse_higher: 'GCSE Higher',
    a_level: 'A Level',
};

const MODE_OPTIONS: { value: GenerationMode; label: string; description: string; icon: string; color: string }[] = [
    { value: 'both',       label: 'Full package',    description: 'Study notes + quiz questions', icon: '📚', color: '#EFF6FF' },
    { value: 'materials',  label: 'Study notes only', description: 'Summaries & key concepts',    icon: '📝', color: '#F0FDF4' },
    { value: 'questions',  label: 'Questions only',   description: 'MCQ quiz questions',          icon: '❓', color: '#FFFBEB' },
    { value: 'flashcards', label: 'Flashcards',       description: 'Term & definition pairs',     icon: '🃏', color: '#FFF0F6' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

async function getRemainingGenerations(uid: string, isPro: boolean): Promise<number> {
    const snap = await getDoc(doc(db, 'users', uid, 'generationLimits', todayKey()));
    const used = snap.exists() ? (snap.data().count as number) : 0;
    return Math.max(0, (isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT) - used);
}

async function incrementGenerationCount(uid: string): Promise<void> {
    await setDoc(
        doc(db, 'users', uid, 'generationLimits', todayKey()),
        { count: increment(1), lastUsed: serverTimestamp() },
        { merge: true }
    );
}

// ─── Add-to-Plan modal ────────────────────────────────────────────────────────

function AddToPlanModal({
                            subjectName,
                            onConfirm,
                            onSkip,
                            adding,
                        }: {
    subjectName: string;
    onConfirm: () => void;
    onSkip: () => void;
    adding: boolean;
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
                maxWidth: 380, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                fontFamily: "'Inter', system-ui, sans-serif",
            }}>
                {/* Icon */}
                <div style={{
                    width: 48, height: 48, borderRadius: 12, marginBottom: 16,
                    background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                }}>📅</div>

                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111827', margin: '0 0 8px' }}>
                    Add to your study plan?
                </h3>
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.6, margin: '0 0 22px' }}>
                    Your <strong style={{ color: '#111827' }}>{subjectName}</strong> materials have been saved.
                    Would you like to add this subject to your daily study plan so it shows up in your schedule?
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={onSkip}
                        disabled={adding}
                        style={{
                            flex: 1, padding: '10px', fontSize: 13, fontWeight: 500,
                            borderRadius: 9, border: '1px solid #E5E7EB',
                            background: '#F9FAFB', color: '#374151',
                            cursor: adding ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Skip for now
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={adding}
                        style={{
                            flex: 1, padding: '10px', fontSize: 13, fontWeight: 500,
                            borderRadius: 9, border: 'none',
                            background: adding
                                ? '#93C5FD'
                                : 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                            color: '#fff',
                            cursor: adding ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}
                    >
                        {adding ? <><LoadingSpinner color="#fff" size={13} />Adding…</> : '✅ Yes, add to plan'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UploadTab() {
    const [uid, setUid]               = useState<string | null>(null);
    const isPro                        = true;
    const dailyLimit                   = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

    const [file, setFile]              = useState<File | null>(null);
    const [fileBase64, setFileBase64]  = useState<string | null>(null);
    const [pasteText, setPasteText]    = useState('');
    const [isDragging, setIsDragging]  = useState(false);
    const fileInputRef                 = useRef<HTMLInputElement>(null);

    const [mode, setMode]              = useState<GenerationMode>('both');
    const [difficulty, setDifficulty]  = useState<DifficultyLevel>('gcse_higher');
    const [questionCount, setQuestionCount] = useState(5);

    const [generating, setGenerating]  = useState(false);
    const [content, setContent]        = useState<GeneratedContent | null>(null);
    const [savedId, setSavedId]        = useState<string | null>(null);
    const [saving, setSaving]          = useState(false);
    const [error, setError]            = useState<string | null>(null);
    const [remaining, setRemaining]    = useState<number | null>(null);

    // Add-to-plan modal state
    const [showAddToPlan, setShowAddToPlan] = useState(false);
    const [addingToPlan, setAddingToPlan]   = useState(false);
    const [addedToPlan, setAddedToPlan]     = useState(false);

    useEffect(() => {
        const u = auth.currentUser;
        if (!u) return;
        setUid(u.uid);
        getRemainingGenerations(u.uid, isPro).then(setRemaining);
    }, []);

    const readBase64 = (f: File): Promise<string> =>
        new Promise((res, rej) => {
            const r = new FileReader();
            r.onload  = e => res((e.target!.result as string).split(',')[1]);
            r.onerror = () => rej(new Error('Read failed'));
            r.readAsDataURL(f);
        });

    const handleFile = useCallback(async (f: File) => {
        if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { setError(`Max file size is ${MAX_FILE_SIZE_MB}MB`); return; }
        try { setFile(f); setFileBase64(await readBase64(f)); setError(null); }
        catch { setError('Could not read file — please try again.'); }
    }, []);

    const clearFile = () => {
        setFile(null);
        setFileBase64(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    function buildPayload(): { system: string; messages: { role: string; content: unknown }[] } {
        const modeText: Record<GenerationMode, string> = {
            both:       `Create BOTH 3-5 study note sections AND ${questionCount} MCQ questions.`,
            materials:  `Create 3-5 detailed study note sections only.`,
            questions:  `Create ${questionCount} MCQ quiz questions only.`,
            flashcards: `Create ${questionCount} flashcard pairs (term + definition) only.`,
        };

        const system = `You are StudyCedo's AI tutor for UK ${DIFFICULTY_LABELS[difficulty]} students. ${modeText[mode]}
Respond ONLY with valid JSON — no markdown, no backticks, no preamble.
Schema: {"subject":"","topics":[],"materials":[{"title":"","content":""}],"questions":[{"text":"","choices":[{"option":"A","text":"","isCorrect":false}],"explanation":""}],"flashcards":[{"term":"","definition":""}]}
Return empty arrays for unused modes. Calibrate to ${DIFFICULTY_LABELS[difficulty]}.`;

        let userContent: unknown;
        if (fileBase64 && file) {
            if (file.type.startsWith('image/'))
                userContent = [
                    { type: 'image', source: { type: 'base64', media_type: file.type, data: fileBase64 } },
                    { type: 'text', text: 'Generate study content from these notes.' },
                ];
            else if (file.type === 'application/pdf')
                userContent = [
                    { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBase64 } },
                    { type: 'text', text: 'Generate study content from this document.' },
                ];
            else {
                try { userContent = `Notes:\n${atob(fileBase64)}\n\nGenerate study content.`; }
                catch { userContent = 'Generate study content from the uploaded file.'; }
            }
        } else {
            userContent = `Notes:\n${pasteText}\n\nGenerate study content.`;
        }

        return { system, messages: [{ role: 'user', content: userContent }] };
    }

    const generate = async () => {
        if (!uid) return;
        if (!fileBase64 && !pasteText.trim()) { setError('Upload a file or paste your notes first.'); return; }
        setError(null); setGenerating(true); setContent(null); setSavedId(null);
        setAddedToPlan(false);

        try {
            const u = auth.currentUser;
            if (!u) throw new Error('Not authenticated');
            const idToken = await u.getIdToken();

            const res = await fetch('/api/generate-from-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ ...buildPayload(), difficulty, mode }),
            });

            if (!res.ok) {
                const e = await res.json();
                throw new Error(e.error || 'Generation failed');
            }

            const { content: raw } = await res.json();
            const parsed: GeneratedContent = JSON.parse(raw.replace(/```json|```/g, '').trim());
            setContent(parsed);
            setRemaining(r => r !== null ? Math.max(0, r - 1) : null);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Something went wrong.');
        } finally {
            setGenerating(false);
        }
    };

    // Save to Firestore, then show the add-to-plan modal
    const save = async () => {
        if (!uid || !content) return;
        setSaving(true); setError(null);
        try {
            let fileUrl: string | null = null;
            let storagePath: string | null = null;

            if (file && fileBase64) {
                const storage = getStorage();
                storagePath = `user_uploads/${Date.now()}_${file.name}`;
                const fileRef = storageRef(storage, storagePath);

                const byteChars = atob(fileBase64);
                const byteArr = new Uint8Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);

                const snapshot = await uploadBytes(fileRef, byteArr, { contentType: file.type });
                fileUrl = await getDownloadURL(snapshot.ref);
            }
            const ref = await addDoc(collection(db, 'user_generated_materials'), {
                userId: uid,
                subjectName: content.subject,
                topics: content.topics,
                materials: content.materials,
                questions: content.questions,
                flashcards: content.flashcards,
                mode,
                difficulty,
                sourceFileUrl: fileUrl,
                createdAt: serverTimestamp(),
                sourceType: file ? 'file' : 'text',
                sourceFileName: file?.name ?? null,
            });
            await incrementGenerationCount(uid);
            setSavedId(ref.id);
            setShowAddToPlan(true);
        } catch (e: any) {
            console.error(e);
            setError('Failed to save — please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Mark the saved material as "add to plan" by updating its Firestore doc
    const handleAddToPlan = async () => {
        if (!uid || !savedId) return;
        setAddingToPlan(true);
        try {
            await setDoc(
                doc(db, 'user_generated_materials', savedId),
                { addedToPlan: true, addedToPlanAt: serverTimestamp() },
                { merge: true }
            );
            setAddedToPlan(true);
        } catch (e) {
            console.error('Failed to mark add to plan:', e);
        } finally {
            setAddingToPlan(false);
            setShowAddToPlan(false);
        }
    };

    const canGenerate = !generating && remaining !== 0 && (!!fileBase64 || !!pasteText.trim());

    return (
        <>
            {/* Add-to-plan modal */}
            {showAddToPlan && content && (
                <AddToPlanModal
                    subjectName={content.subject}
                    adding={addingToPlan}
                    onConfirm={handleAddToPlan}
                    onSkip={() => setShowAddToPlan(false)}
                />
            )}

            <div style={{ colorScheme: 'light', fontFamily: "'Inter', system-ui, sans-serif", height: '100%' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: content ? '360px 1fr' : '1fr',
                    height: '100%',
                    transition: 'grid-template-columns 0.25s ease',
                }}>

                    {/* ════ LEFT — Upload panel ════ */}
                    <div style={{
                        padding: '28px 24px',
                        borderRight: content ? '1px solid #E5E7EB' : 'none',
                        overflowY: 'auto',
                        background: '#FAFAFA',
                    }}>

                        <div style={{ marginBottom: 22 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                                    }}>📎</div>
                                    <h2 style={{ fontSize: 16, fontWeight: 500, color: '#111827', margin: 0 }}>
                                        Generate from notes
                                    </h2>
                                </div>
                                <div>
                                    <Link
                                        href="/dashboard/generated_material"
                                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                    >
                                        Materials
                                    </Link>
                                </div>
                            </div>
                            <p style={{ fontSize: 12.5, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>
                                Upload a PDF, photo, or paste text — create study materials saved to your account.
                            </p>
                        </div>

                        <RateLimitBar remaining={remaining} limit={dailyLimit} isPro={isPro} />

                        {/* Drop zone */}
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={e => {
                                e.preventDefault(); setIsDragging(false);
                                e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]);
                            }}
                            onClick={() => !file && fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${isDragging ? '#3B82F6' : '#D1D5DB'}`,
                                borderRadius: 12,
                                padding: file ? '12px 14px' : '24px 14px',
                                textAlign: 'center',
                                cursor: file ? 'default' : 'pointer',
                                background: isDragging ? '#EFF6FF' : '#fff',
                                transition: 'all 0.2s',
                                marginBottom: 14,
                            }}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
                                style={{ display: 'none' }}
                                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />

                            {file ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{
                                            width: 34, height: 34, borderRadius: 8, background: '#EFF6FF',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
                                        }}>
                                            {file.type === 'application/pdf' ? '📄' : file.type.startsWith('image/') ? '🖼️' : '📃'}
                                        </div>
                                        <div style={{ textAlign: 'left', minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                                                {file.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                                                {(file.size / 1024).toFixed(0)} KB
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); clearFile(); }}
                                        style={{
                                            background: '#F3F4F6', border: 'none', borderRadius: 6,
                                            width: 26, height: 26, cursor: 'pointer',
                                            fontSize: 12, color: '#6B7280', flexShrink: 0,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}
                                    >✕</button>
                                </div>
                            ) : (
                                <>
                                    <div style={{ fontSize: 26, marginBottom: 6, opacity: 0.45 }}>☁️</div>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 3 }}>
                                        Drop here or <span style={{ color: '#3B82F6' }}>browse</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                                        PDF, image or .txt · max {MAX_FILE_SIZE_MB}MB
                                    </div>
                                </>
                            )}
                        </div>

                        {!file && (
                            <div style={{ marginBottom: 18 }}>
                                <label style={s.sectionLabel}>Or paste notes</label>
                                <textarea
                                    value={pasteText}
                                    onChange={e => setPasteText(e.target.value)}
                                    rows={4}
                                    placeholder="Paste your notes, textbook excerpt, or any study content…"
                                    style={{
                                        width: '100%', fontSize: 12.5, borderRadius: 8,
                                        border: '1px solid #E5E7EB', padding: '9px 11px',
                                        background: '#fff', color: '#111827',
                                        resize: 'vertical', lineHeight: 1.6,
                                        outline: 'none', boxSizing: 'border-box',
                                        fontFamily: 'inherit',
                                    }}
                                />
                            </div>
                        )}

                        <div style={{ marginBottom: 18 }}>
                            <label style={s.sectionLabel}>What to generate</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                                {MODE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setMode(opt.value)}
                                        style={{
                                            background: mode === opt.value ? opt.color : '#fff',
                                            border: `1.5px solid ${mode === opt.value ? '#3B82F6' : '#E5E7EB'}`,
                                            borderRadius: 10, padding: '10px 11px',
                                            cursor: 'pointer', textAlign: 'left',
                                            transition: 'all 0.15s', fontFamily: 'inherit',
                                        }}
                                    >
                                        <div style={{ fontSize: 17, marginBottom: 4 }}>{opt.icon}</div>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: '#111827', marginBottom: 1 }}>{opt.label}</div>
                                        <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.35 }}>{opt.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                            <div style={{ flex: 1 }}>
                                <label style={s.sectionLabel}>Difficulty</label>
                                <Select value={difficulty} onValueChange={v => setDifficulty(v as DifficultyLevel)}>
                                    <SelectTrigger className="w-full text-sm h-9"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Level</SelectLabel>
                                            {Object.entries(DIFFICULTY_LABELS).map(([v, l]) => (
                                                <SelectItem key={v} value={v}>{l}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(mode === 'both' || mode === 'questions' || mode === 'flashcards') && (
                                <div style={{ width: 100 }}>
                                    <label style={s.sectionLabel}>
                                        {mode === 'flashcards' ? 'Cards' : 'Questions'}
                                    </label>
                                    <Select value={String(questionCount)} onValueChange={v => setQuestionCount(Number(v))}>
                                        <SelectTrigger className="w-full text-sm h-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                {Array.from({ length: 8 }, (_, i) => i + 3).map(n => (
                                                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {error && (
                            <div style={{
                                background: '#FEF2F2', border: '1px solid #FECACA',
                                borderRadius: 8, padding: '9px 12px',
                                fontSize: 12.5, color: '#DC2626', marginBottom: 14,
                                display: 'flex', gap: 7, alignItems: 'flex-start',
                            }}>
                                <span style={{ flexShrink: 0 }}>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            onClick={generate}
                            disabled={!canGenerate}
                            style={{
                                width: '100%', padding: '11px',
                                fontSize: 13.5, fontWeight: 500, borderRadius: 10, border: 'none',
                                background: canGenerate
                                    ? 'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)'
                                    : '#E5E7EB',
                                color: canGenerate ? '#fff' : '#9CA3AF',
                                cursor: canGenerate ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s', fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {generating ? <><LoadingSpinner color="#fff" size={15} />Generating…</> : '✨ Generate study materials'}
                        </button>
                    </div>

                    {/* ════ RIGHT — Viewer ════ */}
                    {content && (
                        <GeneratedViewer
                            content={content}
                            mode={mode}
                            difficulty={difficulty}
                            savedId={savedId}
                            saving={saving}
                            addedToPlan={addedToPlan}
                            onSave={save}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

// ─── Generated Viewer ─────────────────────────────────────────────────────────

function GeneratedViewer({
                             content, difficulty, savedId, saving, addedToPlan, onSave,
                         }: {
    content: GeneratedContent;
    mode: GenerationMode;
    difficulty: DifficultyLevel;
    savedId: string | null;
    saving: boolean;
    addedToPlan: boolean;
    onSave: () => void;
}) {
    const tabs: { key: ViewerTab; label: string; count: number; available: boolean }[] = [
        { key: 'notes',      label: 'Study Notes', count: content.materials.length,  available: content.materials.length > 0 },
        { key: 'questions',  label: 'Quiz',        count: content.questions.length,   available: content.questions.length > 0 },
        { key: 'flashcards', label: 'Flashcards',  count: content.flashcards.length,  available: content.flashcards.length > 0 },
    ].filter(t => t.available) as { key: ViewerTab; label: string; count: number; available: boolean }[];

    const [activeTab, setActiveTab] = useState<ViewerTab>(tabs[0]?.key ?? 'notes');
    const [answers, setAnswers]     = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [flipped, setFlipped]     = useState<Record<number, boolean>>({});

    const score = submitted
        ? content.questions.filter((q, i) => q.choices.find(c => c.isCorrect)?.option === answers[i]).length
        : 0;
    const pct = content.questions.length ? Math.round((score / content.questions.length) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', background: '#fff' }}>

            {/* Sticky header */}
            <div style={{
                padding: '18px 24px 0',
                borderBottom: '1px solid #E5E7EB',
                background: '#fff',
                position: 'sticky', top: 0, zIndex: 2,
            }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 500, color: '#111827', margin: '0 0 7px', lineHeight: 1.3 }}>
                            {content.subject}
                        </h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            <span style={{ ...s.pill, background: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' }}>
                                {DIFFICULTY_LABELS[difficulty]}
                            </span>
                            {content.topics.slice(0, 3).map(t => (
                                <span key={t} style={{ ...s.pill, background: '#F9FAFB', color: '#6B7280', borderColor: '#E5E7EB' }}>{t}</span>
                            ))}
                        </div>
                    </div>

                    {/* Save / saved state — shows "added to plan" badge when applicable */}
                    {!savedId ? (
                        <button
                            onClick={onSave}
                            disabled={saving}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 14px', fontSize: 12, fontWeight: 500,
                                borderRadius: 8, border: 'none',
                                cursor: saving ? 'not-allowed' : 'pointer',
                                background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
                                color: '#fff', flexShrink: 0, opacity: saving ? 0.7 : 1,
                                fontFamily: 'inherit', whiteSpace: 'nowrap',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {saving ? <LoadingSpinner color="#fff" size={12} /> : '💾'}
                            {saving ? 'Saving…' : 'Save to account'}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 12px', fontSize: 12, fontWeight: 500,
                                borderRadius: 8, background: '#F0FDF4', color: '#16A34A',
                                border: '1px solid #BBF7D0', whiteSpace: 'nowrap',
                            }}>
                                ✓ Saved
                            </div>
                            {addedToPlan && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    padding: '4px 10px', fontSize: 11, fontWeight: 500,
                                    borderRadius: 8, background: '#EFF6FF', color: '#1D4ED8',
                                    border: '1px solid #BFDBFE', whiteSpace: 'nowrap',
                                }}>
                                    📅 Added to plan
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '8px 16px 11px',
                                fontSize: 13, fontWeight: activeTab === tab.key ? 600 : 400,
                                color: activeTab === tab.key ? '#1D4ED8' : '#6B7280',
                                background: 'none', border: 'none', cursor: 'pointer',
                                borderBottom: `2px solid ${activeTab === tab.key ? '#3B82F6' : 'transparent'}`,
                                fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', gap: 6,
                                transition: 'all 0.15s',
                            }}
                        >
                            {tab.label}
                            {tab.count > 0 && (
                                <span style={{
                                    fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 20,
                                    background: activeTab === tab.key ? '#EFF6FF' : '#F3F4F6',
                                    color: activeTab === tab.key ? '#1D4ED8' : '#9CA3AF',
                                }}>{tab.count}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content area */}
            <div style={{ padding: '20px 24px', flex: 1 }}>

                {activeTab === 'notes' && content.materials.map((m, i) => (
                    <div key={i} style={{ ...s.card, marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
                            <h4 style={{ fontSize: 13.5, fontWeight: 500, color: '#111827', margin: 0 }}>{m.title}</h4>
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.75, margin: 0, fontWeight: 300 }}>{m.content}</p>
                    </div>
                ))}

                {activeTab === 'questions' && (
                    <>
                        {submitted && (
                            <div style={{
                                background: pct >= 70 ? '#F0FDF4' : '#FEF2F2',
                                border: `1px solid ${pct >= 70 ? '#BBF7D0' : '#FECACA'}`,
                                borderRadius: 12, padding: '14px 18px', marginBottom: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <div>
                                    <div style={{ fontSize: 20, fontWeight: 500, color: pct >= 70 ? '#16A34A' : '#DC2626' }}>
                                        {score}/{content.questions.length} · {pct}%
                                    </div>
                                    <div style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                                        {pct === 100 ? '🎉 Perfect score!'
                                            : pct >= 70 ? 'Good effort — review the ones you missed.'
                                                : "Keep revising — you'll get there!"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => { setAnswers({}); setSubmitted(false); }}
                                    style={{
                                        padding: '7px 14px', fontSize: 12, fontWeight: 600,
                                        borderRadius: 8, border: '1px solid #E5E7EB',
                                        background: '#fff', color: '#374151', cursor: 'pointer', fontFamily: 'inherit',
                                    }}
                                >↺ Retry</button>
                            </div>
                        )}

                        {content.questions.map((q, i) => {
                            return (
                                <div key={i} style={{ ...s.card, marginBottom: 12 }}>
                                    <div style={{ fontSize: 10.5, fontWeight: 500, color: '#3B82F6', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                        Question {i + 1}
                                    </div>
                                    <p style={{ fontSize: 13.5, fontWeight: 500, color: '#111827', lineHeight: 1.55, margin: '0 0 12px' }}>
                                        {q.text}
                                    </p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                        {q.choices.map(c => {
                                            const isSelected = answers[i] === c.option;
                                            const isCorrect  = submitted && c.isCorrect;
                                            const isWrong    = submitted && isSelected && !c.isCorrect;
                                            return (
                                                <button
                                                    key={c.option}
                                                    onClick={() => !submitted && setAnswers(a => ({ ...a, [i]: c.option }))}
                                                    style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: 10,
                                                        padding: '9px 12px', borderRadius: 8,
                                                        cursor: submitted ? 'default' : 'pointer',
                                                        border: isCorrect  ? '1.5px solid #86EFAC'
                                                            : isWrong    ? '1.5px solid #FCA5A5'
                                                                : isSelected ? '1.5px solid #93C5FD'
                                                                    : '1px solid #E5E7EB',
                                                        background: isCorrect ? '#F0FDF4' : isWrong ? '#FEF2F2' : isSelected ? '#EFF6FF' : '#FAFAFA',
                                                        textAlign: 'left', fontFamily: 'inherit', width: '100%',
                                                        transition: 'all 0.12s',
                                                    }}
                                                >
                                                    <span style={{
                                                        fontSize: 10, fontWeight: 500, minWidth: 20, height: 20,
                                                        borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                        background: isCorrect ? '#16A34A' : isWrong ? '#DC2626' : isSelected ? '#3B82F6' : '#E5E7EB',
                                                        color: (isCorrect || isWrong || isSelected) ? '#fff' : '#6B7280',
                                                    }}>{c.option}</span>
                                                    <span style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.5, paddingTop: 1 }}>{c.text}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {submitted && q.explanation && (
                                        <div style={{
                                            marginTop: 11, padding: '9px 12px', borderRadius: 8,
                                            background: '#FFFBEB', border: '1px solid #FDE68A',
                                            fontSize: 12, color: '#92400E', lineHeight: 1.6,
                                        }}>
                                            💡 {q.explanation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {!submitted && (
                            <button
                                onClick={() => setSubmitted(true)}
                                disabled={Object.keys(answers).length < content.questions.length}
                                style={{
                                    width: '100%', padding: '11px', fontSize: 13, fontWeight: 500,
                                    borderRadius: 10, border: 'none', fontFamily: 'inherit',
                                    background: Object.keys(answers).length === content.questions.length
                                        ? 'linear-gradient(135deg, #1D4ED8, #3B82F6)' : '#E5E7EB',
                                    color: Object.keys(answers).length === content.questions.length ? '#fff' : '#9CA3AF',
                                    cursor: Object.keys(answers).length === content.questions.length ? 'pointer' : 'not-allowed',
                                    letterSpacing: '-0.01em',
                                }}
                            >
                                Submit · {Object.keys(answers).length}/{content.questions.length} answered
                            </button>
                        )}
                    </>
                )}

                {activeTab === 'flashcards' && (
                    <>
                        <p style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12, marginTop: 0 }}>
                            Click a card to flip it.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                            {content.flashcards.map((f, i) => (
                                <button
                                    key={i}
                                    onClick={() => setFlipped(p => ({ ...p, [i]: !p[i] }))}
                                    style={{
                                        borderRadius: 12, padding: '14px',
                                        border: flipped[i] ? '1.5px solid #93C5FD' : '1px solid #E5E7EB',
                                        background: flipped[i] ? '#EFF6FF' : '#FAFAFA',
                                        cursor: 'pointer', textAlign: 'left',
                                        minHeight: 80, fontFamily: 'inherit',
                                        transition: 'all 0.2s', width: '100%',
                                    }}
                                >
                                    {flipped[i] ? (
                                        <>
                                            <div style={{ fontSize: 9.5, fontWeight: 500, color: '#3B82F6', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Definition</div>
                                            <div style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.6 }}>{f.definition}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 9.5, fontWeight: 500, color: '#9CA3AF', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Term</div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.45 }}>{f.term}</div>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setFlipped({})}
                            style={{
                                marginTop: 12, padding: '7px 14px', fontSize: 12, fontWeight: 500,
                                borderRadius: 8, border: '1px solid #E5E7EB',
                                background: '#fff', color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                        >Reset all</button>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Rate limit bar ───────────────────────────────────────────────────────────

function RateLimitBar({ remaining, limit, isPro }: { remaining: number | null; limit: number; isPro: boolean }) {
    const used      = remaining !== null ? limit - remaining : 0;
    const rem       = remaining ?? limit;
    const exhausted = rem === 0;
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: exhausted ? '#FEF2F2' : '#F9FAFB',
            border: `1px solid ${exhausted ? '#FECACA' : '#E5E7EB'}`,
            borderRadius: 10, padding: '9px 13px', marginBottom: 18,
        }}>
            <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
                    <div key={i} style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: i < used ? (exhausted ? '#EF4444' : '#F59E0B') : '#22C55E',
                    }} />
                ))}
            </div>
            <span style={{ fontSize: 12, color: exhausted ? '#DC2626' : '#6B7280', flex: 1 }}>
                {exhausted
                    ? <strong>Limit reached — resets midnight</strong>
                    : <><strong style={{ color: '#111827' }}>{rem}/{limit}</strong> left today</>}
            </span>
            {isPro && (
                <span style={{
                    fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20,
                    background: '#EFF6FF', color: '#1D4ED8', letterSpacing: '0.04em',
                }}>PRO</span>
            )}
        </div>
    );
}

function LoadingSpinner({ color = '#6B7280', size = 18 }: { color?: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
             style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round" />
        </svg>
    );
}

const s = {
    sectionLabel: {
        fontSize: 10.5, fontWeight: 500, color: '#6B7280',
        display: 'block', marginBottom: 6,
        textTransform: 'uppercase', letterSpacing: '0.06em',
    } as React.CSSProperties,
    pill: {
        display: 'inline-block', fontSize: 11, fontWeight: 500,
        padding: '2px 9px', borderRadius: 20, border: '1px solid transparent',
    } as React.CSSProperties,
    card: {
        background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '13px 15px',
    } as React.CSSProperties,
};