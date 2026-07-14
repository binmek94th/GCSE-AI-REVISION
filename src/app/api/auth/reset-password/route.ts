import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { email, code, newPassword } = body;

    if (!email || !code || !newPassword) {
        return NextResponse.json({ error: 'Missing email, code, or new password' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);
    if (!userRecord) {
        // Deliberately generic — don't confirm/deny account existence.
        return NextResponse.json({ error: 'Invalid or expired code' }, { status: 400 });
    }

    const db = admin.firestore();
    const codeRef = db.collection('password_reset_codes').doc(userRecord.uid);
    const codeSnap = await codeRef.get();

    if (!codeSnap.exists) {
        return NextResponse.json({ error: 'Invalid or expired code. Please request a new one.' }, { status: 400 });
    }

    const data = codeSnap.data()!;
    const attempts = data.attempts ?? 0;

    if (attempts >= MAX_ATTEMPTS) {
        return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 429 });
    }

    const expiresAt: Date | null = data.expiresAt?.toDate?.() ?? null;
    if (!expiresAt || new Date() > expiresAt) {
        return NextResponse.json({ error: 'This code has expired. Please request a new one.' }, { status: 400 });
    }

    if (data.code !== String(code).trim()) {
        await codeRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
        const remaining = MAX_ATTEMPTS - attempts - 1;
        return NextResponse.json(
            { error: `Incorrect code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}` },
            { status: 400 }
        );
    }

    // Correct code — set the new password directly and clean up.
    await admin.auth().updateUser(userRecord.uid, { password: newPassword });
    await codeRef.delete();

    return NextResponse.json({ message: 'Password reset successfully' });
}