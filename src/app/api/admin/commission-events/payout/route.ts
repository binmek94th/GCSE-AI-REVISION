import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

export async function POST(req: NextRequest) {
    const adminUid = await requireAdmin(req);
    if (!adminUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { eventIds, note } = body as { eventIds?: string[]; note?: string };

    if (!Array.isArray(eventIds) || eventIds.length === 0) {
        return NextResponse.json({ error: 'eventIds must be a non-empty array' }, { status: 400 });
    }

    const db = admin.firestore();

    // Fetch all events first so we can validate + total up per tutor for
    // the totalCommissionPaid increments.
    const eventRefs = eventIds.map(id => db.collection('commission_events').doc(id));
    const eventSnaps = await db.getAll(...eventRefs);

    const amountByTutor = new Map<string, number>();
    const batch = db.batch();
    let skipped = 0;

    for (const snap of eventSnaps) {
        if (!snap.exists) { skipped++; continue; }
        const data = snap.data()!;
        if (data.status === 'paid') { skipped++; continue; } // already paid — don't double-count

        batch.update(snap.ref, {
            status: 'paid',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            paidBy: adminUid,
            payoutNote: note ?? null,
        });

        amountByTutor.set(data.tutorId, (amountByTutor.get(data.tutorId) ?? 0) + data.commissionAmount);
    }

    for (const [tutorId, amount] of amountByTutor.entries()) {
        batch.update(db.collection('tutors').doc(tutorId), {
            totalCommissionPaid: admin.firestore.FieldValue.increment(amount),
        });
    }

    await batch.commit();

    return NextResponse.json({
        message: 'Payout recorded',
        eventsMarkedPaid: eventSnaps.length - skipped,
        skipped,
    });
}