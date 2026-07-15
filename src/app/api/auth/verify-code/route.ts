import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const body = await req.json();
    const { code } = body;
    if (!code || typeof code !== 'string') {
        return NextResponse.json({ error: 'Missing code' }, { status: 400 });
    }

    const db = admin.firestore();
    const codeRef = db.collection('email_verification_codes').doc(decoded.uid);
    const codeSnap = await codeRef.get();

    if (!codeSnap.exists) {
        return NextResponse.json({ error: 'No verification code found. Please request a new one.' }, { status: 400 });
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

    if (data.code !== code.trim()) {
        await codeRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
        const remaining = MAX_ATTEMPTS - attempts - 1;
        return NextResponse.json(
            { error: `Incorrect code. ${remaining > 0 ? `${remaining} attempt(s) remaining.` : 'Please request a new code.'}` },
            { status: 400 }
        );
    }

    await admin.auth().updateUser(decoded.uid, { emailVerified: true });
    await codeRef.delete();

    return NextResponse.json({ message: 'Email verified', verified: true });
}