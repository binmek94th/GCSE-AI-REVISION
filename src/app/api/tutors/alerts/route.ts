// GET /api/tutors/alerts?status=open|resolved
// The signed-in tutor's help requests from students ("I'm finding this hard").
// Only students the tutor is CURRENTLY linked to are shown — if a student
// stops sharing, their requests disappear from the tutor's view.
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireActiveTutor, getLinkedStudents, timestampToIso } from '@/lib/tutorStudents';

const MAX_RESULTS = 100;

export async function GET(req: NextRequest) {
    const tutorId = await requireActiveTutor(req);
    if (!tutorId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const wanted = req.nextUrl.searchParams.get('status') === 'resolved' ? 'resolved' : 'open';

    try {
        const db = admin.firestore();
        const linked = new Set((await getLinkedStudents(tutorId)).map((l) => l.studentId));

        // Equality-only queries, so no composite index is needed.
        const load = async (status: 'open' | 'resolved') =>
            (await db.collection('tutor_alerts').where('tutorId', '==', tutorId).where('status', '==', status).get()).docs
                .map((d) => ({ id: d.id, ...d.data() } as any))
                .filter((a) => linked.has(a.studentId));

        const [open, resolved] = await Promise.all([load('open'), wanted === 'resolved' ? load('resolved') : Promise.resolve([] as any[])]);
        const rows = wanted === 'resolved' ? resolved : open;

        const alerts = rows
            .map((a) => ({
                id: a.id as string,
                studentId: a.studentId as string,
                studentName: (a.studentName as string) || 'Student',
                materialId: a.materialId as string,
                materialTitle: (a.materialTitle as string) || 'Untitled',
                subject: (a.subject as string) ?? null,
                examBoard: (a.examBoard as string) ?? null,
                level: (a.level as string) ?? null,
                source: (a.source as string) ?? 'study_pack',
                note: (a.note as string) ?? null,
                flagCount: Number(a.flagCount) || 1,
                status: a.status as string,
                createdAt: timestampToIso(a.createdAt),
                updatedAt: timestampToIso(a.updatedAt),
                resolvedAt: timestampToIso(a.resolvedAt),
            }))
            .sort((x, y) => new Date(y.updatedAt ?? 0).getTime() - new Date(x.updatedAt ?? 0).getTime())
            .slice(0, MAX_RESULTS);

        return NextResponse.json({ alerts, openCount: open.length });
    } catch (err) {
        console.error('Tutor alerts error:', err);
        return NextResponse.json({ error: 'Failed to load help requests' }, { status: 500 });
    }
}
