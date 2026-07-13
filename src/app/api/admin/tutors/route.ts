import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { generateReferralCode, buildReferralLink } from '@/lib/referral';

export async function GET(req: NextRequest) {
    const adminUid = await requireAdmin(req);
    if (!adminUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const snapshot = await admin.firestore().collection('tutors').orderBy('createdAt', 'desc').get();
    const tutors = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            name: d.name,
            email: d.email,
            referralCode: d.referralCode,
            referralLink: buildReferralLink(d.referralCode),
            status: d.status,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
            totalReferrals: d.totalReferrals ?? 0,
            totalSubscribed: d.totalSubscribed ?? 0,
            totalCommissionEarned: d.totalCommissionEarned ?? 0,
            totalCommissionPaid: d.totalCommissionPaid ?? 0,
        };
    });

    return NextResponse.json({ tutors });
}

// Invite a tutor by email before they've created their own account.
// Matches the reconciliation logic in /api/tutors/register — when they
// eventually sign up with this email, that route finds this 'invited'
// doc and migrates its referralCode onto their uid-keyed doc.
export async function POST(req: NextRequest) {
    const adminUid = await requireAdmin(req);
    if (!adminUid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { name, email } = body;
    if (!name || !email) {
        return NextResponse.json({ error: 'Missing name or email' }, { status: 400 });
    }

    const db = admin.firestore();

    const existing = await db.collection('tutors').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
        return NextResponse.json({ error: 'A tutor with this email already exists or is invited' }, { status: 409 });
    }

    const referralCode = await generateReferralCode(name);
    const tutorRef = db.collection('tutors').doc();

    await tutorRef.set({
        name,
        email,
        referralCode,
        status: 'invited',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        totalReferrals: 0,
        totalSubscribed: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
        invitedBy: adminUid,
    });

    return NextResponse.json({
        id: tutorRef.id,
        referralCode,
        referralLink: buildReferralLink(referralCode),
    });
}