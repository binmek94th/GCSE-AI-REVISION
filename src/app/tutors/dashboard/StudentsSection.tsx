'use client';

import { Fragment, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Check, ChevronDown, ChevronUp, Copy, KeyRound, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';

interface StudentSummary {
    studentId: string;
    name: string;
    email: string | null;
    level: string | null;
    examBoard: string | null;
    subjects: string[];
    source: 'referral_link' | 'code';
    linkedAt: string | null;
    lastActiveAt: string | null;
    questionsAnswered: number;
    accuracy: number | null;
    answeredLast7d: number;
    accuracyLast7d: number | null;
    materialsCompleted: number;
}

interface StudentDetail {
    student: {
        studentId: string;
        name: string;
        email: string | null;
        level: string | null;
        examBoard: string | null;
        subjects: { name: string; tier: string | null; targetGrade: string | null }[];
        source: 'referral_link' | 'code';
        linkedAt: string | null;
        lastActiveAt: string | null;
    };
    study: {
        packs: {
            packId: string;
            subject: string;
            examBoard: string | null;
            level: string | null;
            tier: string | null;
            totalMaterials: number;
            finishedMaterials: number;
            percent: number;
        }[];
        totalMaterials: number;
        finishedMaterials: number;
        percent: number;
    };
    weekly: {
        from: string;
        to: string;
        questionsAnswered: number;
        questionsCorrect: number;
        accuracy: number | null;
        mockTestsTaken: number;
        materialsCompleted: number;
        sessionsPlanned: number;
        sessionsCompleted: number;
        days: {
            date: string;
            questionsAnswered: number;
            questionsCorrect: number;
            materialsCompleted: number;
            sessionsPlanned: number;
            sessionsCompleted: number;
        }[];
    };
    quiz: {
        questionsAnswered: number;
        questionsCorrect: number;
        accuracy: number | null;
        outstandingMistakes: number;
        subjects: {
            packId: string;
            subject: string;
            examBoard: string | null;
            level: string | null;
            tier: string | null;
            answered: number;
            correct: number;
            accuracy: number;
            outstandingMistakes: number;
            lastAnsweredAt: string | null;
        }[];
        recentMockTests: {
            subject: string;
            score: number;
            correctCount: number;
            totalCount: number;
            date: string | null;
        }[];
    };
}

type Tab = 'study' | 'weekly' | 'quiz';

const sourceStyle: Record<string, string> = {
    referral_link: 'bg-blue-100 text-blue-700',
    code: 'bg-purple-100 text-purple-700',
};
const sourceLabel: Record<string, string> = {
    referral_link: 'Referral link',
    code: 'Tutor code',
};

function timeAgo(iso: string | null): string {
    if (!iso) return 'Not started';
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

// "AQA · A-Level" (plus the tier, e.g. "Higher", when the pack has one)
const packTag = (p: { examBoard: string | null; level: string | null; tier: string | null }) =>
    [p.examBoard, p.level, p.tier].filter(Boolean).join(' · ');

const accuracyColor = (a: number | null) =>
    a === null ? 'text-gray-400' : a >= 70 ? 'text-green-600' : a >= 50 ? 'text-amber-600' : 'text-red-600';

const barColor = (a: number) => (a >= 70 ? 'bg-green-500' : a >= 50 ? 'bg-amber-500' : 'bg-red-500');

function Bar({ value, className }: { value: number; className?: string }) {
    return (
        <div className="w-full bg-gray-200 rounded-full h-2">
            <div className={`h-2 rounded-full ${className ?? 'bg-blue-500'}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
    );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
    return (
        <div className="rounded-lg border border-gray-200 p-3">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-xl font-bold text-gray-900">{value}</div>
            {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
        </div>
    );
}

// ─── Detail panel ───────────────────────────────────────────────────────────

function StudentDetailPanel({ studentId }: { studentId: string }) {
    const [detail, setDetail] = useState<StudentDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<Tab>('study');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const idToken = await auth.currentUser?.getIdToken();
                const res = await fetch(`/api/tutors/students/${studentId}`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (!cancelled) setDetail(data);
            } catch {
                if (!cancelled) setError("Couldn't load this student's progress.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [studentId]);

    if (error) return <p className="text-sm text-red-600 py-4">{error}</p>;
    if (!detail) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
        );
    }

    const maxDayQuestions = Math.max(1, ...detail.weekly.days.map((d) => d.questionsAnswered));

    return (
        <div className="space-y-4">
            {/* Subjects + targets */}
            {detail.student.subjects.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {detail.student.subjects.map((s) => (
                        <span key={s.name} className="text-xs bg-gray-100 text-gray-700 rounded-full px-2.5 py-1">
                            {s.name}
                            {s.tier ? ` · ${s.tier}` : ''}
                            {s.targetGrade ? ` · target ${s.targetGrade}` : ''}
                        </span>
                    ))}
                </div>
            )}

            <div className="flex gap-1 border-b">
                {(['study', 'weekly', 'quiz'] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 text-sm font-medium cursor-pointer -mb-px border-b-2 ${
                            tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {t === 'study' ? 'Study' : t === 'weekly' ? 'This week' : 'Quizzes'}
                    </button>
                ))}
            </div>

            {/* STUDY */}
            {tab === 'study' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Stat label="Materials completed" value={`${detail.study.finishedMaterials}/${detail.study.totalMaterials}`} />
                        <Stat label="Overall progress" value={`${detail.study.percent}%`} />
                        <Stat label="Subjects" value={detail.study.packs.length} />
                    </div>
                    {detail.study.packs.length === 0 ? (
                        <p className="text-sm text-gray-500">No study packs yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {detail.study.packs.map((p) => (
                                <div key={p.packId}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-900">
                                            {p.subject}
                                            {packTag(p) && <span className="text-gray-400 font-normal"> · {packTag(p)}</span>}
                                        </span>
                                        <span className="text-gray-600">
                                            {p.finishedMaterials}/{p.totalMaterials} · {p.percent > 0 ? `${p.percent}%` : 'Not started'}
                                        </span>
                                    </div>
                                    <Bar value={p.percent} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* WEEKLY */}
            {tab === 'weekly' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <Stat
                            label="Questions answered"
                            value={detail.weekly.questionsAnswered}
                            sub={detail.weekly.accuracy !== null ? `${detail.weekly.accuracy}% correct` : undefined}
                        />
                        <Stat label="Mock tests" value={detail.weekly.mockTestsTaken} />
                        <Stat label="Materials finished" value={detail.weekly.materialsCompleted} />
                        <Stat
                            label="Plan sessions done"
                            value={`${detail.weekly.sessionsCompleted}/${detail.weekly.sessionsPlanned}`}
                        />
                    </div>

                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Questions answered per day (last 7 days)</p>
                        <div className="flex items-end gap-2 h-28">
                            {detail.weekly.days.map((d) => (
                                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <span className="text-[10px] text-gray-500 mb-1">{d.questionsAnswered || ''}</span>
                                    <div
                                        className="w-full rounded-t bg-blue-500"
                                        style={{ height: `${(d.questionsAnswered / maxDayQuestions) * 100}%`, minHeight: d.questionsAnswered ? 4 : 2, opacity: d.questionsAnswered ? 1 : 0.25 }}
                                    />
                                    <span className="text-[10px] text-gray-500 mt-1">
                                        {new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'short', timeZone: 'UTC' })}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500 border-b">
                                    <th className="pb-2 font-medium">Day</th>
                                    <th className="pb-2 font-medium">Questions</th>
                                    <th className="pb-2 font-medium">Correct</th>
                                    <th className="pb-2 font-medium">Materials</th>
                                    <th className="pb-2 font-medium">Plan sessions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...detail.weekly.days].reverse().map((d) => (
                                    <tr key={d.date} className="border-b last:border-0">
                                        <td className="py-1.5 text-gray-700">
                                            {new Date(d.date + 'T00:00:00Z').toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
                                        </td>
                                        <td className="py-1.5">{d.questionsAnswered}</td>
                                        <td className="py-1.5">{d.questionsCorrect}</td>
                                        <td className="py-1.5">{d.materialsCompleted}</td>
                                        <td className="py-1.5">
                                            {d.sessionsPlanned > 0 ? `${d.sessionsCompleted}/${d.sessionsPlanned}` : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* QUIZ */}
            {tab === 'quiz' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <Stat label="Questions answered" value={detail.quiz.questionsAnswered} />
                        <Stat
                            label="Overall accuracy"
                            value={detail.quiz.accuracy !== null ? `${detail.quiz.accuracy}%` : '—'}
                            sub={detail.quiz.questionsAnswered ? `${detail.quiz.questionsCorrect} correct` : undefined}
                        />
                        <Stat label="Questions to retry" value={detail.quiz.outstandingMistakes} />
                    </div>

                    {detail.quiz.subjects.length === 0 ? (
                        <p className="text-sm text-gray-500">No quiz answers yet.</p>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs font-medium text-gray-500">Accuracy by subject</p>
                            {detail.quiz.subjects.map((s) => (
                                <div key={s.packId}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-gray-900">
                                            {s.subject}
                                            {packTag(s) && <span className="text-gray-400 font-normal"> · {packTag(s)}</span>}
                                        </span>
                                        <span className={`font-semibold ${accuracyColor(s.accuracy)}`}>
                                            {s.accuracy}%{' '}
                                            <span className="text-gray-500 font-normal">
                                                ({s.correct}/{s.answered})
                                            </span>
                                        </span>
                                    </div>
                                    <Bar value={s.accuracy} className={barColor(s.accuracy)} />
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">Recent mock exams</p>
                        {detail.quiz.recentMockTests.length === 0 ? (
                            <p className="text-sm text-gray-500">No mock exams taken yet.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="pb-2 font-medium">Date</th>
                                        <th className="pb-2 font-medium">Subject</th>
                                        <th className="pb-2 font-medium">Score</th>
                                        <th className="pb-2 font-medium">Correct</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {detail.quiz.recentMockTests.map((m, i) => (
                                        <tr key={i} className="border-b last:border-0">
                                            <td className="py-1.5 text-gray-600">{m.date ? new Date(m.date).toLocaleDateString() : '—'}</td>
                                            <td className="py-1.5 text-gray-900">{m.subject}</td>
                                            <td className={`py-1.5 font-semibold ${accuracyColor(m.score)}`}>{m.score}%</td>
                                            <td className="py-1.5 text-gray-600">
                                                {m.correctCount}/{m.totalCount}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Section ────────────────────────────────────────────────────────────────

export default function StudentsSection({ referralCode }: { referralCode: string }) {
    const [students, setStudents] = useState<StudentSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [openId, setOpenId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const idToken = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/tutors/students', { headers: { Authorization: `Bearer ${idToken}` } });
                if (!res.ok) throw new Error();
                const data = await res.json();
                if (!cancelled) setStudents(data.students ?? []);
            } catch {
                if (!cancelled) setError("Couldn't load your students. Please refresh and try again.");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const copyCode = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        toast.success('Tutor code copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <>
            {/* Tutor code */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                        <KeyRound className="w-4 h-4 text-purple-500" />
                        <p className="text-sm font-medium text-gray-700">Your tutor code</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-800 truncate">{referralCode}</code>
                        <Button onClick={copyCode} className="cursor-pointer bg-blue-600 hover:bg-blue-700 flex-shrink-0">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                        Students who already have an account can enter this code in their Profile to share their progress with you. Students who sign
                        up through your referral link are added automatically.
                    </p>
                </CardContent>
            </Card>

            {/* Students */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-gray-500" /> Your Students
                        {students && <span className="text-sm font-normal text-gray-500">({students.length})</span>}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {error ? (
                        <p className="text-sm text-red-600 text-center py-6">{error}</p>
                    ) : students === null ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        </div>
                    ) : students.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-6">
                            No students yet — share your referral link or tutor code to get started.
                        </p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="pb-2 font-medium">Student</th>
                                        <th className="pb-2 font-medium">Added via</th>
                                        <th className="pb-2 font-medium">Last active</th>
                                        <th className="pb-2 font-medium">This week</th>
                                        <th className="pb-2 font-medium">Accuracy</th>
                                        <th className="pb-2 font-medium">Materials</th>
                                        <th className="pb-2" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s) => {
                                        const open = openId === s.studentId;
                                        return (
                                            <Fragment key={s.studentId}>
                                                <tr
                                                    onClick={() => setOpenId(open ? null : s.studentId)}
                                                    className="border-b cursor-pointer hover:bg-gray-50"
                                                >
                                                    <td className="py-2.5">
                                                        <div className="font-medium text-gray-900">{s.name}</div>
                                                        <div className="text-xs text-gray-500">
                                                            {[s.level, s.email].filter(Boolean).join(' · ')}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sourceStyle[s.source]}`}>
                                                            {sourceLabel[s.source]}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 text-gray-600">{timeAgo(s.lastActiveAt)}</td>
                                                    <td className="py-2.5 text-gray-900">{s.answeredLast7d} questions</td>
                                                    <td className={`py-2.5 font-semibold ${accuracyColor(s.accuracy)}`}>
                                                        {s.accuracy !== null ? `${s.accuracy}%` : '—'}
                                                    </td>
                                                    <td className="py-2.5 text-gray-900">{s.materialsCompleted}</td>
                                                    <td className="py-2.5 text-gray-400">
                                                        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                    </td>
                                                </tr>
                                                {open && (
                                                    <tr className="border-b bg-gray-50/60">
                                                        <td colSpan={7} className="p-4">
                                                            <StudentDetailPanel studentId={s.studentId} />
                                                        </td>
                                                    </tr>
                                                )}
                                            </Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}
