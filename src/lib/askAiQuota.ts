// src/lib/askAiQuota.ts
// Quota logic for the "Ask AI" upload feature: 10 free solves per calendar
// month for every user, then purchased credit packs (never expire) on top.
// Free allowance is consumed first, purchased credits second.

import admin from '@/lib/firebaseAdmin';

export const FREE_MONTHLY_LIMIT = process.env.FREE_MONTHLY_LIMIT_AI_QUESTIONS ? parseInt(process.env.FREE_MONTHLY_LIMIT_AI_QUESTIONS, 10) : 10;

export class QuotaExceededError extends Error {
    constructor() {
        super('Ask AI upload quota exceeded');
        this.name = 'QuotaExceededError';
    }
}

export type QuotaSource = 'free' | 'purchased';

export interface QuotaReservation {
    source: QuotaSource;
}

export interface QuotaStatus {
    freeUsed: number;
    freeLimit: number;
    purchasedCredits: number;
    remaining: number;
}

function getMonthKey(): string {
    // UTC month key — matches the resumable/manifest-style keying used
    // elsewhere in the app (dry-run scripts, etc.): stable, sortable, simple.
    return new Date().toISOString().slice(0, 7); // "2026-07"
}

// Manual retry with backoff, matching the established pattern elsewhere in
// this codebase for Firestore transaction calls (works around a known
// AttributeError in certain firebase-admin/google-cloud-firestore version
// combinations, and general transient contention).
async function runTransactionWithRetry<T>(
    fn: (tx: FirebaseFirestore.Transaction) => Promise<T>,
    maxAttempts = 3
): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await admin.firestore().runTransaction(fn);
        } catch (err) {
            lastErr = err;
            if (attempt < maxAttempts) {
                await new Promise((r) => setTimeout(r, 150 * attempt));
            }
        }
    }
    throw lastErr;
}

/**
 * Reserves one Ask AI upload slot for this user, preferring the free
 * monthly allowance before dipping into purchased credits. Throws
 * QuotaExceededError if neither is available. Call this BEFORE doing the
 * expensive work (Storage download, Anthropic call) so we never burn quota
 * on a request that was going to be rejected anyway.
 */
export async function reserveAskAiUpload(uid: string): Promise<QuotaReservation> {
    const db = admin.firestore();
    const monthKey = getMonthKey();
    const limitRef = db.collection('users').doc(uid).collection('aiAskLimits').doc(monthKey);
    const userRef = db.collection('users').doc(uid);

    return runTransactionWithRetry(async (tx) => {
        const [limitSnap, userSnap] = await Promise.all([tx.get(limitRef), tx.get(userRef)]);

        const freeUsed = limitSnap.exists ? (limitSnap.data()?.count ?? 0) : 0;
        const purchasedCredits = userSnap.data()?.askAiCredits ?? 0;

        if (freeUsed < FREE_MONTHLY_LIMIT) {
            tx.set(
                limitRef,
                { count: freeUsed + 1, updated_at: admin.firestore.FieldValue.serverTimestamp() },
                { merge: true }
            );
            return { source: 'free' as const };
        }

        if (purchasedCredits > 0) {
            tx.update(userRef, { askAiCredits: admin.firestore.FieldValue.increment(-1) });
            return { source: 'purchased' as const };
        }

        throw new QuotaExceededError();
    });
}

/**
 * Best-effort refund if the solve fails after quota was already reserved
 * (e.g. Anthropic API error, malformed response). Non-fatal if it fails —
 * we log and move on rather than compounding the original error.
 */
export async function refundAskAiUpload(uid: string, reservation: QuotaReservation): Promise<void> {
    try {
        const db = admin.firestore();
        if (reservation.source === 'free') {
            const monthKey = getMonthKey();
            await db
                .collection('users')
                .doc(uid)
                .collection('aiAskLimits')
                .doc(monthKey)
                .set({ count: admin.firestore.FieldValue.increment(-1) }, { merge: true });
        } else {
            await db.collection('users').doc(uid).update({
                askAiCredits: admin.firestore.FieldValue.increment(1),
            });
        }
    } catch (err) {
        console.error(`Failed to refund Ask AI quota reservation for uid ${uid}:`, err);
    }
}

export async function getAskAiQuotaStatus(uid: string): Promise<QuotaStatus> {
    const db = admin.firestore();
    const monthKey = getMonthKey();

    const [limitSnap, userSnap] = await Promise.all([
        db.collection('users').doc(uid).collection('aiAskLimits').doc(monthKey).get(),
        db.collection('users').doc(uid).get(),
    ]);

    const freeUsed = limitSnap.exists ? (limitSnap.data()?.count ?? 0) : 0;
    const purchasedCredits = userSnap.data()?.askAiCredits ?? 0;
    const freeRemaining = Math.max(0, FREE_MONTHLY_LIMIT - freeUsed);

    return {
        freeUsed,
        freeLimit: FREE_MONTHLY_LIMIT,
        purchasedCredits,
        remaining: freeRemaining + purchasedCredits,
    };
}