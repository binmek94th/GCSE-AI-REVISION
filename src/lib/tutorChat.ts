// src/lib/tutorChat.ts
//
// Student <-> tutor messaging: who may talk to whom, and message validation.
//
// A conversation exists for a (tutor, student) pair and is stored as
//   tutor_chats/{tutorId}_{studentId}                  summary: names, last message, unread counts
//   tutor_chats/{tutorId}_{studentId}/messages/{id}    one document per message
// Only the Admin SDK touches these (client access is denied by default), so every read
// and write goes through the API routes, which call resolveChatAccess() first.
import admin from '@/lib/firebaseAdmin';
import { isStudentLinked, displayNameOf, timestampToIso } from '@/lib/tutorStudents';

export type ChatRole = 'tutor' | 'student';

export const MESSAGE_MAX = 1000;
export const PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;
export const RATE_LIMIT_PER_MINUTE = 15;

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
export const isValidId = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);

export const chatId = (tutorId: string, studentId: string) => `${tutorId}_${studentId}`;

/** Tidy a message: normalise line breaks, drop control characters, cap blank lines. Null if empty or too long. */
export function cleanMessage(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const text = value
        .replace(/\r\n?/g, '\n')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return text.length >= 1 && text.length <= MESSAGE_MAX ? text : null;
}

export interface ChatAccess {
    role: ChatRole;
    tutorId: string;
    studentId: string;
    tutorName: string;
    studentName: string; // only filled when asked for (it costs a read)
}

/**
 * Can `uid` use the conversation between this tutor and this student?
 * Yes only if they ARE one of the two, the tutor account is active, and the student is
 * currently linked to that tutor (a student who has removed the tutor is no longer linked,
 * which hides the conversation from both sides). Returns null otherwise — callers answer
 * with the same 404 for every "no", so ids can't be probed.
 */
export async function resolveChatAccess(
    uid: string,
    tutorId: string,
    studentId: string,
    opts: { withStudentName?: boolean } = {}
): Promise<ChatAccess | null> {
    if (tutorId === studentId) return null;
    if (uid !== tutorId && uid !== studentId) return null;

    const db = admin.firestore();
    const [tutorSnap, linked, studentSnap] = await Promise.all([
        db.collection('tutors').doc(tutorId).get(),
        isStudentLinked(tutorId, studentId),
        opts.withStudentName ? db.collection('users').doc(studentId).get() : Promise.resolve(null),
    ]);
    if (!tutorSnap.exists || tutorSnap.data()?.status !== 'active' || !linked) return null;

    return {
        role: uid === tutorId ? 'tutor' : 'student',
        tutorId,
        studentId,
        tutorName: (tutorSnap.data()?.name as string) || 'Your tutor',
        studentName: studentSnap?.exists ? displayNameOf(studentSnap.data() ?? {}, null) : '',
    };
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderRole: ChatRole;
    text: string;
    createdAt: string | null;
}

export const toChatMessage = (id: string, data: FirebaseFirestore.DocumentData): ChatMessage => ({
    id,
    senderId: String(data.senderId ?? ''),
    senderRole: data.senderRole === 'tutor' ? 'tutor' : 'student',
    text: String(data.text ?? ''),
    createdAt: timestampToIso(data.createdAt),
});
