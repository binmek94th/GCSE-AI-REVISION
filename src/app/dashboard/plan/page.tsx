'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Target, Award, Lightbulb, X, Brain, AlertCircle, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react';
import { Badge } from "@/app/components/ui/badge";
import StudyPlan from "@/app/dashboard/plan/StudyPlan";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

const NOTICE_KEY = 'weak_area_notice_dismissed';

// Approximate quiz-accuracy threshold each target grade maps to. This is a
// transparent heuristic (≈10% per grade) — tune to your own calibration.
const GRADE_TARGET_PCT: Record<string, number> = {
    '9': 90, '8': 80, '7': 70, '6': 60, '5': 50, '4': 40, '3': 30, '2': 20, '1': 10,
};

type ReadinessStatus = 'ahead' | 'on_track' | 'behind';

const STATUS_STYLE: Record<ReadinessStatus, { label: string; pill: string; bar: string; text: string }> = {
    ahead:    { label: 'Ahead',    pill: 'bg-green-100 text-green-700', bar: 'bg-green-500', text: 'text-green-700' },
    on_track: { label: 'On track', pill: 'bg-blue-100 text-blue-700',  bar: 'bg-blue-500',  text: 'text-blue-700' },
    behind:   { label: 'Behind',   pill: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500', text: 'text-amber-700' },
};

// Compare a current quiz-accuracy score against the target grade's threshold.
const getReadiness = (
    score: number,
    targetGrade: string | null
): { status: ReadinessStatus; targetPct: number; targetGrade: string } | null => {
    if (!targetGrade) return null;
    const targetPct = GRADE_TARGET_PCT[String(targetGrade)];
    if (targetPct == null) return null;
    const diff = score - targetPct;
    const status: ReadinessStatus = diff >= 5 ? 'ahead' : diff >= -10 ? 'on_track' : 'behind';
    return { status, targetPct, targetGrade: String(targetGrade) };
};

interface Subject {
    name: string;
    progress: number;
    grade: string;
}

interface SubjectQuizStat {
    total: number;
    correct: number;
    accuracy: number;
}

interface MistakeQuestion {
    subject: string;
    [key: string]: any;
}

interface PlanTabProps {
    subjects: Subject[];
    studyPack: number;
}

// Title-case a subject key/name ("biology" or "further_maths" → "Biology" / "Further Maths")
const titleCase = (s: string) =>
    s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─── Retry Failed callout card ────────────────────────────────────────────────

function RetryFailedCard({
                             loading,
                             total,
                             bySubject,
                             onGo,
                         }: {
    loading: boolean;
    total: number;
    bySubject: [string, number][];
    onGo: () => void;
}) {
    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center gap-3 py-5 text-gray-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-medium">Checking for questions to fix…</span>
                </CardContent>
            </Card>
        );
    }

    // All caught up
    if (total === 0) {
        return (
            <Card className="border-green-200 bg-green-50">
                <CardContent className="flex items-center gap-4 py-5">
                    <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-900">All caught up 👍</p>
                        <p className="text-sm font-medium text-gray-700">
                            You&#39;ve cleared every incorrect question. Nice work!
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Has questions to fix
    return (
        <Card className="border-amber-300 bg-amber-50">
            <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-5">
                <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                        You have {total} question{total !== 1 ? 's' : ''} to fix
                    </p>

                    {bySubject.length > 1 ? (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {bySubject.map(([name, count]) => (
                                <span
                                    key={name}
                                    className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-amber-300 text-amber-800"
                                >
                                    {titleCase(name)} · {count}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm font-medium text-gray-700 mt-0.5">
                            Review them to strengthen your weak spots.
                        </p>
                    )}
                </div>

                <Button
                    onClick={onGo}
                    className="bg-amber-600 hover:bg-amber-700 text-white cursor-pointer flex-shrink-0"
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Retry Failed
                </Button>
            </CardContent>
        </Card>
    );
}

// ─── Plan tab ──────────────────────────────────────────────────────────────────

function PlanTab({ subjects, studyPack }: PlanTabProps) {
    const router = useRouter();
    const [showNotice, setShowNotice] = useState(false);
    const [quizStats, setQuizStats] = useState<Record<string, SubjectQuizStat>>({});
    // Target grade per subject, pulled from the user document's `subjects` array
    const [targetGrades, setTargetGrades] = useState<Record<string, string>>({});

    // Mistake-bank (Retry Failed) summary
    const [mistakes, setMistakes] = useState<MistakeQuestion[]>([]);
    const [loadingMistakes, setLoadingMistakes] = useState(true);
    const [mistakesError, setMistakesError] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem(NOTICE_KEY);
        if (!dismissed) setShowNotice(true);
    }, []);

    // Fetch quiz accuracy per subject from /api/profile
    useEffect(() => {
        const fetchQuizStats = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/profile', {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                setQuizStats(data?.stats?.subjectProgress ?? {});
            } catch (err) {
                console.error('Failed to fetch quiz stats:', err);
            }
        };
        fetchQuizStats();
    }, []);

    // Fetch target grade per subject from the user document's `subjects` array
    useEffect(() => {
        const fetchTargetGrades = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                const arr = (snap.data()?.subjects ?? []) as { name?: string; targetGrade?: string }[];
                const map: Record<string, string> = {};
                arr.forEach(s => {
                    if (s?.name && s?.targetGrade != null) {
                        map[s.name.toLowerCase().trim()] = String(s.targetGrade);
                    }
                });
                setTargetGrades(map);
            } catch (err) {
                console.error('Failed to fetch target grades:', err);
            }
        };
        fetchTargetGrades();
    }, []);

    // Fetch incorrect questions (mistake bank) for the Retry Failed card
    useEffect(() => {
        const fetchMistakes = async () => {
            const user = auth.currentUser;
            if (!user) { setLoadingMistakes(false); return; }
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/mistake-bank', {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) { setMistakesError(true); setLoadingMistakes(false); return; }
                const data = await res.json();
                setMistakes(Array.isArray(data?.questions) ? data.questions : []);
            } catch (err) {
                console.error('Failed to fetch mistakes:', err);
                setMistakesError(true);
            } finally {
                setLoadingMistakes(false);
            }
        };
        fetchMistakes();
    }, []);

    const dismissNotice = () => {
        localStorage.setItem(NOTICE_KEY, 'true');
        setShowNotice(false);
    };

    if (studyPack === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-600">No subjects found. Please add study packs to see your progress.</p>
                <Button onClick={() => router.push('/dashboard?tab=studypack')}>Browse Study Packs</Button>
            </div>
        );
    }

    /**
     * Find quiz stats for a subject by doing a case-insensitive substring match.
     * The profile uses keys like "biology", the subject name might be "Biology".
     */
    const findQuizStat = (subjectName: string): SubjectQuizStat | null => {
        const key = subjectName.toLowerCase().replace(/\s+/g, '_');
        // Exact match first
        if (quizStats[key]) return quizStats[key];
        // Partial match fallback
        const match = Object.entries(quizStats).find(([k]) =>
            k.includes(key) || key.includes(k)
        );
        return match ? match[1] : null;
    };

    // Resolve the target grade for a subject (case-insensitive, with a substring fallback)
    const findTargetGrade = (subjectName: string): string | null => {
        const key = subjectName.toLowerCase().trim();
        if (targetGrades[key]) return targetGrades[key];
        const match = Object.entries(targetGrades).find(([k]) =>
            k.includes(key) || key.includes(k)
        );
        return match ? match[1] : null;
    };

    // Total + per-subject breakdown of questions to fix
    const totalToFix = mistakes.length;
    const bySubject = Object.entries(
        mistakes.reduce<Record<string, number>>((acc, q) => {
            const name = q.subject || 'Other';
            acc[name] = (acc[name] || 0) + 1;
            return acc;
        }, {})
    ).sort((a, b) => b[1] - a[1]);

    const GENERIC_NOTICE =
        'Your plan includes materials covering topics where you answered questions incorrectly — so you can strengthen those areas first.';

    /**
     * Build a specific notice when we know which subjects had missed questions,
     * e.g. "We've added review material because you missed 3 questions in Geography."
     * Falls back to the generic line while loading or on error, and returns null
     * (hides the banner) when there's nothing to strengthen.
     */
    const reviewNotice: string | null = (() => {
        if (loadingMistakes || mistakesError) return GENERIC_NOTICE;
        if (bySubject.length === 0) return null;

        if (bySubject.length === 1) {
            const [name, count] = bySubject[0];
            return `We've added review material to your plan because you missed ${count} question${count !== 1 ? 's' : ''} in ${titleCase(name)}.`;
        }

        const parts = bySubject.map(([name, count]) => `${titleCase(name)} (${count})`);
        const list = `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
        return `We've added review material to your plan because you missed questions in ${list}.`;
    })();

    return (
        <div className="space-y-4">
            {showNotice && reviewNotice && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-sm text-amber-800 flex-1">
                        {reviewNotice}
                    </p>
                    <button
                        onClick={dismissNotice}
                        aria-label="Dismiss notice"
                        className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Retry Failed summary card */}
            <RetryFailedCard
                loading={loadingMistakes}
                total={totalToFix}
                bySubject={bySubject}
                onGo={() => router.push('/dashboard?tab=mistakes')}
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Study plan */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" />
                            Today&#39;s Study Plan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <StudyPlan />
                    </CardContent>
                </Card>

                {/* Progress overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-600" />
                            Progress Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {subjects.map((subject, index) => {
                            const displayName = subject.name
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, c => c.toUpperCase());

                            const quiz = findQuizStat(subject.name);
                            const hasGrade = !!subject.grade && subject.grade.toUpperCase() !== 'N/A';
                            const targetGrade = findTargetGrade(subject.name);
                            const readiness = quiz && quiz.total > 0 ? getReadiness(quiz.accuracy, targetGrade) : null;

                            return (
                                <div key={index} className="space-y-2">
                                    {/* Subject name + target grade */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">{displayName}</span>
                                        {targetGrade
                                            ? <Badge variant="outline" className="text-xs">🎯 Target {targetGrade}</Badge>
                                            : hasGrade
                                                ? <Badge variant="outline" className="text-xs">{subject.grade}</Badge>
                                                : <Badge variant="outline" className="text-xs text-gray-400">New</Badge>}
                                    </div>

                                    {/* Material completion bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-400">Materials</span>
                                            <span className="text-xs text-gray-500">
                                                {subject.progress > 0 ? `${subject.progress}%` : 'Not started'}
                                            </span>
                                        </div>
                                        <Progress value={subject.progress} className="h-1.5" />
                                    </div>

                                    {/* Readiness score vs target — or a friendly prompt when there's no data yet */}
                                    {quiz && quiz.total > 0 ? (
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Brain className="w-3 h-3" /> Readiness
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    {readiness && (
                                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[readiness.status].pill}`}>
                                                            {STATUS_STYLE[readiness.status].label}
                                                        </span>
                                                    )}
                                                    <span className={`text-xs font-semibold ${
                                                        readiness ? STATUS_STYLE[readiness.status].text :
                                                            quiz.accuracy >= 70 ? 'text-green-600' :
                                                                quiz.accuracy >= 50 ? 'text-yellow-600' :
                                                                    'text-red-500'
                                                    }`}>
                                                        {quiz.accuracy}%
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Progress bar with a target marker */}
                                            <div className="relative h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        readiness ? STATUS_STYLE[readiness.status].bar :
                                                            quiz.accuracy >= 70 ? 'bg-green-500' :
                                                                quiz.accuracy >= 50 ? 'bg-yellow-400' :
                                                                    'bg-red-400'
                                                    }`}
                                                    style={{ width: `${quiz.accuracy}%` }}
                                                />
                                                {readiness && (
                                                    <span
                                                        className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-gray-700/70 rounded"
                                                        style={{ left: `${readiness.targetPct}%` }}
                                                        title={`Grade ${readiness.targetGrade} target (~${readiness.targetPct}%)`}
                                                    />
                                                )}
                                            </div>

                                            {/* Status line: "43% — behind your Grade 8 target" */}
                                            {readiness ? (
                                                <p className={`text-xs font-medium ${STATUS_STYLE[readiness.status].text}`}>
                                                    {readiness.status === 'behind'   && `Behind your Grade ${readiness.targetGrade} target`}
                                                    {readiness.status === 'on_track' && `On track for your Grade ${readiness.targetGrade} target`}
                                                    {readiness.status === 'ahead'    && `Ahead of your Grade ${readiness.targetGrade} target`}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-400">
                                                    {quiz.correct}/{quiz.total} questions correct
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                                            <Brain className="w-3 h-3 text-gray-400 shrink-0" />
                                            Complete a quiz to unlock your readiness score
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default PlanTab;