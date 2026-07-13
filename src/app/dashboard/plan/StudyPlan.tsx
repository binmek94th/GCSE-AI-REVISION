'use client';

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { MarkdownContent } from "@/app/components/Markdown";
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, ClipboardCheck, ChevronRight } from 'lucide-react';
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Button } from "@/app/components/ui/button";
import { useDashboard } from "@/contexts/DashboardContext";
import { QuizComponent } from "@/app/dashboard/quizzes/QuizComponent";
import { toast } from "sonner";
import ContextualAiChat from "@/app/components/ContextualAiChat";
import { useRouter, useSearchParams } from "next/navigation";
import Spinner from "@/app/components/ui/Spinner";
import { DialogTitle } from "@radix-ui/react-dialog";
import { MaterialQuizModal } from "./MaterialQuizModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Break { after: string; duration: string; type: string; }
interface AssessmentQuestion {
    id: string; question: string; options: Record<string, string> | string[];
    correctAnswer: string; explanation?: string; subject: string;
    materialId: string; materialTitle: string; difficulty: number | string;
}
interface Assessment { totalQuestions: number; questions: AssessmentQuestion[]; bySubject: Record<string, string[]>; }
interface Session {
    difficulty: string; duration: string; focusArea: string;
    materialId: string; materialTitle: string; objectives: string[];
    packId: string; subject: string; timeSlot: string; completed?: boolean;
    material?: { id: string; title: string; content: string; subject?: string; [key: string]: any; };
}
interface Plan { breaks: Break[]; dailyGoal: string; sessions: Session[]; tips: string[]; totalStudyTime: string; }
interface StudyPlan {
    id: string; createdAt: string; date: string; plan: Plan;
    assessment: Assessment; preferences: { hoursPerWeek: string; targetGrade: string; }; status: string;
}

// ─── Display formatting helpers ─────────────────────────────────────────────

// Title-case each word in a string ("review incorrect" → "Review Incorrect").
const toTitleCase = (str: string) =>
    str
        .split(' ')
        .filter(Boolean)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

// Format difficulty for display: strip any "gcse" prefix, swap underscores for
// spaces, then title-case ("gcse_higher" → "Higher", "easy" → "Easy").
const formatDifficulty = (difficulty: string | number) => {
    const cleaned = String(difficulty)
        .replace(/^gcse[_\s]*/i, '')
        .replace(/_/g, ' ')
        .trim();
    return toTitleCase(cleaned);
};

// Format focus area for display ("review_incorrect" → "Review Incorrect").
const formatFocus = (focus: string) => toTitleCase(focus.replace(/_/g, ' '));

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudyPlan() {
    const [studyPlan, setStudyPlan]                       = useState<StudyPlan | null>(null);
    const [loading, setLoading]                            = useState(true);
    const [error, setError]                                = useState<string | null>(null);
    const [authChecked, setAuthChecked]                    = useState(false);
    const [selectedMaterial, setSelectedMaterial]          = useState<Session['material'] & { packId?: string } | null>(null);
    const [showAssessment, setShowAssessment]              = useState<string | null>(null);
    const [completedAssessments, setCompletedAssessments]  = useState<Set<string>>(new Set());
    const [dialogOpen, setDialogOpen]                      = useState(false);

    // ── Quiz-before-done state ────────────────────────────────────────────────
    const [quizModalOpen, setQuizModalOpen]                = useState(false);
    // Holds the materialId/packId we want to mark done once the quiz is over
    const pendingDoneRef = useRef<{ materialId: string; packId: string } | null>(null);

    const { incrementStreak } = useDashboard();
    const searchParams         = useSearchParams();
    const router               = useRouter();
    const studyPlanRef         = useRef<StudyPlan | null>(null);
    const initialLoadDone      = useRef(false);
    const scrollRef            = useRef<HTMLDivElement>(null);

    useEffect(() => { studyPlanRef.current = studyPlan; }, [studyPlan]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [selectedMaterial?.id]);

    useEffect(() => {
        if (!studyPlan || initialLoadDone.current) return;
        initialLoadDone.current = true;
        const materialId = searchParams.get("materialId");
        if (!materialId) return;
        const session = studyPlan.plan.sessions.find(s => s.material?.id === materialId);
        if (session?.material) openMaterial(session);
    }, [studyPlan]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthChecked(true);
            if (!user) { setError('Please sign in to view your study plan'); setLoading(false); return; }
            try {
                const idToken = await user.getIdToken();
                const response = await fetch('/api/study-plan', { headers: { 'Authorization': `Bearer ${idToken}` } });
                if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Failed to fetch study plan'); }
                setStudyPlan(await response.json());
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // ─── Navigation helpers ───────────────────────────────────────────────────

    const openMaterial = (session: Session) => {
        if (!session.material) return;
        setSelectedMaterial({ ...session.material, packId: session.packId });
        setDialogOpen(true);
        const params = new URLSearchParams(searchParams.toString());
        params.set("materialId", session.material.id);
        router.push(`?${params.toString()}`);
    };

    const closeMaterial = () => {
        setDialogOpen(false);
        setSelectedMaterial(null);
        const params = new URLSearchParams(window.location.search);
        params.delete("materialId");
        router.replace(`?${params.toString()}`);
    };

    // ─── API calls ────────────────────────────────────────────────────────────

    const fireMarkAsDoneApi = async (materialId: string, packId: string) => {
        try {
            const idToken = await auth.currentUser!.getIdToken();
            await Promise.all([
                fetch("/api/study_materials", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({ packId, materialId, done: true }),
                }),
                fetch("/api/study-plan/mark-completed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({ materialId }),
                }),
            ]);
        } catch (err) {
            console.error("Background mark-done failed:", err);
        }
    };

    // ─── Mark as done — now opens quiz first ─────────────────────────────────

    const handleMarkAsDone = () => {
        if (!selectedMaterial?.id || !auth.currentUser) return;
        // Store what we want to mark done so the quiz callback can use it
        pendingDoneRef.current = {
            materialId: selectedMaterial.id,
            packId: selectedMaterial.packId!,
        };
        setQuizModalOpen(true);
    };

    /**
     * Called by MaterialQuizModal when the student finishes (or skips) the quiz.
     * At this point we actually perform the mark-as-done logic.
     */
    const handleQuizComplete = (score: number, total: number) => {
        setQuizModalOpen(false);

        const pending = pendingDoneRef.current;
        if (!pending) return;
        const { materialId, packId } = pending;
        pendingDoneRef.current = null;

        // Read current sessions before mutation
        const currentSessions = studyPlanRef.current?.plan.sessions ?? [];
        const currentIndex = currentSessions.findIndex(s => s.material?.id === materialId);
        const nextSession = currentSessions
            .slice(currentIndex + 1)
            .find(s => !s.completed && s.material);

        // Optimistically update
        setStudyPlan(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                plan: {
                    ...prev.plan,
                    sessions: prev.plan.sessions.map(s =>
                        s.material?.id === materialId ? { ...s, completed: true } : s
                    ),
                },
            };
        });

        // Navigate
        if (nextSession?.material) {
            setSelectedMaterial({ ...nextSession.material, packId: nextSession.packId });
            const params = new URLSearchParams(window.location.search);
            params.set("materialId", nextSession.material.id);
            router.replace(`?${params.toString()}`);
        } else {
            setDialogOpen(false);
            setSelectedMaterial(null);
            const params = new URLSearchParams(window.location.search);
            params.delete("materialId");
            router.replace(`?${params.toString()}`);
        }

        fireMarkAsDoneApi(materialId, packId);
        incrementStreak();

        if (total > 0) {
            const pct = Math.round((score / total) * 100);
            toast.success(`Marked as done! You scored ${score}/${total} (${pct}%) 🎯`);
        } else {
            toast.success("Marked as done!");
        }
    };

    const handleQuizCancel = () => {
        setQuizModalOpen(false);
        pendingDoneRef.current = null;
    };

    // ─── Misc helpers ─────────────────────────────────────────────────────────

    const getDuration = (duration: string) => {
        const match = duration.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    };

    const handleAssessmentComplete = (score: number, correctCount: number, totalCount: number) => {
        if (showAssessment) setCompletedAssessments(prev => new Set([...prev, showAssessment]));
    };

    // ─── Loading / error states ───────────────────────────────────────────────

    if (!authChecked || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center"><Spinner size="lg" /></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                        We’re creating your personalized study plan. This may take a little time — please check back soon.
                    </h2>
                    <button onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!studyPlan) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="text-gray-400 text-5xl mb-4">📚</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Study Plan Found</h2>
                    <p className="text-gray-600">No study plan is available for today.</p>
                </div>
            </div>
        );
    }

    const hasAssessment = studyPlan.assessment?.questions?.length > 0;

    // ─── Subject assessment quiz ──────────────────────────────────────────────

    if (showAssessment && hasAssessment) {
        const subjectQuestions = studyPlan.assessment.questions.filter(q => q.subject === showAssessment);
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <Button variant="outline" onClick={() => setShowAssessment(null)} className="mb-4">
                            ← Back to Study Plan
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{showAssessment} Assessment Quiz</h1>
                        <p className="text-gray-600">
                            Test your knowledge with {subjectQuestions.length} questions from your {showAssessment} study materials
                        </p>
                    </div>
                    <QuizComponent
                        questions={subjectQuestions}
                        packId={`${showAssessment}-assessment`}
                        onComplete={handleAssessmentComplete}
                        onExit={() => setShowAssessment(null)}
                    />
                </div>
            </div>
        );
    }

    // ─── Group sessions by subject ────────────────────────────────────────────

    const groupedSessions = studyPlan.plan.sessions.reduce((acc: Record<string, Session[]>, session) => {
        if (!acc[session.subject]) acc[session.subject] = [];
        acc[session.subject].push(session);
        return acc;
    }, {});

    let cumulativeMinutes = 0;
    const sessionGroups = Object.entries(groupedSessions).map(([subject, sessions]) => {
        const groupDuration = sessions.reduce((sum, s) => sum + getDuration(s.duration), 0);
        cumulativeMinutes += groupDuration;
        return { subject, sessions, cumulativeTime: cumulativeMinutes, groupDuration };
    });

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 py-4 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                        <h2 className="font-semibold text-blue-900 mb-1">Daily Goal</h2>
                        <p className="text-blue-800">{studyPlan.plan.dailyGoal}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {sessionGroups.map((group, groupIndex) => {
                        const allCompleted = group.sessions.every(s => s.completed === true);
                        const hasSubjectAssessment = hasAssessment && studyPlan.assessment.bySubject?.[group.subject];
                        const assessmentCompleted = completedAssessments.has(group.subject);
                        const needsBreak = groupIndex < sessionGroups.length - 1 &&
                            Math.floor(group.cumulativeTime / 45) > Math.floor((group.cumulativeTime - group.groupDuration) / 45);

                        return (
                            <div key={group.subject}>
                                <div className={`bg-white rounded-lg shadow-md p-6 relative ${allCompleted ? 'opacity-75 border-2 border-green-500' : ''}`}>
                                    {allCompleted && (
                                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                            <CheckCircle className="w-4 h-4" /> Completed
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className={`text-xl font-bold ${allCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                {group.subject}
                                            </h3>
                                            <p className={`text-sm ${allCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {group.sessions.length} material{group.sessions.length > 1 ? 's' : ''}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 ${allCompleted ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-800'} rounded-full text-sm font-semibold`}>
                                            {group.groupDuration} mins
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        {group.sessions.map((session, sessionIndex) => {
                                            const isCompleted = session.completed === true;

                                            // Badge: how many quiz questions are linked to this material
                                            const linkedQuestionCount = studyPlan.assessment?.questions?.filter(
                                                q => q.materialId === session.materialId
                                            ).length ?? 0;

                                            return (
                                                <div
                                                    key={sessionIndex}
                                                    onClick={() => openMaterial(session)}
                                                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-50 hover:border-blue-400'}`}
                                                >
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <h4 className={`font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                                    {session.materialTitle}
                                                                </h4>
                                                                {/* Quiz question count badge */}
                                                                {linkedQuestionCount > 0 && !isCompleted && (
                                                                    <span style={{
                                                                        fontSize: 10, fontWeight: 600,
                                                                        padding: '2px 7px', borderRadius: 20,
                                                                        background: '#EFF6FF', color: '#1D4ED8',
                                                                        border: '1px solid #BFDBFE',
                                                                        whiteSpace: 'nowrap',
                                                                    }}>
                                                                        🧠 {linkedQuestionCount} quiz Q{linkedQuestionCount > 1 ? 's' : ''}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {session.timeSlot}
                                                            </p>
                                                        </div>
                                                        {isCompleted
                                                            ? <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                                                            : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
                                                        }
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                                                        <div>
                                                            <p className="text-xs text-gray-500 uppercase">Duration</p>
                                                            <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>{getDuration(session.duration)} min</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 uppercase">Difficulty</p>
                                                            <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>{formatDifficulty(session.difficulty)}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-gray-500 uppercase">Focus</p>
                                                            <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>{formatFocus(session.focusArea)}</p>
                                                        </div>
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {session.objectives.map((obj, i) => (
                                                            <li key={i} className="flex items-start">
                                                                <span className={`mr-2 text-xs ${isCompleted ? 'text-green-500' : 'text-blue-500'}`}>{isCompleted ? '✓' : '•'}</span>
                                                                <span className={`text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>{obj}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {allCompleted && hasSubjectAssessment && !assessmentCompleted && (
                                        <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <ClipboardCheck className="w-6 h-6 text-purple-600" />
                                                        <h4 className="text-lg font-bold text-gray-900">Ready for {group.subject} Assessment?</h4>
                                                    </div>
                                                    <p className="text-sm text-gray-600">
                                                        Test your knowledge with {studyPlan.assessment.bySubject[group.subject].length} questions
                                                    </p>
                                                </div>
                                                <Button onClick={() => setShowAssessment(group.subject)} className="bg-purple-600 hover:bg-purple-700 text-white">
                                                    <ClipboardCheck className="w-4 h-4 mr-2" /> Start Quiz
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {assessmentCompleted && (
                                        <div className="mt-6 bg-green-50 rounded-lg p-4 border-2 border-green-200">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle className="w-6 h-6 text-green-600" />
                                                <div>
                                                    <p className="font-semibold text-green-900">Assessment Completed!</p>
                                                    <p className="text-sm text-green-700">You&apos;ve finished the {group.subject} quiz</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {needsBreak && (
                                    <div className="flex items-center justify-center my-4">
                                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3 text-center">
                                            <p className="text-sm font-semibold text-yellow-800">
                                                ☕ Break (15 mins) — You&apos;ve studied for {group.cumulativeTime} minutes
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Material reader dialog ── */}
            <Dialog.Root open={dialogOpen} onOpenChange={(open) => { if (!open) closeMaterial(); }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 w-[70vw] h-[90vh] -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg focus:outline-none flex flex-col">
                        <DialogTitle></DialogTitle>
                        <div className="flex justify-between items-center border-b p-4 flex-shrink-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <h2 className="text-lg font-semibold truncate">{selectedMaterial?.title || 'Material'}</h2>
                                {/* Show how many quiz questions are linked */}
                                {selectedMaterial?.id && (() => {
                                    const count = studyPlan.assessment?.questions?.filter(
                                        q => q.materialId === selectedMaterial.id
                                    ).length ?? 0;
                                    return count > 0 ? (
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, flexShrink: 0,
                                            padding: '2px 8px', borderRadius: 20,
                                            background: '#EFF6FF', color: '#1D4ED8',
                                            border: '1px solid #BFDBFE',
                                        }}>
                                            🧠 {count} quiz Q{count > 1 ? 's' : ''} linked
                                        </span>
                                    ) : null;
                                })()}
                            </div>
                            <Dialog.Close asChild>
                                <button className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0">
                                    <X className="w-5 h-5" />
                                </button>
                            </Dialog.Close>
                        </div>

                        <ScrollArea ref={scrollRef} className="flex-1 p-6 overflow-y-auto">
                            {selectedMaterial?.content ? (
                                <div>
                                    <MarkdownContent content={selectedMaterial.content} />
                                    <div className="flex justify-end mt-6">
                                        <Button onClick={handleMarkAsDone}>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Mark as Done
                                        </Button>
                                    </div>
                                    <ContextualAiChat
                                        subject={selectedMaterial?.subject}
                                        materialTitle={selectedMaterial?.title}
                                        packId={selectedMaterial?.packId}
                                        materialId={selectedMaterial?.id}
                                    />
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No content available.</p>
                            )}
                        </ScrollArea>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* ── Material quiz modal (shown before confirming mark-as-done) ── */}
            <MaterialQuizModal
                packId={selectedMaterial?.packId}
                open={quizModalOpen}
                materialId={selectedMaterial?.id ?? ''}
                materialTitle={selectedMaterial?.title ?? ''}
                questions={studyPlan.assessment?.questions ?? []}
                onConfirmDone={handleQuizComplete}
                onCancel={handleQuizCancel}
            />
        </div>
    );
}