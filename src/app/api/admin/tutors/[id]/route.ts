import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminUid = await requireAdmin(req);
    if (!adminUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const db = admin.firestore();

    const tutorDoc = await db.collection('tutors').doc(id).get();
    if (!tutorDoc.exists) {
        return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }
    const tutorData = tutorDoc.data()!;

    // ── Referrals for this tutor ────────────────────────────────────────
    // ASSUMPTION: mirrors the tutor-facing dashboard's own /api/tutors/me —
    // a `referrals` collection with a `tutorId` field. Adjust if your list
    // route reads from a subcollection instead.
    const referralsSnap = await db.collection('referrals').where('tutorId', '==', id).get();
    const totalReferrals = referralsSnap.size;
    const totalSubscribed = referralsSnap.docs.filter(d => d.data().status === 'subscribed').length;

    // ── Commission events for this tutor ────────────────────────────────
    const commissionSnap = await db.collection('commission_events').where('tutorId', '==', id).get();
    let totalCommissionEarned = 0;
    let totalCommissionPaid = 0;
    for (const doc of commissionSnap.docs) {
        const c = doc.data();
        const amount = c.commissionAmount ?? 0;
        totalCommissionEarned += amount;
        if (c.status === 'paid') totalCommissionPaid += amount;
    }

    // ── Referral link ────────────────────────────────────────────────────
    // ASSUMPTION: matches the /r/[code] redirect route built earlier.
    const origin = req.nextUrl.origin;
    const referralLink = `${origin}/r/${tutorData.referralCode}`;

    // ── Payout method (masked — full details only via the dedicated
    // /payout-method reveal endpoint, which also writes an audit log entry) ──
    const payoutMethod = tutorData.payoutMethod
        ? {
            accountName: tutorData.payoutMethod.accountName ?? null,
            sortCodeLast: tutorData.payoutMethod.sortCode
                ? `${tutorData.payoutMethod.sortCode.slice(0, 2)}-${tutorData.payoutMethod.sortCode.slice(2, 4)}-${tutorData.payoutMethod.sortCode.slice(4, 6)}`
                : null,
            accountNumberLast4: tutorData.payoutMethod.accountNumber
                ? tutorData.payoutMethod.accountNumber.slice(-4)
                : null,
            updatedAt: tutorData.payoutMethod.updated_at?.toDate?.()?.toISOString() ?? null,
        }
        : null;

    return NextResponse.json({
        tutor: {
            id: tutorDoc.id,
            name: tutorData.name ?? '',
            email: tutorData.email ?? '',
            referralCode: tutorData.referralCode ?? '',
            referralLink,
            status: tutorData.status ?? 'active',
            createdAt: tutorData.createdAt?.toDate?.()?.toISOString() ?? null,
            totalReferrals,
            totalSubscribed,
            totalCommissionEarned,
            totalCommissionPaid,
            payoutMethod,
        },
    });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const adminUid = await requireAdmin(req);
    if (!adminUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ['active', 'inactive', 'invited'];
    if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: `status must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const tutorRef = admin.firestore().collection('tutors').doc(id);
    const tutorDoc = await tutorRef.get();
    if (!tutorDoc.exists) {
        return NextResponse.json({ error: 'Tutor not found' }, { status: 404 });
    }

    await tutorRef.update({ status });

    return NextResponse.json({ message: 'Updated' });
}