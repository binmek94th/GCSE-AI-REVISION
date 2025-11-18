import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface SubscriptionData {
    subscriptionId: string;
    subscriptionStatus: string;
    planAmount: number;
    planInterval: string;
    currency: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
}

export function useSubscription() {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Ensure we only run on client
    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchSubscription = async () => {
        if (!mounted) return;

        try {
            setIsLoading(true);
            const user = auth.currentUser;

            if (!user) {
                setError('No authenticated user');
                setIsLoading(false);
                return;
            }

            const idToken = await user.getIdToken();
            const response = await fetch('/api/subscription', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch subscription');
            }

            const data = await response.json();

            if (data.subscription) {
                setSubscription({
                    ...data.subscription,
                    currentPeriodStart: new Date(data.subscription.currentPeriodStart),
                    currentPeriodEnd: new Date(data.subscription.currentPeriodEnd),
                });
            } else {
                setSubscription(null);
            }
            setError(null);
        } catch (err: any) {
            console.error('Error fetching subscription:', err);
            setError(err.message);
            setSubscription(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!mounted) return;

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                fetchSubscription();
            } else {
                setSubscription(null);
                setIsLoading(false);
            }
        });

        return () => unsubscribe();
    }, [mounted]);

    const hasSubscription = subscription !== null && subscription.subscriptionStatus === 'active';

    const daysUntilRenewal = subscription
        ? Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    const isExpiringSoon = daysUntilRenewal > 0 && daysUntilRenewal <= 7;

    return {
        subscription,
        isLoading: !mounted || isLoading,
        error,
        hasSubscription,
        daysUntilRenewal,
        isExpiringSoon,
        refresh: fetchSubscription,
    };
}

export function formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount / 100);
}

export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}

export function getStatusColor(status: string): string {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-800';
        case 'canceled':
        case 'past_due':
            return 'bg-red-100 text-red-800';
        case 'trialing':
            return 'bg-blue-100 text-blue-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

export function getStatusText(status: string, cancelAtPeriodEnd: boolean): string {
    if (cancelAtPeriodEnd) {
        return 'Canceling';
    }

    switch (status) {
        case 'active':
            return 'Active';
        case 'canceled':
            return 'Canceled';
        case 'past_due':
            return 'Past Due';
        case 'trialing':
            return 'Trial';
        default:
            return status;
    }
}