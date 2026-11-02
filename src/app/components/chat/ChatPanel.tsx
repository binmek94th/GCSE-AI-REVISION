'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, TriangleAlert } from 'lucide-react';
import { auth } from '@/lib/firebase';

export interface ChatMessage {
    id: string;
    senderId: string;
    senderRole: 'tutor' | 'student';
    text: string;
    createdAt: string | null;
}

type Row = ChatMessage & { pending?: boolean; failed?: boolean };

interface Props {
    tutorId: string;
    studentId: string;
    /** Which side the person looking at this screen is. */
    role: 'tutor' | 'student';
    otherName: string;
    /** Called after the other person's messages have been marked as read. */
    onRead?: () => void;
}

const POLL_MS = 4000; // how often an open chat checks for new messages
// Poll for messages a few seconds BEFORE the newest one we have, then drop the repeats by id. Timestamps
// are written by different servers at slightly different moments, so a message can be stamped a touch
// earlier than one we've already seen; asking from the exact newest time would miss it until a reload.
const POLL_OVERLAP_MS = 5000;
const MAX_LEN = 1000;

const timeOf = (m: Row) => (m.createdAt ? Date.parse(m.createdAt) : Date.now());
const byTime = (a: Row, b: Row) => timeOf(a) - timeOf(b) || a.id.localeCompare(b.id);

function dayLabel(iso: string | null): string {
    const d = iso ? new Date(iso) : new Date();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

async function apiFetch(path: string, init: RequestInit = {}) {
    const idToken = await auth.currentUser?.getIdToken();
    return fetch(path, {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}`, ...(init.headers ?? {}) },
    });
}

/** A live conversation between a student and a tutor. */
export default function ChatPanel({ tutorId, studentId, role, otherName, onRead }: Props) {
    const base = `/api/tutor-chat/${encodeURIComponent(tutorId)}/${encodeURIComponent(studentId)}`;

    const [rows, setRows] = useState<Row[]>([]);
    const rowsRef = useRef<Row[]>([]);
    rowsRef.current = rows;

    const [status, setStatus] = useState<'loading' | 'ready' | 'gone' | 'error'>('loading');
    const [reloadKey, setReloadKey] = useState(0); // bump to load the conversation again
    const [hasMore, setHasMore] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [text, setText] = useState('');
    const [sendError, setSendError] = useState<string | null>(null);

    const listRef = useRef<HTMLDivElement>(null);
    const stickToBottom = useRef(true);
    const inFlight = useRef(false);
    const tmpCounter = useRef(0);
    const onReadRef = useRef(onRead);
    onReadRef.current = onRead;

    const markRead = useCallback(() => {
        apiFetch(`${base}/read`, { method: 'POST' })
            .then(() => onReadRef.current?.())
            .catch(() => {});
    }, [base]);

    // Add messages we don't already have (the same message can arrive from a send AND a poll).
    const mergeIn = useCallback((incoming: ChatMessage[]) => {
        setRows((prev) => {
            const have = new Set(prev.map((r) => r.id));
            const fresh = incoming.filter((m) => !have.has(m.id));
            return fresh.length ? [...prev, ...fresh].sort(byTime) : prev;
        });
    }, []);

    // ── first load (and again if the conversation changes)
    useEffect(() => {
        let cancelled = false;
        setRows([]);
        setStatus('loading');
        setHasMore(false);
        stickToBottom.current = true;
        (async () => {
            try {
                const res = await apiFetch(`${base}/messages`);
                if (cancelled) return;
                if (res.status === 404) return setStatus('gone');
                if (!res.ok) return setStatus('error');
                const data = await res.json();
                setRows(data.messages ?? []);
                setHasMore(!!data.hasMore);
                setStatus('ready');
                if ((data.messages ?? []).some((m: ChatMessage) => m.senderRole !== role)) markRead();
            } catch {
                if (!cancelled) setStatus('error');
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [base, role, markRead, reloadKey]);

    // ── pick up new messages while the chat is open and the tab is visible
    const fetchNew = useCallback(async () => {
        if (inFlight.current) return;
        const known = rowsRef.current.filter((r) => !r.pending && !r.failed && r.createdAt);
        const newest = known.length ? Date.parse(known[known.length - 1].createdAt as string) : NaN;
        const cursor = Number.isFinite(newest) ? new Date(newest - POLL_OVERLAP_MS).toISOString() : null;
        inFlight.current = true;
        try {
            const res = await apiFetch(cursor ? `${base}/messages?since=${encodeURIComponent(cursor)}` : `${base}/messages`);
            if (res.status === 404) return setStatus('gone');
            if (!res.ok) return; // a blip: try again next tick
            const data = await res.json();
            const incoming: ChatMessage[] = data.messages ?? [];
            const have = new Set(rowsRef.current.map((r) => r.id));
            const fresh = incoming.filter((m) => !have.has(m.id));
            if (fresh.length) {
                mergeIn(fresh);
                if (fresh.some((m) => m.senderRole !== role)) markRead();
            }
        } catch {
            /* offline for a moment: ignore */
        } finally {
            inFlight.current = false;
        }
    }, [base, role, mergeIn, markRead]);

    useEffect(() => {
        if (status !== 'ready') return;
        const tick = () => {
            if (document.visibilityState === 'visible') fetchNew();
        };
        const timer = setInterval(tick, POLL_MS);
        document.addEventListener('visibilitychange', tick);
        return () => {
            clearInterval(timer);
            document.removeEventListener('visibilitychange', tick);
        };
    }, [status, fetchNew]);

    // ── keep the view at the bottom when new messages arrive (unless they scrolled up to read)
    useEffect(() => {
        const el = listRef.current;
        if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
    }, [rows, status]);

    const onScroll = () => {
        const el = listRef.current;
        if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    };

    const loadOlder = async () => {
        const first = rowsRef.current.find((r) => !r.pending && !r.failed && r.createdAt);
        if (!first?.createdAt || loadingOlder) return;
        setLoadingOlder(true);
        const el = listRef.current;
        const heightBefore = el?.scrollHeight ?? 0;
        try {
            const res = await apiFetch(`${base}/messages?before=${encodeURIComponent(first.createdAt)}`);
            if (!res.ok) return;
            const data = await res.json();
            stickToBottom.current = false;
            mergeIn(data.messages ?? []);
            setHasMore(!!data.hasMore);
            // keep what they were reading in the same place
            requestAnimationFrame(() => {
                if (el) el.scrollTop += el.scrollHeight - heightBefore;
            });
        } finally {
            setLoadingOlder(false);
        }
    };

    // ── sending
    const sendText = async (body: string, replaceId?: string) => {
        const tmpId = `tmp-${++tmpCounter.current}`;
        const pendingRow: Row = { id: tmpId, senderId: '', senderRole: role, text: body, createdAt: new Date().toISOString(), pending: true };
        setSendError(null);
        stickToBottom.current = true;
        setRows((prev) => [...prev.filter((r) => r.id !== replaceId), pendingRow].sort(byTime));
        try {
            const res = await apiFetch(`${base}/messages`, { method: 'POST', body: JSON.stringify({ text: body }) });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                if (res.status === 404) setStatus('gone');
                setSendError(data.error ?? 'Something went wrong. Please try again.');
                setRows((prev) => prev.map((r) => (r.id === tmpId ? { ...r, pending: false, failed: true } : r)));
                return;
            }
            const saved: ChatMessage = data.message;
            setRows((prev) => {
                const without = prev.filter((r) => r.id !== tmpId);
                return without.some((r) => r.id === saved.id) ? without : [...without, saved].sort(byTime);
            });
        } catch {
            setSendError("Couldn't send. Check your connection and try again.");
            setRows((prev) => prev.map((r) => (r.id === tmpId ? { ...r, pending: false, failed: true } : r)));
        }
    };

    const submit = () => {
        const body = text.trim();
        if (!body || status !== 'ready') return;
        setText('');
        sendText(body);
    };

    // ── rendering
    if (status === 'loading') {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
        );
    }
    if (status === 'gone') {
        return (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-gray-600">
                This conversation isn&#39;t available any more.
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-gray-600">
                Couldn&#39;t load the messages.
                <button
                    onClick={() => setReloadKey((k) => k + 1)}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
                >
                    Try again
                </button>
            </div>
        );
    }

    let lastDay = '';
    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-500">
                {role === 'student'
                    ? 'Keep chats about your studies. Never share your address, phone number or passwords.'
                    : 'Keep conversations about learning. Messages are kept on StudyCedo.'}
            </div>

            <div ref={listRef} onScroll={onScroll} className="flex-1 min-h-0 space-y-2 overflow-y-auto px-4 py-4">
                {hasMore && (
                    <div className="text-center">
                        <button
                            onClick={loadOlder}
                            disabled={loadingOlder}
                            className="text-xs font-medium text-blue-600 hover:underline disabled:opacity-50 cursor-pointer"
                        >
                            {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                        </button>
                    </div>
                )}

                {rows.length === 0 && (
                    <p className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello to {otherName}!</p>
                )}

                {rows.map((m) => {
                    const mine = m.senderRole === role;
                    const label = dayLabel(m.createdAt);
                    const showDay = label !== lastDay;
                    lastDay = label;
                    return (
                        <div key={m.id}>
                            {showDay && <div className="my-3 text-center text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</div>}
                            <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                                    <div
                                        className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                                            mine ? 'rounded-br-md bg-blue-600 text-white' : 'rounded-bl-md bg-gray-100 text-gray-900'
                                        } ${m.pending ? 'opacity-60' : ''} ${m.failed ? 'ring-2 ring-red-300' : ''}`}
                                    >
                                        {m.text}
                                    </div>
                                    <div className="mt-0.5 px-1 text-[10px] text-gray-400">
                                        {m.failed ? (
                                            <span className="flex items-center gap-1 text-red-600">
                                                <TriangleAlert className="h-3 w-3" /> Not sent
                                                <button
                                                    onClick={() => sendText(m.text, m.id)}
                                                    className="font-semibold underline cursor-pointer"
                                                >
                                                    Retry
                                                </button>
                                                <button
                                                    onClick={() => setRows((prev) => prev.filter((r) => r.id !== m.id))}
                                                    className="underline cursor-pointer"
                                                >
                                                    Discard
                                                </button>
                                            </span>
                                        ) : m.pending ? (
                                            'Sending…'
                                        ) : m.createdAt ? (
                                            new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                        ) : (
                                            ''
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-gray-200 bg-white p-3">
                {sendError && <p className="mb-2 text-xs text-red-600">{sendError}</p>}
                <div className="flex items-end gap-2">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                submit();
                            }
                        }}
                        rows={1}
                        placeholder={`Message ${otherName}…`}
                        aria-label={`Message ${otherName}`}
                        className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                    <button
                        onClick={submit}
                        disabled={!text.trim()}
                        aria-label="Send message"
                        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-40 cursor-pointer"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </div>
                {text.length > MAX_LEN - 150 && (
                    <p className="mt-1 text-right text-[10px] text-gray-400">
                        {text.length}/{MAX_LEN}
                    </p>
                )}
            </div>
        </div>
    );
}
