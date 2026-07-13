import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';

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