import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import {buildReferralLink} from "@/lib/referral";

export async function GET(req: NextRequest) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const db = admin.firestore();
    const tutorDoc = await db.collection('tutors').doc(uid).get();

    if (!tutorDoc.exists) {
        return NextResponse.json({ error: 'Not a registered tutor' }, { status: 404 });
    }

    const tutor = tutorDoc.data()!;

    const [referralsSnap, commissionsSnap] = await Promise.all([
        db.collection('referrals').where('tutorId', '==', uid).orderBy('signedUpAt', 'desc').limit(100).get(),
        db.collection('commission_events').where('tutorId', '==', uid).orderBy('createdAt', 'desc').limit(100).get(),
    ]);

    const referrals = referralsSnap.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            referredEmail: d.referredEmail,
            status: d.status,
            signedUpAt: d.signedUpAt?.toDate?.()?.toISOString() ?? null,
            subscribedAt: d.subscribedAt?.toDate?.()?.toISOString() ?? null,
            churnedAt: d.churnedAt?.toDate?.()?.toISOString() ?? null,
            firstYearEndsAt: d.firstYearEndsAt?.toDate?.()?.toISOString() ?? null,
        };
    });

    const commissionEvents = commissionsSnap.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id,
            subscriptionAmount: d.subscriptionAmount,
            commissionAmount: d.commissionAmount,
            status: d.status,
            createdAt: d.createdAt?.toDate?.()?.toISOString() ?? null,
            paidAt: d.paidAt?.toDate?.()?.toISOString() ?? null,
        };
    });

    const pendingCommission = commissionEvents
        .filter(c => c.status === 'pending' || c.status === 'approved')
        .reduce((sum, c) => sum + c.commissionAmount, 0);

    // ✅ Masked payout summary — same shape the save endpoint returns and
    // the admin detail page reads. Full sort code / account number are
    // never sent here; those only ever leave the server via the dedicated
    // admin reveal endpoint, which also writes an audit log entry.
    const payoutMethod = tutor.payoutMethod
        ? {
            accountName: tutor.payoutMethod.accountName ?? null,
            sortCodeLast: tutor.payoutMethod.sortCode
                ? `${tutor.payoutMethod.sortCode.slice(0, 2)}-${tutor.payoutMethod.sortCode.slice(2, 4)}-${tutor.payoutMethod.sortCode.slice(4, 6)}`
                : null,
            accountNumberLast4: tutor.payoutMethod.accountNumber
                ? tutor.payoutMethod.accountNumber.slice(-4)
                : null,
            updatedAt: tutor.payoutMethod.updated_at?.toDate?.()?.toISOString() ?? null,
        }
        : null;

    return NextResponse.json({
        tutor: {
            name: tutor.name,
            email: tutor.email,
            referralCode: tutor.referralCode,
            status: tutor.status,
            referralLink: buildReferralLink(tutor.referralCode),
            totalReferrals: tutor.totalReferrals ?? 0,
            totalSubscribed: tutor.totalSubscribed ?? 0,
            totalCommissionEarned: tutor.totalCommissionEarned ?? 0,
            totalCommissionPaid: tutor.totalCommissionPaid ?? 0,
            pendingCommission,
            payoutMethod,
        },
        referrals,
        commissionEvents,
    });
}