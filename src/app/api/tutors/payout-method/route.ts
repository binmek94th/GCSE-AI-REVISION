import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

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
    const { accountName, sortCode, accountNumber } = body;

    if (typeof accountName !== 'string' || !accountName.trim()) {
        return NextResponse.json({ error: 'Missing account name' }, { status: 400 });
    }
    if (typeof sortCode !== 'string' || !/^\d{6}$/.test(sortCode)) {
        return NextResponse.json({ error: 'Sort code must be 6 digits' }, { status: 400 });
    }
    if (typeof accountNumber !== 'string' || !/^\d{8}$/.test(accountNumber)) {
        return NextResponse.json({ error: 'Account number must be 8 digits' }, { status: 400 });
    }

    const db = admin.firestore();
    const tutorRef = db.collection('tutors').doc(decoded.uid);
    const tutorSnap = await tutorRef.get();

    if (!tutorSnap.exists) {
        return NextResponse.json({ error: 'Tutor record not found' }, { status: 404 });
    }

    // NOTE: storing raw sort code + account number in Firestore as-is.
    // These aren't card numbers so they're lower-risk than PCI-scope data,
    // but they're still bank credentials — worth encrypting at rest before
    // production traffic relies on this (e.g. via a KMS-wrapped key, same
    // idea as pycryptodome usage in the Python pipelines) rather than
    // storing plaintext.
    const sortCodeFormatted = `${sortCode.slice(0, 2)}-${sortCode.slice(2, 4)}-${sortCode.slice(4, 6)}`;
    const accountNumberLast4 = accountNumber.slice(-4);

    await tutorRef.update({
        payoutMethod: {
            accountName: accountName.trim(),
            sortCode,                // full value, server-side only — never returned in full to client
            accountNumber,           // full value, server-side only — never returned in full to client
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        },
    });

    return NextResponse.json({
        payoutMethod: {
            accountName: accountName.trim(),
            sortCodeLast: sortCodeFormatted,
            accountNumberLast4,
            updatedAt: new Date().toISOString(),
        },
    });
}