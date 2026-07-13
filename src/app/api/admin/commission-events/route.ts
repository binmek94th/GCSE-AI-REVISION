import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export async function GET(req: NextRequest) {
    const adminUid = await requireAdmin(req);
    if (!adminUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const status = req.nextUrl.searchParams.get('status'); // 'pending' | 'approved' | 'paid' | null (all)

    const db = admin.firestore();
    let query: FirebaseFirestore.Query = db.collection('commission_events').orderBy('createdAt', 'desc');
    if (status) {
        query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(500).get();

    // Join tutor names — fetch distinct tutorIds in one batch of lookups.
    const tutorIds = Array.from(new Set(snapshot.docs.map(d => d.data().tutorId)));
    const tutorDocs = await Promise.all(tutorIds.map(id => db.collection('tutors').doc(id).get()));
    const tutorNames = new Map(tutorDocs.map(d => [d.id, d.exists ? d.data()!.name : 'Unknown']));

    const events = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            tutorId: d.tutorId,
            tutorName: tutorNames.get(d.tutorId) ?? 'Unknown',
            referredUserId: d.referredUserId,
            subscriptionAmount: d.subscriptionAmount,
            commissionAmount: d.commissionAmount,
            status: d.status,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
            paidAt: d.paidAt?.toDate?.()?.toISOString() ?? null,
            payoutNote: d.payoutNote,
        };
    });

    return NextResponse.json({ events });
}