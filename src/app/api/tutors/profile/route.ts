// GET   /api/tutors/profile   -> the signed-in tutor's own profile (404 if they aren't a tutor)
// PATCH /api/tutors/profile   -> change their display name
//
// Deliberately light (one document read) so the landing-page navigation can call
// it to find out whether the signed-in person is a tutor; /api/tutors/me does a lot
// more (referrals, commission history) and is meant for the dashboard.
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { timestampToIso } from '@/lib/tutorStudents';

const NAME_MIN = 2;
const NAME_MAX = 80;

async function uidFrom(req: NextRequest): Promise<string | null> {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return null;
    try {
        return (await admin.auth().verifyIdToken(idToken)).uid;
    } catch {
        return null;
    }
}

/** Trim, collapse whitespace, strip control characters. Returns null if it isn't a usable name. */
function cleanName(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const name = value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    return name.length >= NAME_MIN && name.length <= NAME_MAX ? name : null;
}

export async function GET(req: NextRequest) {
    const uid = await uidFrom(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const snap = await admin.firestore().collection('tutors').doc(uid).get();
        if (!snap.exists) return NextResponse.json({ error: 'Not a registered tutor' }, { status: 404 });

        const t = snap.data() || {};
        return NextResponse.json({
            profile: {
                name: (t.name as string) ?? '',
                email: (t.email as string) ?? null,
                status: (t.status as string) ?? null,
                referralCode: (t.referralCode as string) ?? null,
                createdAt: timestampToIso(t.createdAt),
            },
        });
    } catch (err) {
        console.error('Tutor profile load error:', err);
        return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    const uid = await uidFrom(req);
    if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const name = cleanName(body?.name);
    if (!name) {
        return NextResponse.json({ error: `Enter your name (${NAME_MIN}–${NAME_MAX} characters).` }, { status: 400 });
    }

    try {
        // The uid comes from the verified token, so a tutor can only ever change their own record.
        const ref = admin.firestore().collection('tutors').doc(uid);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ error: 'Not a registered tutor' }, { status: 404 });

        await ref.update({ name, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return NextResponse.json({ profile: { name } });
    } catch (err) {
        console.error('Tutor profile update error:', err);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
    }
}
