'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { addDoc, collection, doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import Link from 'next/link';
import {
    Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/app/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
    Upload, FileText, Sparkles, Save, CalendarPlus, Check, Loader2,
    Layers, HelpCircle, Copy, BookOpen, X, RotateCcw, AlertCircle,
} from 'lucide-react';

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

const MODE_OPTIONS: { value: GenerationMode; label: string; description: string; icon: typeof Layers }[] = [
    { value: 'both',       label: 'Full package',     description: 'Study notes + quiz questions', icon: Layers },
    { value: 'materials',  label: 'Study notes only', description: 'Summaries & key concepts',     icon: BookOpen },
    { value: 'questions',  label: 'Questions only',   description: 'MCQ quiz questions',           icon: HelpCircle },
    { value: 'flashcards', label: 'Flashcards',       description: 'Term & definition pairs',      icon: Copy },
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <Card className="max-w-sm w-full">
                <CardContent className="pt-6 space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                        <CalendarPlus className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-900">Add to your study plan?</h3>
                        <p className="text-sm text-gray-800 leading-relaxed">
                            Your <span className="font-semibold text-gray-900">{subjectName}</span> materials have been
                            saved. Would you like to add this subject to your daily study plan so it shows up in your
                            schedule?
                        </p>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <Button variant="outline" className="flex-1 cursor-pointer" onClick={onSkip} disabled={adding}>
                            Skip for now
                        </Button>
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700 cursor-pointer" onClick={onConfirm} disabled={adding}>
                            {adding ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>
                            ) : (
                                <><Check className="w-4 h-4 mr-2" />Yes, add to plan</>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* ════ Upload / setup card ════ */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="w-5 h-5 text-blue-600" />
                            Generate from Notes
                        </CardTitle>
                        <Link
                            href="/dashboard/generated_material"
                            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                        >
                            My Materials
                        </Link>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <p className="text-gray-800">
                            Upload a PDF, photo, or paste text to create study materials saved to your account.
                        </p>

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
                            className={`rounded-lg border-2 border-dashed transition-colors ${
                                isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                            } ${file ? 'p-3 cursor-default' : 'p-6 cursor-pointer hover:border-gray-400'}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
                                className="hidden"
                                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
                            />

                            {file ? (
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</div>
                                            <div className="text-xs font-medium text-gray-600">{(file.size / 1024).toFixed(0)} KB</div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="cursor-pointer"
                                        onClick={e => { e.stopPropagation(); clearFile(); }}
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                                    <div className="text-sm font-semibold text-gray-900">
                                        Drop a file here or <span className="text-blue-600">browse</span>
                                    </div>
                                    <div className="text-xs font-medium text-gray-600 mt-1">
                                        PDF, image or .txt · max {MAX_FILE_SIZE_MB}MB
                                    </div>
                                </div>
                            )}
                        </div>

                        {!file && (
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-900">Or paste notes</label>
                                <textarea
                                    value={pasteText}
                                    onChange={e => setPasteText(e.target.value)}
                                    rows={4}
                                    placeholder="Paste your notes, textbook excerpt, or any study content…"
                                    className="w-full text-sm rounded-md border border-gray-300 p-3 text-gray-900 leading-relaxed resize-y outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        )}

                        {/* Mode selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-900">What to generate</label>
                            <div className="grid grid-cols-2 gap-2">
                                {MODE_OPTIONS.map(opt => {
                                    const Icon = opt.icon;
                                    const selected = mode === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            onClick={() => setMode(opt.value)}
                                            className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                                                selected
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                            }`}
                                        >
                                            <Icon className={`w-5 h-5 ${selected ? 'text-blue-600' : 'text-gray-500'}`} />
                                            <span className="text-sm font-semibold text-gray-900">{opt.label}</span>
                                            <span className="text-xs text-gray-600 leading-snug">{opt.description}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Difficulty + count */}
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-2">
                                <label className="text-sm font-semibold text-gray-900">Difficulty</label>
                                <Select value={difficulty} onValueChange={v => setDifficulty(v as DifficultyLevel)}>
                                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                                <div className="w-28 space-y-2">
                                    <label className="text-sm font-semibold text-gray-900">
                                        {mode === 'flashcards' ? 'Cards' : 'Questions'}
                                    </label>
                                    <Select value={String(questionCount)} onValueChange={v => setQuestionCount(Number(v))}>
                                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                            <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-medium text-red-700">{error}</p>
                            </div>
                        )}

                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
                            onClick={generate}
                            disabled={!canGenerate}
                        >
                            {generating ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" />Generate study materials</>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* ════ Generated viewer ════ */}
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
    const tabs = ([
        { key: 'notes',      label: 'Study Notes', count: content.materials.length },
        { key: 'questions',  label: 'Quiz',        count: content.questions.length },
        { key: 'flashcards', label: 'Flashcards',  count: content.flashcards.length },
    ] as { key: ViewerTab; label: string; count: number }[]).filter(t => t.count > 0);

    const [activeTab, setActiveTab] = useState<ViewerTab>(tabs[0]?.key ?? 'notes');
    const [answers, setAnswers]     = useState<Record<number, string>>({});
    const [submitted, setSubmitted] = useState(false);
    const [flipped, setFlipped]     = useState<Record<number, boolean>>({});

    const score = submitted
        ? content.questions.filter((q, i) => q.choices.find(c => c.isCorrect)?.option === answers[i]).length
        : 0;
    const pct = content.questions.length ? Math.round((score / content.questions.length) * 100) : 0;
    const answeredCount = Object.keys(answers).length;

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="text-xl">{content.subject}</CardTitle>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                {DIFFICULTY_LABELS[difficulty]}
                            </span>
                            {content.topics.slice(0, 3).map(t => (
                                <span key={t} className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{t}</span>
                            ))}
                        </div>
                    </div>

                    {!savedId ? (
                        <Button className="bg-blue-600 hover:bg-blue-700 cursor-pointer flex-shrink-0" size="sm" onClick={onSave} disabled={saving}>
                            {saving ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" />Save to account</>
                            )}
                        </Button>
                    ) : (
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-200">
                                <Check className="w-3.5 h-3.5" /> Saved
                            </span>
                            {addedToPlan && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    <CalendarPlus className="w-3.5 h-3.5" /> Added to plan
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-200 -mb-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors cursor-pointer border-b-2 -mb-px ${
                                activeTab === tab.key
                                    ? 'border-blue-600 text-blue-700 font-bold'
                                    : 'border-transparent text-gray-700 font-semibold hover:text-gray-900'
                            }`}
                        >
                            {tab.label}
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                activeTab === tab.key ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }`}>{tab.count}</span>
                        </button>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="space-y-3">

                {/* ── Notes ── */}
                {activeTab === 'notes' && content.materials.map((m, i) => (
                    <div key={i} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                            <h4 className="text-sm font-bold text-gray-900">{m.title}</h4>
                        </div>
                        <p className="text-sm text-gray-800 leading-relaxed">{m.content}</p>
                    </div>
                ))}

                {/* ── Quiz ── */}
                {activeTab === 'questions' && (
                    <>
                        {submitted && (
                            <div className={`p-4 rounded-lg border flex items-center justify-between ${
                                pct >= 70 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                            }`}>
                                <div>
                                    <div className={`text-xl font-bold ${pct >= 70 ? 'text-green-800' : 'text-red-700'}`}>
                                        {score}/{content.questions.length} · {pct}%
                                    </div>
                                    <div className="text-sm font-medium text-gray-800 mt-1">
                                        {pct === 100 ? '🎉 Perfect score!'
                                            : pct >= 70 ? 'Good effort — review the ones you missed.'
                                                : "Keep revising — you'll get there!"}
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => { setAnswers({}); setSubmitted(false); }}>
                                    <RotateCcw className="w-4 h-4 mr-2" /> Retry
                                </Button>
                            </div>
                        )}

                        {content.questions.map((q, i) => (
                            <div key={i} className="p-4 border border-gray-200 rounded-lg">
                                <div className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">
                                    Question {i + 1}
                                </div>
                                <p className="text-sm font-semibold text-gray-900 leading-snug mb-3">{q.text}</p>
                                <div className="flex flex-col gap-2">
                                    {q.choices.map(c => {
                                        const isSelected = answers[i] === c.option;
                                        const isCorrect  = submitted && c.isCorrect;
                                        const isWrong    = submitted && isSelected && !c.isCorrect;
                                        const cls = isCorrect ? 'border-green-500 bg-green-50'
                                            : isWrong ? 'border-red-500 bg-red-50'
                                                : isSelected ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-200 bg-gray-50 hover:border-gray-300';
                                        const badge = isCorrect ? 'bg-green-600 text-white'
                                            : isWrong ? 'bg-red-600 text-white'
                                                : isSelected ? 'bg-blue-600 text-white'
                                                    : 'bg-gray-200 text-gray-800';
                                        return (
                                            <button
                                                key={c.option}
                                                onClick={() => !submitted && setAnswers(a => ({ ...a, [i]: c.option }))}
                                                className={`flex items-start gap-3 p-2.5 rounded-lg border text-left w-full transition-colors ${cls} ${submitted ? 'cursor-default' : 'cursor-pointer'}`}
                                            >
                                                <span className={`flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold flex-shrink-0 ${badge}`}>
                                                    {c.option}
                                                </span>
                                                <span className="text-sm text-gray-900 leading-snug">{c.text}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                                {submitted && q.explanation && (
                                    <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-300 text-sm font-medium text-amber-900 leading-relaxed">
                                        💡 {q.explanation}
                                    </div>
                                )}
                            </div>
                        ))}

                        {!submitted && (
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
                                onClick={() => setSubmitted(true)}
                                disabled={answeredCount < content.questions.length}
                            >
                                Submit · {answeredCount}/{content.questions.length} answered
                            </Button>
                        )}
                    </>
                )}

                {/* ── Flashcards ── */}
                {activeTab === 'flashcards' && (
                    <>
                        <p className="text-sm font-medium text-gray-700">Click a card to flip it.</p>
                        <div className="grid grid-cols-2 gap-3">
                            {content.flashcards.map((f, i) => (
                                <button
                                    key={i}
                                    onClick={() => setFlipped(p => ({ ...p, [i]: !p[i] }))}
                                    className={`p-4 rounded-lg border text-left min-h-[80px] w-full transition-colors cursor-pointer ${
                                        flipped[i] ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                    }`}
                                >
                                    {flipped[i] ? (
                                        <>
                                            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-wide mb-1.5">Definition</div>
                                            <div className="text-sm text-blue-900 leading-relaxed">{f.definition}</div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-wide mb-1.5">Term</div>
                                            <div className="text-sm font-bold text-gray-900 leading-snug">{f.term}</div>
                                        </>
                                    )}
                                </button>
                            ))}
                        </div>
                        <Button variant="outline" size="sm" className="cursor-pointer" onClick={() => setFlipped({})}>
                            <RotateCcw className="w-4 h-4 mr-2" /> Reset all
                        </Button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}

// ─── Rate limit bar ───────────────────────────────────────────────────────────

function RateLimitBar({ remaining, limit, isPro }: { remaining: number | null; limit: number; isPro: boolean }) {
    const used      = remaining !== null ? limit - remaining : 0;
    const rem       = remaining ?? limit;
    const exhausted = rem === 0;
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${
            exhausted ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
        }`}>
            <div className="flex gap-1">
                {Array.from({ length: Math.min(limit, 10) }).map((_, i) => (
                    <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                            i < used ? (exhausted ? 'bg-red-500' : 'bg-amber-500') : 'bg-green-500'
                        }`}
                    />
                ))}
            </div>
            <span className={`text-sm font-medium flex-1 ${exhausted ? 'text-red-700' : 'text-gray-700'}`}>
                {exhausted
                    ? <strong>Limit reached — resets midnight</strong>
                    : <><strong className="text-gray-900">{rem}/{limit}</strong> left today</>}
            </span>
            {isPro && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 tracking-wide">PRO</span>
            )}
        </div>
    );
}