// GET /api/tutor-chat/conversations?role=student|tutor
//
// role=student  one row per ACTIVE tutor the student is linked to (even before any
//               message, so they can start a chat), with the last message + unread count.
// role=tutor    the tutor's conversations with students they're still linked to, newest first.
//
// Rows only appear while the link exists: if a student removes a tutor, the
// conversation vanishes from both lists (and the history comes back only if they re-add them).
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { uidFromRequest, getActiveTutorsForStudent, getLinkedStudents, timestampToIso } from '@/lib/tutorStudents';

interface Row {
    tutorId: string;
    studentId: string;
    otherId: string;
    otherName: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    lastSenderRole: 'tutor' | 'student' | null;
    unread: number;
}

const byRecent = (a: Row, b: Row) => {
    const x = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const y = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return y - x;
};

export async function GET(req: NextRequest) {
    const uid = await uidFromRequest(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = req.nextUrl.searchParams.get('role') === 'tutor' ? 'tutor' : 'student';
    const db = admin.firestore();

    try {
        let rows: Row[] = [];

        if (role === 'student') {
            const [tutors, convSnap] = await Promise.all([
                getActiveTutorsForStudent(uid),
                db.collection('tutor_chats').where('studentId', '==', uid).get(),
            ]);
            const convByTutor = new Map(convSnap.docs.map((d) => [d.data().tutorId as string, d.data()]));
            rows = tutors.map((t) => {
                const c = convByTutor.get(t.tutorId);
                return {
                    tutorId: t.tutorId,
                    studentId: uid,
                    otherId: t.tutorId,
                    otherName: t.name || 'Your tutor',
                    lastMessage: (c?.lastMessage as string) ?? null,
                    lastMessageAt: timestampToIso(c?.lastMessageAt),
                    lastSenderRole: (c?.lastSenderRole as 'tutor' | 'student') ?? null,
                    unread: Number(c?.unreadForStudent) || 0,
                };
            });
        } else {
            const tutorSnap = await db.collection('tutors').doc(uid).get();
            if (!tutorSnap.exists || tutorSnap.data()?.status !== 'active') {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
            const [linked, convSnap] = await Promise.all([
                getLinkedStudents(uid),
                db.collection('tutor_chats').where('tutorId', '==', uid).get(),
            ]);
            const linkedIds = new Set(linked.map((l) => l.studentId));
            rows = convSnap.docs
                .map((d) => d.data())
                .filter((c) => linkedIds.has(c.studentId) && c.lastMessageAt)
                .map((c) => ({
                    tutorId: uid,
                    studentId: c.studentId as string,
                    otherId: c.studentId as string,
                    otherName: (c.studentName as string) || 'Student',
                    lastMessage: (c.lastMessage as string) ?? null,
                    lastMessageAt: timestampToIso(c.lastMessageAt),
                    lastSenderRole: (c.lastSenderRole as 'tutor' | 'student') ?? null,
                    unread: Number(c.unreadForTutor) || 0,
                }));
        }

        rows.sort(byRecent);
        return NextResponse.json({
            conversations: rows.slice(0, 100),
            totalUnread: rows.reduce((sum, r) => sum + r.unread, 0),
        });
    } catch (err) {
        console.error('Tutor chat conversations error:', err);
        return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
    }
}
