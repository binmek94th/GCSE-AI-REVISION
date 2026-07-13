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

    const snapshot = await admin.firestore()
        .collection('referrals')
        .where('tutorId', '==', id)
        .orderBy('signedUpAt', 'desc')
        .get();

    const referrals = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            referredEmail: d.referredEmail,
            status: d.status,
            signedUpAt: d.signedUpAt?.toDate?.()?.toISOString() ?? null,
            subscribedAt: d.subscribedAt?.toDate?.()?.toISOString() ?? null,
            churnedAt: d.churnedAt?.toDate?.()?.toISOString() ?? null,
            firstYearEndsAt: d.firstYearEndsAt?.toDate?.()?.toISOString() ?? null,
        };
    });

    return NextResponse.json({ referrals });
}