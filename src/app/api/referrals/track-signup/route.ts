// app/api/referrals/track-signup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { resolveTutorByReferralCode, REFERRAL_COOKIE_NAME } from '@/lib/referral';

export async function POST(req: NextRequest) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const userId = decoded.uid;

    // Prefer an explicit code from the request body (in case the client
    // read the cookie itself), fall back to reading the cookie directly.
    let body: { referralCode?: string } = {};
    try {
        body = await req.json();
    } catch {
        // no body is fine — we'll fall back to the cookie
    }

    const referralCode = body.referralCode ?? req.cookies.get(REFERRAL_COOKIE_NAME)?.value;
    if (!referralCode) {
        // No referral attribution for this signup — not an error, just nothing to track.
        return NextResponse.json({ tracked: false });
    }

    const tutor = await resolveTutorByReferralCode(referralCode);
    if (!tutor) {
        return NextResponse.json({ tracked: false, reason: 'Invalid or inactive referral code' });
    }

    const db = admin.firestore();

    // Idempotency: don't create a duplicate referral if this user already
    // has one (e.g. this endpoint gets called more than once).
    const existing = await db.collection('referrals').where('referredUserId', '==', userId).limit(1).get();
    if (!existing.empty) {
        return NextResponse.json({ tracked: false, reason: 'User already has a referral record' });
    }

    const userRecord = await admin.auth().getUser(userId);

    const referralRef = db.collection('referrals').doc();
    await referralRef.set({
        tutorId: tutor.id,
        referralCode,
        referredUserId: userId,
        referredEmail: userRecord.email ?? null,
        status: 'signed_up',
        commissionRate: 0.30,
        clickedAt: null, // could be backfilled from referral_clicks if you want to join them later
        signedUpAt: admin.firestore.FieldValue.serverTimestamp(),
        subscribedAt: null,
        churnedAt: null,
        firstYearEndsAt: null, // set once subscribedAt is known
    });

    await db.collection('tutors').doc(tutor.id).update({
        totalReferrals: admin.firestore.FieldValue.increment(1),
    });

    const response = NextResponse.json({ tracked: true, referralId: referralRef.id });
    // Clear the cookie now that it's been consumed, so it doesn't attribute
    // a second unrelated account created later in the same browser.
    response.cookies.delete(REFERRAL_COOKIE_NAME);
    return response;
}