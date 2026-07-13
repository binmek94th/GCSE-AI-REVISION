import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import {buildReferralLink, generateReferralCode} from '@/lib/referral';

export async function POST(req: NextRequest) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const body = await req.json();
    const { name } = body;
    if (!name) {
        return NextResponse.json({ error: 'Missing name' }, { status: 400 });
    }

    const db = admin.firestore();
    const tutorRef = db.collection('tutors').doc(uid);
    const existing = await tutorRef.get();

    if (existing.exists) {
        return NextResponse.json({
            id: uid,
            referralCode: existing.data()!.referralCode,
            referralLink: buildReferralLink(existing.data()!.referralCode),
            alreadyRegistered: true,
        });
    }

    const userRecord = await admin.auth().getUser(uid);
    const email = userRecord.email;

    // Reconcile with an admin-invited tutor doc (created at a random ID,
    // matched by email) if one exists — migrate its data + referralCode
    // onto the uid-keyed doc instead of generating a fresh code.
    let referralCode: string;
    let invitedDocToDelete: string | null = null;

    if (email) {
        const invitedSnap = await db.collection('tutors')
            .where('email', '==', email)
            .where('status', '==', 'invited')
            .limit(1)
            .get();

        if (!invitedSnap.empty) {
            const invitedDoc = invitedSnap.docs[0];
            referralCode = invitedDoc.data().referralCode;
            invitedDocToDelete = invitedDoc.id;
        } else {
            referralCode = await generateReferralCode(name);
        }
    } else {
        referralCode = await generateReferralCode(name);
    }

    await tutorRef.set({
        name,
        email: email ?? null,
        referralCode,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        totalReferrals: 0,
        totalSubscribed: 0,
        totalCommissionEarned: 0,
        totalCommissionPaid: 0,
    });

    if (invitedDocToDelete) {
        await db.collection('tutors').doc(invitedDocToDelete).delete();
    }

    return NextResponse.json({
        id: uid,
        referralCode,
        referralLink: `https://studycedo.com/r/${referralCode}`,
        alreadyRegistered: false,
    });
}