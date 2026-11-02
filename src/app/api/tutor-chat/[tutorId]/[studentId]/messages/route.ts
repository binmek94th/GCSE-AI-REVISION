// GET  /api/tutor-chat/:tutorId/:studentId/messages
//        (no params)        the latest messages, oldest first
//        ?since=<ISO time>  only messages newer than that (used for polling)
//        ?before=<ISO time> an older page (for "load earlier messages")
//        ?limit=<n>         page size (default 50, max 100)
// POST /api/tutor-chat/:tutorId/:studentId/messages   body: { text }
//
// Only the tutor or the student of the pair, and only while they are linked.
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { uidFromRequest } from '@/lib/tutorStudents';
import {
    chatId, cleanMessage, isValidId, resolveChatAccess, toChatMessage,
    MESSAGE_MAX, PAGE_SIZE, MAX_PAGE_SIZE, RATE_LIMIT_PER_MINUTE,
} from '@/lib/tutorChat';

type Ctx = { params: Promise<{ tutorId: string; studentId: string }> };

const NOT_FOUND = () => NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

function parseTime(value: string | null): FirebaseFirestore.Timestamp | null | 'invalid' {
    if (value === null) return null;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? admin.firestore.Timestamp.fromMillis(ms) : 'invalid';
}

export async function GET(req: NextRequest, { params }: Ctx) {
    const uid = await uidFromRequest(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tutorId, studentId } = await params;
    if (!isValidId(tutorId) || !isValidId(studentId)) return NOT_FOUND();

    try {
        const access = await resolveChatAccess(uid, tutorId, studentId);
        if (!access) return NOT_FOUND();

        const sp = req.nextUrl.searchParams;
        const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '', 10) || PAGE_SIZE, 1), MAX_PAGE_SIZE);
        const since = parseTime(sp.get('since'));
        const before = parseTime(sp.get('before'));
        if (since === 'invalid' || before === 'invalid') {
            return NextResponse.json({ error: 'Invalid time' }, { status: 400 });
        }

        const col = admin.firestore().collection('tutor_chats').doc(chatId(tutorId, studentId)).collection('messages');

        if (since) {
            // Single-field range + order on the same field: no composite index needed.
            const snap = await col.where('createdAt', '>', since).orderBy('createdAt', 'asc').limit(MAX_PAGE_SIZE).get();
            return NextResponse.json({ messages: snap.docs.map((d) => toChatMessage(d.id, d.data())), hasMore: false });
        }

        const base = before ? col.where('createdAt', '<', before) : col;
        const snap = await base.orderBy('createdAt', 'desc').limit(limit + 1).get();
        const hasMore = snap.docs.length > limit;
        const page = snap.docs.slice(0, limit).reverse();
        return NextResponse.json({ messages: page.map((d) => toChatMessage(d.id, d.data())), hasMore });
    } catch (err) {
        console.error('Tutor chat load error:', err);
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: Ctx) {
    const uid = await uidFromRequest(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tutorId, studentId } = await params;
    if (!isValidId(tutorId) || !isValidId(studentId)) return NOT_FOUND();

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    const text = cleanMessage(body?.text);
    if (!text) {
        return NextResponse.json({ error: `Write a message (up to ${MESSAGE_MAX} characters).` }, { status: 400 });
    }

    try {
        const access = await resolveChatAccess(uid, tutorId, studentId, { withStudentName: true });
        if (!access) return NOT_FOUND();

        const db = admin.firestore();
        const convRef = db.collection('tutor_chats').doc(chatId(tutorId, studentId));
        const msgs = convRef.collection('messages');

        // Slow down floods: look at the 20 newest messages and count this sender's in the last minute.
        const recent = await msgs.orderBy('createdAt', 'desc').limit(20).get();
        const now = Date.now();
        const mine = recent.docs.filter((d) => {
            const data = d.data();
            const ms = typeof data.createdAt?.toMillis === 'function' ? data.createdAt.toMillis() : 0;
            return data.senderId === uid && now - ms < 60_000;
        }).length;
        if (mine >= RATE_LIMIT_PER_MINUTE) {
            return NextResponse.json({ error: "You're sending messages very quickly. Wait a moment and try again." }, { status: 429 });
        }

        const msgRef = msgs.doc();
        const serverNow = admin.firestore.FieldValue.serverTimestamp();
        const fromTutor = access.role === 'tutor';
        const batch = db.batch();
        batch.set(msgRef, { senderId: uid, senderRole: access.role, text, createdAt: serverNow });
        batch.set(
            convRef,
            {
                tutorId,
                studentId,
                tutorName: access.tutorName,
                studentName: access.studentName,
                lastMessage: text.replace(/\s+/g, ' ').slice(0, 140),
                lastMessageAt: serverNow,
                lastSenderRole: access.role,
                // The sender has obviously seen the conversation; the other side has one more to read.
                unreadForTutor: fromTutor ? 0 : admin.firestore.FieldValue.increment(1),
                unreadForStudent: fromTutor ? admin.firestore.FieldValue.increment(1) : 0,
            },
            { merge: true }
        );
        await batch.commit();

        return NextResponse.json({
            message: { id: msgRef.id, senderId: uid, senderRole: access.role, text, createdAt: new Date(now).toISOString() },
        });
    } catch (err) {
        console.error('Tutor chat send error:', err);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
