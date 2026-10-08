// GET /api/tutors/students/:studentId
// Full study / weekly / quiz progress for ONE student. Only returns data if
// the signed-in tutor is currently linked to that student.
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveTutor, getLinkedStudents, buildStudentDetail } from '@/lib/tutorStudents';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ studentId: string }> }
) {
    const tutorId = await requireActiveTutor(req);
    if (!tutorId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { studentId } = await params;

    try {
        // Authorisation: the student must be in THIS tutor's current roster.
        // Same 404 whether the student doesn't exist or isn't theirs, so ids
        // can't be probed.
        const link = (await getLinkedStudents(tutorId)).find((l) => l.studentId === studentId);
        if (!link) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }

        const detail = await buildStudentDetail(link);
        if (!detail) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 });
        }
        return NextResponse.json(detail);
    } catch (err) {
        console.error('Tutor student detail error:', err);
        return NextResponse.json({ error: 'Failed to load student' }, { status: 500 });
    }
}
