// POST /api/tutor-chat/:tutorId/:studentId/read
// The caller has seen the conversation: clear THEIR unread counter (not the other person's).
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { uidFromRequest } from '@/lib/tutorStudents';
import { chatId, isValidId, resolveChatAccess } from '@/lib/tutorChat';

export async function POST(req: NextRequest, { params }: { params: Promise<{ tutorId: string; studentId: string }> }) {
    const uid = await uidFromRequest(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { tutorId, studentId } = await params;
    if (!isValidId(tutorId) || !isValidId(studentId)) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    try {
        const access = await resolveChatAccess(uid, tutorId, studentId);
        if (!access) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });

        const ref = admin.firestore().collection('tutor_chats').doc(chatId(tutorId, studentId));
        const snap = await ref.get();
        if (snap.exists) {
            await ref.update(access.role === 'tutor' ? { unreadForTutor: 0 } : { unreadForStudent: 0 });
        }
        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Tutor chat read error:', err);
        return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
    }
}
