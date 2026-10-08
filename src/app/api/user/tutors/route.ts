// Student-side tutor linking.
//   GET     /api/user/tutors            -> tutors this student currently shares progress with
//   POST    /api/user/tutors {code}     -> add a tutor using the code the tutor gave them
//   DELETE  /api/user/tutors?tutorId=…  -> stop sharing progress with a tutor
//
// Uses the tutor's existing referral code as the "tutor code". Linking this
// way does NOT create a referral record, so it has no effect on referral
// counts or commission.
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { resolveTutorByReferralCode } from '@/lib/referral';
import { uidFromRequest, linkDocId } from '@/lib/tutorStudents';

const db = () => admin.firestore();

export async function GET(req: NextRequest) {
    const uid = await uidFromRequest(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const [referralSnap, linkSnap] = await Promise.all([
            db().collection('referrals').where('referredUserId', '==', uid).get(),
            db().collection('tutor_students').where('studentId', '==', uid).get(),
        ]);

        const revoked = new Set<string>();
        const tutorIds = new Map<string, 'referral_link' | 'code'>();

        linkSnap.docs.forEach((d) => {
            const data = d.data();
            if (data.status === 'revoked') revoked.add(data.tutorId);
            else tutorIds.set(data.tutorId, 'code');
        });
        referralSnap.docs.forEach((d) => {
            const tutorId = d.data().tutorId;
            if (tutorId && !revoked.has(tutorId) && !tutorIds.has(tutorId)) {
                tutorIds.set(tutorId, 'referral_link');
            }
        });

        const tutors = (
            await Promise.all(
                Array.from(tutorIds.entries()).map(async ([tutorId, source]) => {
                    const snap = await db().collection('tutors').doc(tutorId).get();
                    if (!snap.exists || snap.data()?.status !== 'active') return null;
                    // Only the tutor's name — nothing else about them is shared.
                    return { tutorId, name: snap.data()!.name as string, source };
                })
            )
        ).filter((t): t is NonNullable<typeof t> => t !== null);

        return NextResponse.json({ tutors });
    } catch (err) {
        console.error('List student tutors error:', err);
        return NextResponse.json({ error: 'Failed to load tutors' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const uid = await uidFromRequest(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let code = '';
    try {
        const body = await req.json();
        code = typeof body?.code === 'string' ? body.code.trim().toLowerCase() : '';
    } catch {
        // fall through to the validation below
    }
    if (!code || code.length > 80) {
        return NextResponse.json({ error: 'Enter your tutor code' }, { status: 400 });
    }

    try {
        const tutor = await resolveTutorByReferralCode(code);
        // One generic message for unknown / inactive codes so codes can't be probed.
        if (!tutor) {
            return NextResponse.json({ error: "That code isn't valid. Check it with your tutor and try again." }, { status: 404 });
        }
        if (tutor.id === uid) {
            return NextResponse.json({ error: "You can't add yourself as your own tutor." }, { status: 400 });
        }

        const user = await admin.auth().getUser(uid);
        const userDoc = await db().collection('users').doc(uid).get();
        const userData = userDoc.data() || {};

        const ref = db().collection('tutor_students').doc(linkDocId(tutor.id, uid));
        const existing = await ref.get();

        if (existing.exists && existing.data()?.status === 'active') {
            return NextResponse.json({ added: false, alreadyLinked: true, tutor: { tutorId: tutor.id, name: tutor.name } });
        }

        await ref.set({
            tutorId: tutor.id,
            studentId: uid,
            studentEmail: user.email ?? null,
            studentName: userData.displayName ?? userData.name ?? userData.username ?? null,
            source: 'code',
            status: 'active',
            linkedAt: admin.firestore.FieldValue.serverTimestamp(),
            revokedAt: null,
        });

        return NextResponse.json({ added: true, tutor: { tutorId: tutor.id, name: tutor.name } });
    } catch (err) {
        console.error('Add tutor error:', err);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const uid = await uidFromRequest(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tutorId = req.nextUrl.searchParams.get('tutorId');
    if (!tutorId) return NextResponse.json({ error: 'Missing tutorId' }, { status: 400 });

    try {
        // Written as a "revoked" marker rather than deleting, so it also hides
        // a student who was linked through the tutor's referral link.
        await db().collection('tutor_students').doc(linkDocId(tutorId, uid)).set(
            {
                tutorId,
                studentId: uid,
                status: 'revoked',
                revokedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );
        return NextResponse.json({ removed: true });
    } catch (err) {
        console.error('Remove tutor error:', err);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
