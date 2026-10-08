// GET /api/tutors/students
// The signed-in tutor's roster: every student linked via the tutor's referral
// link or via the tutor's code, with a light progress summary for each.
import { NextRequest, NextResponse } from 'next/server';
import { requireActiveTutor, getLinkedStudents, buildStudentSummary } from '@/lib/tutorStudents';

const MAX_STUDENTS = 200;

export async function GET(req: NextRequest) {
    const tutorId = await requireActiveTutor(req);
    if (!tutorId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const links = (await getLinkedStudents(tutorId)).slice(0, MAX_STUDENTS);
        const summaries = (await Promise.all(links.map(buildStudentSummary)))
            .filter((s): s is NonNullable<typeof s> => s !== null);

        // Most recently active first; students who never started go last.
        summaries.sort((a, b) => {
            if (!a.lastActiveAt) return 1;
            if (!b.lastActiveAt) return -1;
            return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
        });

        return NextResponse.json({ students: summaries });
    } catch (err) {
        console.error('Tutor roster error:', err);
        return NextResponse.json({ error: 'Failed to load students' }, { status: 500 });
    }
}
