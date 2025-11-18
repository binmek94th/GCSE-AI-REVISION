import { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, limit, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface SubscriptionData {
    subscriptionId: string;
    subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'trialing';
    currentPeriodEnd: Date;
    currentPeriodStart: Date;
    priceId: string;
    planInterval: 'month' | 'year' | 'week' | 'day';
    planAmount: number;
    currency: string;
    cancelAtPeriodEnd: boolean;
    updatedAt: Date;
}

export interface UseSubscriptionResult {
    subscription: SubscriptionData | null;
    isActive: boolean;
    isLoading: boolean;
    error: string | null;
    hasSubscription: boolean;
    daysUntilRenewal: number;
    isExpiringSoon: boolean; // Less than 7 days until renewal
    refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionResult {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const auth = getAuth();
    const user = auth.currentUser;

    const fetchSubscription = async () => {
        if (!user) {
            setSubscription(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            const subColRef = collection(db, 'users', user.uid, 'subscriptions');

            // First try to get an active subscription
            const activeQuery = query(
                subColRef,
                where('status', '==', 'active'),
                limit(1)
            );

            let querySnapshot = await getDocs(activeQuery);

            // If no active subscription, get most recently updated one
            if (querySnapshot.empty) {
                const fallbackQuery = query(
                    subColRef,
                    orderBy('updatedAt', 'desc'),
                    limit(1)
                );
                querySnapshot = await getDocs(fallbackQuery);
            }

            if (querySnapshot.empty) {
                setSubscription(null);
                setIsLoading(false);
                return;
            }

            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();

            const subscriptionData: SubscriptionData = {
                subscriptionId: docSnap.id,
                subscriptionStatus: data.status,
                currentPeriodEnd: data.currentPeriodEnd?.toDate() || new Date(),
                currentPeriodStart: data.currentPeriodStart?.toDate() || new Date(),
                priceId: data.priceId || '',
                planInterval: data.planInterval || 'month',
                planAmount: data.planAmount || 0,
                currency: data.currency || 'gbp',
                cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
                updatedAt: data.updatedAt?.toDate() || new Date(),
            };

            setSubscription(subscriptionData);
        } catch (err: any) {
            console.error('Error fetching subscription:', err);
            setError(err.message);
            setSubscription(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchSubscription();
    }, [user?.uid]);

    // Calculate days until renewal
    const daysUntilRenewal = subscription
        ? Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;

    // Check if subscription is expiring soon (less than 7 days)
    const isExpiringSoon = daysUntilRenewal > 0 && daysUntilRenewal <= 7;

    // Check if subscription is active
    const isActive = subscription?.subscriptionStatus === 'active';

    return {
        subscription,
        isActive,
        isLoading,
        error,
        hasSubscription: subscription !== null,
        daysUntilRenewal,
        isExpiringSoon,
        refresh: fetchSubscription,
    };
}

// Helper function to format currency
export function formatCurrency(amount: number, currency: string = 'gbp'): string {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount / 100);
}

// Helper function to format date
export function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}

// Helper function to get status badge color
export function getStatusColor(status: string): string {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-800';
        case 'trialing':
            return 'bg-blue-100 text-blue-800';
        case 'past_due':
        case 'unpaid':
            return 'bg-yellow-100 text-yellow-800';
        case 'canceled':
        case 'incomplete':
        case 'incomplete_expired':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
}

// Helper function to get human-readable status
export function getStatusText(status: string, cancelAtPeriodEnd: boolean): string {
    if (cancelAtPeriodEnd && status === 'active') {
        return 'Canceling at period end';
    }

    switch (status) {
        case 'active':
            return 'Active';
        case 'trialing':
            return 'Trial Period';
        case 'past_due':
            return 'Payment Past Due';
        case 'unpaid':
            return 'Payment Failed';
        case 'canceled':
            return 'Canceled';
        case 'incomplete':
            return 'Incomplete';
        case 'incomplete_expired':
            return 'Expired';
        default:
            return status;
    }
}