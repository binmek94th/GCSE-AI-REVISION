'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Check, HelpCircle, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface HelpRequest {
    id: string;
    studentId: string;
    studentName: string;
    materialId: string;
    materialTitle: string;
    subject: string | null;
    examBoard: string | null;
    level: string | null;
    source: 'plan' | 'study_pack' | string;
    note: string | null;
    flagCount: number;
    status: 'open' | 'resolved' | string;
    createdAt: string | null;
    updatedAt: string | null;
    resolvedAt: string | null;
}

type Tab = 'open' | 'resolved';

const sourceLabel: Record<string, string> = {
    plan: 'From study plan',
    study_pack: 'From study pack',
};

function timeAgo(iso: string | null): string {
    if (!iso) return '';
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
}

export default function HelpRequestsSection({ onMessage }: { onMessage?: (studentId: string, name: string) => void }) {
    const [tab, setTab] = useState<Tab>('open');
    const [alerts, setAlerts] = useState<HelpRequest[] | null>(null);
    const [openCount, setOpenCount] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = async (which: Tab) => {
        setAlerts(null);
        setError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/tutors/alerts?status=${which}`, { headers: { Authorization: `Bearer ${idToken}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setAlerts(data.alerts ?? []);
            setOpenCount(data.openCount ?? 0);
        } catch {
            setError("Couldn't load help requests. Please refresh and try again.");
        }
    };

    useEffect(() => {
        load(tab);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const setStatus = async (alert: HelpRequest, status: 'open' | 'resolved') => {
        setBusyId(alert.id);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch(`/api/tutors/alerts/${alert.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error();
            // It moves to the other tab, so drop it from this one.
            setAlerts((prev) => (prev ?? []).filter((a) => a.id !== alert.id));
            setOpenCount((c) => Math.max(0, c + (status === 'resolved' ? -1 : 1)));
            toast.success(status === 'resolved' ? 'Marked as handled' : 'Reopened');
        } catch {
            toast.error("Couldn't update that request. Please try again.");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-amber-500" /> Help requests
                    {openCount > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{openCount} new</span>
                    )}
                </CardTitle>
                <p className="text-xs text-gray-500">Students tap &ldquo;Ask my tutor for help&rdquo; when they&#39;re finding a lesson hard.</p>
            </CardHeader>
            <CardContent>
                <div className="flex gap-1 border-b mb-4">
                    {(['open', 'resolved'] as Tab[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-4 py-2 text-sm font-medium cursor-pointer -mb-px border-b-2 ${
                                tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {t === 'open' ? 'Needs attention' : 'Handled'}
                        </button>
                    ))}
                </div>

                {error ? (
                    <p className="text-sm text-red-600 text-center py-6">{error}</p>
                ) : alerts === null ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                ) : alerts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                        {tab === 'open' ? 'No help requests right now — nice.' : 'Nothing handled yet.'}
                    </p>
                ) : (
                    <ul className="space-y-3">
                        {alerts.map((a) => (
                            <li key={a.id} className="rounded-lg border border-gray-200 p-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm text-gray-900">
                                            <span className="font-semibold">{a.studentName}</span> is finding{' '}
                                            <span className="font-semibold">{a.materialTitle}</span> hard
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-500">
                                            {[a.subject, a.examBoard, a.level].filter(Boolean).join(' · ')}
                                            {a.subject ? ' · ' : ''}
                                            {sourceLabel[a.source] ?? 'From study pack'} · {timeAgo(a.updatedAt)}
                                            {a.flagCount > 1 ? ` · asked ${a.flagCount} times` : ''}
                                        </p>
                                        {a.note && (
                                            <p className="mt-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-sm text-gray-700">&ldquo;{a.note}&rdquo;</p>
                                        )}
                                    </div>
                                    <div className="flex flex-shrink-0 flex-col gap-2">
                                        {onMessage && (
                                            <button
                                                onClick={() => onMessage(a.studentId, a.studentName)}
                                                className="flex items-center justify-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700 cursor-pointer"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" /> Message
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setStatus(a, tab === 'open' ? 'resolved' : 'open')}
                                            disabled={busyId === a.id}
                                            className="flex items-center justify-center gap-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50"
                                        >
                                            {busyId === a.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : tab === 'open' ? (
                                                <Check className="w-3.5 h-3.5" />
                                            ) : (
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            )}
                                            {tab === 'open' ? 'Mark handled' : 'Reopen'}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
