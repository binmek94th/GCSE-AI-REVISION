'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import ChatModal from '@/app/components/chat/ChatModal';
import ChatPanel from '@/app/components/chat/ChatPanel';

export interface ChatConversation {
    tutorId: string;
    studentId: string;
    otherId: string;
    otherName: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    lastSenderRole: 'tutor' | 'student' | null;
    unread: number;
}

const REFRESH_MS = 30000;

/**
 * The student's "Messages" button: shows nothing unless they have a tutor, shows an
 * unread count, and opens the conversation (or a list if they have more than one tutor).
 */
export default function TutorChatLauncher() {
    const [uid, setUid] = useState<string | null>(null);
    const [convs, setConvs] = useState<ChatConversation[]>([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<ChatConversation | null>(null);

    useEffect(() => onAuthStateChanged(auth, (u) => setUid(u && !u.isAnonymous ? u.uid : null)), []);

    const refresh = useCallback(async () => {
        if (!uid) return;
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/tutor-chat/conversations?role=student', { headers: { Authorization: `Bearer ${idToken}` } });
            if (!res.ok) return;
            const data = await res.json();
            setConvs(data.conversations ?? []);
        } catch {
            /* ignore: the button just keeps its last state */
        }
    }, [uid]);

    useEffect(() => {
        if (!uid) return;
        refresh();
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') refresh();
        }, REFRESH_MS);
        return () => clearInterval(timer);
    }, [uid, refresh]);

    // No tutor, no button — most students never see this.
    if (!uid || convs.length === 0) return null;

    const unread = convs.reduce((sum, c) => sum + c.unread, 0);

    const openChat = () => {
        setSelected(convs.length === 1 ? convs[0] : null);
        setOpen(true);
    };
    const close = () => {
        setOpen(false);
        setSelected(null);
        refresh();
    };

    return (
        <>
            <button
                onClick={openChat}
                aria-label={unread > 0 ? `Messages, ${unread} unread` : 'Messages'}
                className="relative flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 cursor-pointer"
            >
                <MessageSquare className="h-5 w-5" />
                <span className="hidden sm:inline">Messages</span>
                {unread > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {open && (
                <ChatModal
                    title={selected ? selected.otherName : 'Your tutors'}
                    onClose={close}
                    onBack={selected && convs.length > 1 ? () => { setSelected(null); refresh(); } : undefined}
                >
                    {selected ? (
                        <ChatPanel
                            tutorId={selected.tutorId}
                            studentId={selected.studentId}
                            role="student"
                            otherName={selected.otherName}
                            onRead={refresh}
                        />
                    ) : (
                        <ul className="divide-y divide-gray-100 overflow-y-auto">
                            {convs.map((c) => (
                                <li key={c.tutorId}>
                                    <button
                                        onClick={() => setSelected(c)}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 cursor-pointer"
                                    >
                                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                                            {c.otherName.slice(0, 1).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-gray-900">{c.otherName}</p>
                                            <p className="truncate text-xs text-gray-500">{c.lastMessage ?? 'No messages yet'}</p>
                                        </div>
                                        {c.unread > 0 && (
                                            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
                                                {c.unread > 9 ? '9+' : c.unread}
                                            </span>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </ChatModal>
            )}
        </>
    );
}
