'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
    Upload, FileText, Camera, X, Loader2, Sparkles, CheckCircle2,
    AlertCircle, RotateCcw, ChevronDown, ChevronUp, Coins, ShoppingCart,
} from 'lucide-react';

const MAX_FILE_SIZE_MB = 15;

interface SolvedResult {
    id: string;
    subject: string;
    topic: string;
    questionText: string;
    difficulty: 'easy' | 'medium' | 'hard';
    solution: string;
    shortAnswer: string;
}

interface HistoryItem extends SolvedResult {
    completed: boolean;
    createdAt: string | null;
    fileUrl: string | null;
}

interface Quota {
    freeUsed: number;
    freeLimit: number;
    purchasedCredits: number;
    remaining: number;
}

export default function AskAIPage() {
    const [uid, setUid] = useState<string | null>(null);

    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Camera capture state
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [solving, setSolving] = useState(false);
    const [result, setResult] = useState<SolvedResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const [quota, setQuota] = useState<Quota | null>(null);
    const [buyingCredits, setBuyingCredits] = useState(false);

    useEffect(() => {
        const u = auth.currentUser;
        if (!u) return;
        setUid(u.uid);
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const u = auth.currentUser;
        if (!u) return;
        setLoadingHistory(true);
        try {
            const idToken = await u.getIdToken();
            const res = await fetch('/api/uploaded-questions', {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data.questions || []);
                setQuota(data.quota ?? null);
            }
        } catch (err) {
            console.error('Failed to fetch history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    // ── File selection ──────────────────────────────────────────────────────
    const handleFile = useCallback((f: File) => {
        if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
            setError(`Max file size is ${MAX_FILE_SIZE_MB}MB`);
            return;
        }
        setFile(f);
        setError(null);
        setResult(null);
        if (f.type.startsWith('image/')) {
            setPreviewUrl(URL.createObjectURL(f));
        } else {
            setPreviewUrl(null);
        }
    }, []);

    const clearFile = () => {
        setFile(null);
        setPreviewUrl(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // ── Camera capture (desktop webcam via getUserMedia) ────────────────────
    const openCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            setIsCameraOpen(true);
            // Wait for video element to mount, then attach stream.
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 0);
        } catch (err) {
            console.error('Camera access failed:', err);
            setError('Could not access camera. You can still upload a photo from your device.');
        }
    };

    const closeCamera = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (!blob) return;
            const capturedFile = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
            handleFile(capturedFile);
            closeCamera();
        }, 'image/jpeg', 0.92);
    };

    useEffect(() => {
        // Clean up camera stream if the component unmounts while open.
        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    // ── Buy more credits ─────────────────────────────────────────────────────
    const buyMoreCredits = async () => {
        const u = auth.currentUser;
        if (!u) return;
        setBuyingCredits(true);
        try {
            const idToken = await u.getIdToken();
            const res = await fetch('/api/stripe/ask-ai-credits/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ packQuantity: 1 }),
            });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                setError('Could not start checkout. Please try again.');
            }
        } catch {
            setError('Could not start checkout. Please try again.');
        } finally {
            setBuyingCredits(false);
        }
    };

    // ── Submit for solving ───────────────────────────────────────────────────
    const submitQuestion = async () => {
        if (!uid || !file) return;
        setSolving(true);
        setError(null);
        setResult(null);

        try {
            const u = auth.currentUser;
            if (!u) throw new Error('Not authenticated');

            // Client uploads to Storage first (matches the pattern used
            // elsewhere in this app) — the API route only needs the path.
            const storage = getStorage();
            const storagePath = `uploaded_questions/${uid}/${Date.now()}_${file.name}`;
            const fileRef = storageRef(storage, storagePath);
            const snapshot = await uploadBytes(fileRef, file, { contentType: file.type });
            const fileUrl = await getDownloadURL(snapshot.ref);

            const idToken = await u.getIdToken();
            const res = await fetch('/api/uploaded-questions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ storagePath, fileUrl, contentType: file.type }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.quota) setQuota(data.quota);
                throw new Error(data.error || 'Failed to solve question');
            }

            setResult(data);
            if (data.quota) setQuota(data.quota);
            fetchHistory();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong.');
        } finally {
            setSolving(false);
        }
    };

    const toggleCompleted = async (item: HistoryItem) => {
        const u = auth.currentUser;
        if (!u) return;
        const newCompleted = !item.completed;

        // Optimistic update
        setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, completed: newCompleted } : h)));

        try {
            const idToken = await u.getIdToken();
            await fetch('/api/uploaded-questions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ id: item.id, completed: newCompleted }),
            });
        } catch (err) {
            console.error('Failed to update question status:', err);
            // Revert on failure
            setHistory((prev) => prev.map((h) => (h.id === item.id ? { ...h, completed: item.completed } : h)));
        }
    };

    const difficultyColor: Record<string, string> = {
        easy: 'bg-green-100 text-green-700',
        medium: 'bg-amber-100 text-amber-700',
        hard: 'bg-red-100 text-red-700',
    };

    const outOfCredits = quota !== null && quota.remaining <= 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ════ Upload card ════ */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        Ask AI — Stuck on a Question?
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm">
                        Upload a photo or PDF of any question you're stuck on. The AI will solve it, and the topic
                        will automatically show up in your next study plan.
                    </p>

                    {/* Quota banner */}
                    {quota && (
                        <div className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-sm ${
                            outOfCredits ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
                        }`}>
                            <div className="flex items-center gap-2 text-gray-700">
                                <Coins className={`w-4 h-4 flex-shrink-0 ${outOfCredits ? 'text-amber-600' : 'text-blue-600'}`} />
                                <span>
                                    {outOfCredits ? (
                                        <span className="font-medium text-amber-800">You've used all your uploads this month</span>
                                    ) : (
                                        <>
                                            <span className="font-medium text-gray-900">{quota.remaining}</span> upload
                                            {quota.remaining === 1 ? '' : 's'} left
                                            {quota.purchasedCredits > 0 && (
                                                <span className="text-gray-500"> ({quota.purchasedCredits} purchased)</span>
                                            )}
                                        </>
                                    )}
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="cursor-pointer flex-shrink-0"
                                onClick={buyMoreCredits}
                                disabled={buyingCredits}
                            >
                                {buyingCredits ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <><ShoppingCart className="w-3.5 h-3.5 mr-1.5" />Buy 10 more — £4.99</>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* Camera view */}
                    {isCameraOpen ? (
                        <div className="space-y-3">
                            <video ref={videoRef} autoPlay playsInline className="w-full rounded-lg border border-gray-200 bg-black" />
                            <div className="flex gap-2">
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 cursor-pointer" onClick={capturePhoto}>
                                    <Camera className="w-4 h-4 mr-2" /> Capture
                                </Button>
                                <Button variant="outline" className="cursor-pointer" onClick={closeCamera}>
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); if (!outOfCredits) setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault(); setIsDragging(false);
                                    if (outOfCredits) return;
                                    e.dataTransfer.files[0] && handleFile(e.dataTransfer.files[0]);
                                }}
                                onClick={() => !file && !outOfCredits && fileInputRef.current?.click()}
                                className={`rounded-lg border-2 border-dashed transition-colors ${
                                    outOfCredits ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' :
                                        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
                                } ${file ? 'p-3 cursor-default' : 'p-6 cursor-pointer hover:border-gray-400'}`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    capture="environment"
                                    className="hidden"
                                    disabled={outOfCredits}
                                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                                />

                                {file ? (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                    <FileText className="w-5 h-5 text-blue-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-gray-900 truncate max-w-[200px]">{file.name}</div>
                                                    <div className="text-xs text-gray-600">{(file.size / 1024).toFixed(0)} KB</div>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={(e) => { e.stopPropagation(); clearFile(); }}>
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                        {previewUrl && (
                                            <img src={previewUrl} alt="Preview" className="max-h-48 rounded-lg border border-gray-200 mx-auto" />
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <Upload className="w-7 h-7 text-gray-400 mx-auto mb-2" />
                                        <div className="text-sm font-semibold text-gray-900">
                                            {outOfCredits ? 'Buy more uploads to continue' : (
                                                <>Drop a photo or PDF here or <span className="text-blue-600">browse</span></>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-600 mt-1">Photo or PDF · max {MAX_FILE_SIZE_MB}MB</div>
                                    </div>
                                )}
                            </div>

                            {!file && !outOfCredits && (
                                <Button variant="outline" className="w-full cursor-pointer" onClick={openCamera}>
                                    <Camera className="w-4 h-4 mr-2" /> Use Camera
                                </Button>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-300 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-700 mt-0.5 flex-shrink-0" />
                            <p className="text-sm font-medium text-red-700">{error}</p>
                        </div>
                    )}

                    {file && !isCameraOpen && (
                        <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
                            onClick={submitQuestion}
                            disabled={solving || outOfCredits}
                        >
                            {solving ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Solving...</>
                            ) : (
                                <><Sparkles className="w-4 h-4 mr-2" />Solve This Question</>
                            )}
                        </Button>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="p-4 rounded-lg border border-green-200 bg-green-50 space-y-3">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="font-semibold text-green-900">Solved!</span>
                                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${difficultyColor[result.difficulty]}`}>
                                    {result.difficulty}
                                </span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{result.subject} · {result.topic}</p>
                                <p className="text-sm text-gray-900 mt-1">{result.questionText}</p>
                            </div>
                            <div className="pt-2 border-t border-green-200">
                                <p className="text-sm font-semibold text-gray-900 mb-1">Answer: {result.shortAnswer}</p>
                                <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{result.solution}</p>
                            </div>
                            <p className="text-xs text-green-700">
                                This topic has been added to your study plan for extra practice.
                            </p>
                            <Button variant="outline" size="sm" className="cursor-pointer" onClick={clearFile}>
                                <RotateCcw className="w-4 h-4 mr-2" /> Ask another question
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ════ History ════ */}
            <Card>
                <CardHeader>
                    <CardTitle>Previous Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {loadingHistory ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    ) : history.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">
                            No questions uploaded yet. Ask your first one!
                        </p>
                    ) : (
                        history.map((item) => (
                            <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                                    className="w-full flex items-center justify-between gap-3 p-3 hover:bg-gray-50 transition-colors cursor-pointer text-left"
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{item.topic}</p>
                                        <p className="text-xs text-gray-500">{item.subject}</p>
                                    </div>
                                    {item.completed && <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />}
                                    {expandedId === item.id ? (
                                        <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    )}
                                </button>

                                {expandedId === item.id && (
                                    <div className="p-3 border-t border-gray-200 bg-gray-50 space-y-2">
                                        <p className="text-sm text-gray-800">{item.questionText}</p>
                                        <p className="text-sm font-medium text-gray-900">Answer: {item.shortAnswer}</p>
                                        <p className="text-sm text-gray-700 whitespace-pre-line">{item.solution}</p>
                                        <label className="flex items-center gap-2 text-sm text-gray-700 pt-1 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={item.completed}
                                                onChange={() => toggleCompleted(item)}
                                                className="cursor-pointer"
                                            />
                                            I understand this now (stop showing in study plan)
                                        </label>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}