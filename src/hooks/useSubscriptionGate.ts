'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// ─── Config ───────────────────────────────────────────────────────────────────
const FREE_TRIAL_DAYS = 200; // ← change this to whatever you want
// ──────────────────────────────────────────────────────────────────────────────

interface SubscriptionData {
    status: string;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    plan: string | null;
    planAmount: number | null;
    currency: string | null;
    planInterval: string | null;
    subscriptionId: string | null;
}

interface SubscriptionGateResult {
    isLoading: boolean;
    hasAccess: boolean;
    isTrialing: boolean;           // true if access is via the free trial (no paid sub)
    trialDaysRemaining: number;    // 0 if not trialing
    subscription: SubscriptionData | null;
    userId: string | null;
    refresh: () => void;
}

let cachedResult: Omit<SubscriptionGateResult, 'refresh'> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000;

function getTrialInfo(createdAt: Date): { isTrialing: boolean; trialDaysRemaining: number } {
    const now = Date.now();
    const trialEnd = createdAt.getTime() + FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
    const msRemaining = trialEnd - now;

    if (msRemaining <= 0) return { isTrialing: false, trialDaysRemaining: 0 };

    return {
        isTrialing: true,
        trialDaysRemaining: Math.ceil(msRemaining / (24 * 60 * 60 * 1000)),
    };
}

export function useSubscriptionGate(): SubscriptionGateResult {
    const [result, setResult] = useState<Omit<SubscriptionGateResult, 'refresh'>>({
        isLoading: true,
        hasAccess: false,
        isTrialing: false,
        trialDaysRemaining: 0,
        subscription: null,
        userId: null,
    });

    const fetchSubscription = async (uid: string) => {
        try {
            // 1. Check for an active/trialing Stripe subscription first
            const subsRef = collection(db, 'users', uid, 'subscriptions');
            const q = query(subsRef, where('status', 'in', ['active', 'trialing']), limit(1));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const docData = snap.docs[0].data();
                const subscription: SubscriptionData = {
                    status: docData.status,
                    currentPeriodEnd: docData.currentPeriodEnd?.toDate?.() ?? null,
                    cancelAtPeriodEnd: docData.cancelAtPeriodEnd ?? false,
                    plan: docData.plan ?? null,
                    planAmount: docData.planAmount ?? null,
                    currency: docData.currency ?? null,
                    planInterval: docData.planInterval ?? null,
                    subscriptionId: docData.subscriptionId ?? snap.docs[0].id,
                };

                const fresh = {
                    isLoading: false,
                    hasAccess: true,
                    isTrialing: false,
                    trialDaysRemaining: 0,
                    subscription,
                    userId: uid,
                };
                cachedResult = fresh;
                cacheTimestamp = Date.now();
                setResult(fresh);
                return;
            }

            // 2. No paid sub — check free trial via user doc createdAt
            //    Falls back to Firebase Auth metadata if Firestore field is absent
            let createdAt: Date | null = null;

            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data();
                // Support Firestore Timestamp or plain ISO string
                createdAt = data?.createdAt?.toDate?.()
                    ?? (data?.createdAt ? new Date(data.createdAt) : null);
            }

            // Fallback: Firebase Auth creation time (always available)
            if (!createdAt) {
                const authCreated = auth.currentUser?.metadata?.creationTime;
                if (authCreated) createdAt = new Date(authCreated);
            }

            const { isTrialing, trialDaysRemaining } = createdAt
                ? getTrialInfo(createdAt)
                : { isTrialing: false, trialDaysRemaining: 0 };

            const fresh = {
                isLoading: false,
                hasAccess: isTrialing,
                isTrialing,
                trialDaysRemaining,
                subscription: null,
                userId: uid,
            };
            cachedResult = fresh;
            cacheTimestamp = Date.now();
            setResult(fresh);
        } catch (err) {
            console.error('useSubscriptionGate error:', err);
            setResult({
                isLoading: false,
                hasAccess: false,
                isTrialing: false,
                trialDaysRemaining: 0,
                subscription: null,
                userId: uid,
            });
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                cachedResult = null;
                setResult({
                    isLoading: false,
                    hasAccess: false,
                    isTrialing: false,
                    trialDaysRemaining: 0,
                    subscription: null,
                    userId: null,
                });
                return;
            }

            const now = Date.now();
            if (cachedResult && cachedResult.userId === user.uid && now - cacheTimestamp < CACHE_TTL) {
                setResult(cachedResult);
                return;
            }

            await fetchSubscription(user.uid);
        });

        return () => unsubscribe();
    }, []);

    const refresh = () => {
        cachedResult = null;
        cacheTimestamp = 0;
        const user = auth.currentUser;
        if (user) fetchSubscription(user.uid);
    };

    return { ...result, refresh };
}

export function invalidateSubscriptionCache() {
    cachedResult = null;
    cacheTimestamp = 0;
}