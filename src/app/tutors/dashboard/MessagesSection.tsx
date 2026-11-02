'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Loader2, MessageSquare } from 'lucide-react';

interface Conversation {
    studentId: string;
    otherName: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    lastSenderRole: 'tutor' | 'student' | null;
    unread: number;
}

interface Props {
    /** Open the conversation with this student. */
    onOpen: (studentId: string, name: string) => void;
    /** Change this to make the list reload straight away (e.g. after closing a chat). */
    refreshKey?: number;
}

const REFRESH_MS = 20000;

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

/** The tutor's inbox: conversations with their students, newest first, with unread counts. */
export default function MessagesSection({ onOpen, refreshKey = 0 }: Props) {
    const [convs, setConvs] = useState<Conversation[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/tutor-chat/conversations?role=tutor', { headers: { Authorization: `Bearer ${idToken}` } });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setConvs(data.conversations ?? []);
            setError(null);
        } catch {
            // keep showing what we had if a later refresh fails
            setError((prev) => prev ?? "Couldn't load your messages. Please refresh and try again.");
        }
    }, []);

    useEffect(() => {
        load();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') load();
        }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [load, refreshKey]);

    const totalUnread = (convs ?? []).reduce((sum, c) => sum + c.unread, 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-blue-500" /> Messages
                    {totalUnread > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{totalUnread} unread</span>
                    )}
                </CardTitle>
                <p className="text-xs text-gray-500">Chats with your students. You can message anyone in your student list below.</p>
            </CardHeader>
            <CardContent>
                {error && !convs ? (
                    <p className="text-sm text-red-600 text-center py-6">{error}</p>
                ) : convs === null ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                    </div>
                ) : convs.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                        No messages yet. Use <strong>Message</strong> next to a student below to start a conversation.
                    </p>
                ) : (
                    <ul className="divide-y divide-gray-100">
                        {convs.map((c) => (
                            <li key={c.studentId}>
                                <button
                                    onClick={() => onOpen(c.studentId, c.otherName)}
                                    className="flex w-full items-center gap-3 py-3 text-left hover:bg-gray-50 cursor-pointer"
                                >
                                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                                        {c.otherName.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-baseline justify-between gap-2">
                                            <p className={`truncate text-sm ${c.unread > 0 ? 'font-bold text-gray-900' : 'font-semibold text-gray-900'}`}>{c.otherName}</p>
                                            <span className="shrink-0 text-xs text-gray-400">{timeAgo(c.lastMessageAt)}</span>
                                        </div>
                                        <p className={`truncate text-xs ${c.unread > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                                            {c.lastSenderRole === 'tutor' ? 'You: ' : ''}
                                            {c.lastMessage}
                                        </p>
                                    </div>
                                    {c.unread > 0 && (
                                        <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                                            {c.unread > 9 ? '9+' : c.unread}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
