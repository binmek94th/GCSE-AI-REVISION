// lib/referral.ts
import admin from '@/lib/firebaseAdmin';

export const REFERRAL_COOKIE_NAME = 'studycedo_ref';
export const REFERRAL_COOKIE_MAX_AGE_DAYS = 30; // standard attribution window

/**
 * Generates a unique, human-readable referral code from a tutor's name,
 * e.g. "Sarah Jenkins" -> "sarah-jenkins-4f2a". Retries with a new random
 * suffix on collision (checked against the tutors collection).
 */
export async function generateReferralCode(tutorName: string): Promise<string> {
    const slug = tutorName
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 30);

    const db = admin.firestore();

    for (let attempt = 0; attempt < 5; attempt++) {
        const suffix = Math.random().toString(36).slice(2, 6);
        const code = `${slug}-${suffix}`;

        const existing = await db.collection('tutors').where('referralCode', '==', code).limit(1).get();
        if (existing.empty) return code;
    }

    // Extremely unlikely fallback if 5 collisions in a row happen.
    return `${slug}-${Date.now().toString(36)}`;
}

/**
 * Looks up the tutor associated with a referral code. Returns null if the
 * code doesn't exist or the tutor is inactive — fails closed so an
 * inactive/deleted tutor's old links stop attributing new signups.
 */
export async function resolveTutorByReferralCode(code: string): Promise<{ id: string; name: string } | null> {
    const db = admin.firestore();
    const snap = await db.collection('tutors').where('referralCode', '==', code).limit(1).get();
    if (snap.empty) return null;

    const doc = snap.docs[0];
    const data = doc.data();
    if (data.status !== 'active') return null;

    return { id: doc.id, name: data.name };
}

export function buildReferralLink(referralCode: string, origin: string = 'https://studycedo.com'): string {
    return `${origin}/auth/register?code=${encodeURIComponent(referralCode)}`;
}