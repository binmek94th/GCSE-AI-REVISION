// PATCH /api/tutors/alerts/:alertId   body: { status: 'open' | 'resolved' }
// Lets a tutor mark a help request as handled (or reopen it). A tutor can only
// change their own alerts.
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireActiveTutor } from '@/lib/tutorStudents';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ alertId: string }> }) {
    const tutorId = await requireActiveTutor(req);
    if (!tutorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let status: unknown;
    try {
        status = (await req.json())?.status;
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    if (status !== 'open' && status !== 'resolved') {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { alertId } = await params;

    try {
        const ref = admin.firestore().collection('tutor_alerts').doc(alertId);
        const snap = await ref.get();
        // Same 404 for "doesn't exist" and "not yours", so ids can't be probed.
        if (!snap.exists || snap.data()?.tutorId !== tutorId) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        await ref.update({
            status,
            resolvedAt: status === 'resolved' ? admin.firestore.FieldValue.serverTimestamp() : null,
        });
        return NextResponse.json({ id: alertId, status });
    } catch (err) {
        console.error('Update tutor alert error:', err);
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
}
