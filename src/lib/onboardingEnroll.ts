// src/lib/onboardingEnroll.ts
//
// Turns the subjects a student picked in onboarding into real study-pack
// enrolments (users/{uid}/subjects/{packId}).
//
// Onboarding only saves the choices on the user document (subjects: [{name,
// tier, targetGrade}], examBoard, level). The dashboard, the study plan and the
// quizzes all work from the ENROLLED packs, so without this step a student who
// has just chosen their subjects is told to go and add study packs.
//
// Idempotent, and it runs at most once per student: `onboardingEnrolledAt`
// is recorded afterwards so that a student who later removes a pack isn't
// silently given it back.
import admin from '@/lib/firebaseAdmin';

export interface EnrolledFromOnboarding {
    packId: string;
    subject: string;
    tier: string | null;
    targetGrade: string | null;
}

export interface OnboardingEnrollResult {
    status: 'enrolled' | 'already_done' | 'nothing_to_enroll';
    enrolled: EnrolledFromOnboarding[];
    /** Subject names that didn't match any study pack (the student can add them by hand). */
    unmatched: string[];
}

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase();
const isUntiered = (t: unknown) => !norm(t) || norm(t) === 'untiered';

interface PackRow {
    id: string;
    subject?: string;
    tier?: string;
}

/**
 * Finds the pack for one onboarding choice among packs already limited to the
 * student's exam board and level.
 *   - a chosen tier must match that pack's tier;
 *   - no tier chosen means the untiered pack;
 *   - if the tier text doesn't line up but the subject has exactly one pack,
 *     that's clearly the one. With several, don't guess — leave it unmatched.
 */
export function matchPack(packs: PackRow[], name: string, tier: string | null | undefined): PackRow | null {
    const candidates = packs.filter((p) => norm(p.subject) === norm(name));
    if (candidates.length === 0) return null;

    const exact = isUntiered(tier)
        ? candidates.find((p) => isUntiered(p.tier))
        : candidates.find((p) => norm(p.tier) === norm(tier));
    if (exact) return exact;

    return candidates.length === 1 ? candidates[0] : null;
}

export async function enrollFromOnboarding(uid: string): Promise<OnboardingEnrollResult> {
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return { status: 'nothing_to_enroll', enrolled: [], unmatched: [] };

    const user = userSnap.data() || {};
    if (user.onboardingEnrolledAt) return { status: 'already_done', enrolled: [], unmatched: [] };

    const chosen: { name: string; tier: string | null; targetGrade: string | null }[] = (
        Array.isArray(user.subjects) ? user.subjects : []
    )
        .map((s: any) => ({
            name: String(s?.name ?? s?.subject ?? '').trim(),
            tier: s?.tier ? String(s.tier) : null,
            targetGrade: s?.targetGrade ? String(s.targetGrade) : null,
        }))
        .filter((s: { name: string }) => s.name);

    const examBoard: string | null = user.examBoard ?? user.preferences?.examBoard ?? null;
    const level: string | null = user.level ?? user.preferences?.level ?? null;

    // Onboarding hasn't produced anything to enrol yet — try again next time.
    if (chosen.length === 0 || !examBoard || !level) {
        return { status: 'nothing_to_enroll', enrolled: [], unmatched: [] };
    }

    // Same query the Study Pack tab uses to list the packs a student can add.
    const packsSnap = await db
        .collection('study_packs')
        .where('exam_board', '==', examBoard)
        .where('level', '==', level)
        .get();
    const packs: PackRow[] = packsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }));

    const existingSnap = await userRef.collection('subjects').get();
    const alreadyEnrolled = new Set(existingSnap.docs.map((d) => d.id));

    // enroll-subject records the student's preferences as the enrolment's
    // board/level, and /api/dashboard filters enrolments by that level.
    const enrolBoard = user.preferences?.examBoard ?? examBoard;
    const enrolLevel = user.preferences?.level ?? level;

    const enrolled: EnrolledFromOnboarding[] = [];
    const unmatched: string[] = [];
    const seen = new Set<string>();
    const batch = db.batch();

    for (const choice of chosen) {
        const pack = matchPack(packs, choice.name, choice.tier);
        if (!pack) {
            unmatched.push(choice.name);
            continue;
        }
        if (seen.has(pack.id) || alreadyEnrolled.has(pack.id)) continue;
        seen.add(pack.id);

        const tier = isUntiered(pack.tier) ? null : (pack.tier as string);
        batch.set(
            userRef.collection('subjects').doc(pack.id),
            {
                subject: pack.subject ?? choice.name,
                examBoard: enrolBoard,
                level: enrolLevel,
                ...(choice.targetGrade && { targetGrade: choice.targetGrade }),
                ...(tier && { tier }),
                source: 'onboarding',
                enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
                lastOpenedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
        enrolled.push({ packId: pack.id, subject: pack.subject ?? choice.name, tier, targetGrade: choice.targetGrade });
    }

    batch.set(
        userRef,
        {
            onboardingEnrolledAt: admin.firestore.FieldValue.serverTimestamp(),
            onboardingEnrollSummary: { enrolled: enrolled.length, unmatched },
        },
        { merge: true }
    );
    await batch.commit();

    return { status: enrolled.length > 0 ? 'enrolled' : 'nothing_to_enroll', enrolled, unmatched };
}
