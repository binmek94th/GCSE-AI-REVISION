// POST /api/onboarding/enroll
// Enrols the signed-in student in the study packs that match the subjects they
// chose in onboarding, then builds their study plan so those subjects are in it
// straight away. Safe to call repeatedly: it only acts the first time.
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { enrollFromOnboarding } from '@/lib/onboardingEnroll';
import { generateStudyPlanForUser } from '@/lib/services/studyPlanGenerator';

export async function POST(req: NextRequest) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Guests taking the free assessment aren't enrolled: the daily plan job
    // builds an AI plan for every user with enrolled packs, so enrolling
    // abandoned guest sessions would cost money for no one. They're enrolled
    // from their onboarding choices after they create an account.
    if (decoded.firebase?.sign_in_provider === 'anonymous') {
        return NextResponse.json({ status: 'guest', enrolled: 0, unmatched: [] });
    }

    try {
        const result = await enrollFromOnboarding(decoded.uid);

        // Same as enrolling through the Study Pack tab: build the plan now so
        // it's there when the student lands on the dashboard. Awaited so the
        // host doesn't stop the function mid-way; a failure here is non-fatal
        // because the scheduled job generates it as a fallback.
        if (result.enrolled.length > 0) {
            try {
                await generateStudyPlanForUser(decoded.uid);
            } catch (planError) {
                console.error(`Study plan generation failed after onboarding enrolment for ${decoded.uid}:`, planError);
            }
        }

        return NextResponse.json({
            status: result.status,
            enrolled: result.enrolled.length,
            subjects: result.enrolled.map((e) => e.subject),
            unmatched: result.unmatched,
        });
    } catch (err) {
        console.error('Onboarding enrol error:', err);
        return NextResponse.json({ error: 'Failed to set up your study packs' }, { status: 500 });
    }
}
