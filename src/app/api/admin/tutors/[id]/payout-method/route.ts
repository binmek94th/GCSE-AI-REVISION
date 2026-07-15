import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

// NOTE: mirrors whatever admin-check your other /api/admin/* routes use —
// I don't have that helper in front of me, so this assumes a
// `requireAdmin(idToken)` you already have. Swap in your actual check if
// the name/shape differs.
async function requireAdmin(idToken: string) {
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await admin.firestore().collection('users').doc(decoded.uid).get();
    if (userDoc.data()?.role !== 'admin') {
        return null;
    }
    return decoded;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let adminUser;
    try {
        adminUser = await requireAdmin(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    if (!adminUser) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: tutorId } = await params;
    const tutorSnap = await admin.firestore().collection('tutors').doc(tutorId).get();

    if (!tutorSnap.exists) {
        return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    const payoutMethod = tutorSnap.data()?.payoutMethod;
    if (!payoutMethod) {
        return NextResponse.json({ error: 'No payout method on file' }, { status: 404 });
    }

    // ✅ Audit log every time full bank details are revealed to an admin —
    // this is the kind of access that should be traceable later (who
    // looked up whose bank details, and when), same spirit as the
    // needsReview / auto-approve streak logging elsewhere in the app.
    await admin.firestore().collection('admin_audit_log').add({
        action: 'reveal_tutor_payout_method',
        adminUid: adminUser.uid,
        tutorId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
        accountName: payoutMethod.accountName ?? null,
        sortCode: payoutMethod.sortCode ?? null,       // full value — admin-only
        accountNumber: payoutMethod.accountNumber ?? null, // full value — admin-only
        updatedAt: payoutMethod.updated_at?.toDate?.()?.toISOString() ?? null,
    });
}