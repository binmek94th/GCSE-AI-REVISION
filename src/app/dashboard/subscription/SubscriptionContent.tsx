'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';
import {
    CreditCard,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ChevronRight,
    Crown,
    Loader2
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import Spinner from '@/app/components/ui/Spinner';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';


function formatCurrency(amount: number, currency: string) {
    return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: currency.toUpperCase(),
    }).format(amount / 100);
}

function formatDate(date: Date | null) {
    if (!date) return '—';
    return new Intl.DateTimeFormat('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}

function getStatusColor(status: string) {
    switch (status) {
        case 'active':    return 'bg-green-100 text-green-800';
        case 'trialing':  return 'bg-blue-100 text-blue-800';
        case 'canceled':
        case 'past_due':  return 'bg-red-100 text-red-800';
        default:          return 'bg-gray-100 text-gray-800';
    }
}

function getStatusText(status: string, cancelAtPeriodEnd: boolean) {
    if (cancelAtPeriodEnd) return 'Canceling';
    switch (status) {
        case 'active':   return 'Active';
        case 'trialing': return 'Trial';
        case 'canceled': return 'Canceled';
        case 'past_due': return 'Past Due';
        default:         return status;
    }
}

function daysUntil(date: Date | null): number {
    if (!date) return 0;
    return Math.max(0, Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionContent() {
    const { isLoading, hasAccess, subscription, refresh } = useSubscriptionGate();
    const [canceling, setCanceling] = useState(false);
    const [resuming, setResuming]   = useState(false);
    const router = useRouter();

    const days         = daysUntil(subscription?.currentPeriodEnd ?? null);
    const expiringSoon = days > 0 && days <= 7;

    // ── Cancel ──────────────────────────────────────────────────────────────
    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel? You will keep access until the end of your billing period.')) return;
        setCanceling(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/cancel-subscription', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (!res.ok) throw new Error('Failed to cancel subscription');
            toast.success('Subscription canceled. You still have access until your billing period ends.');
            refresh();
        } catch (err: any) {
            toast.error(`Failed to cancel: ${err.message}`);
        } finally {
            setCanceling(false);
        }
    };

    // ── Resume ───────────────────────────────────────────────────────────────
    const handleResumeSubscription = async () => {
        setResuming(true);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/resume-subscription', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (!res.ok) throw new Error('Failed to resume subscription');
            toast.success('Subscription resumed!');
            refresh();
        } catch (err: any) {
            toast.error(`Failed to resume: ${err.message}`);
        } finally {
            setResuming(false);
        }
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
                <Spinner />
            </div>
        );
    }

    // ── No subscription ───────────────────────────────────────────────────────
    if (!hasAccess) {
        return (
            <div className="bg-bg-subtle py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Card className="border-2 border-dashed">
                        <CardContent className="p-12 text-center">
                            <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-text-main mb-2">
                                No Active Subscription
                            </h2>
                            <p className="text-text-muted mb-6 max-w-md mx-auto">
                                Subscribe to unlock unlimited AI tutoring, quizzes, study plans, and all premium study resources.
                            </p>
                            <Button
                                size="lg"
                                onClick={() => router.push('/subscribe')}
                                className="bg-primary hover:bg-primary-dark"
                            >
                                View Subscription Plans
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const sub = subscription!;

    return (
        <div className="bg-bg-subtle py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-main mb-2">Subscription Management</h1>
                    <p className="text-text-muted">Manage your subscription and billing information</p>
                </div>

                {/* Canceling alert */}
                {sub.cancelAtPeriodEnd && (
                    <Card className="mb-6 border-yellow-200 bg-yellow-50">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-yellow-900 mb-1">Subscription Ending</h3>
                                    <p className="text-yellow-800 text-sm mb-4">
                                        Your subscription ends on {formatDate(sub.currentPeriodEnd)}.
                                        Resume it any time before then to keep your access.
                                    </p>
                                    <Button
                                        size="sm"
                                        onClick={handleResumeSubscription}
                                        disabled={resuming}
                                        className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                        {resuming
                                            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resuming...</>
                                            : 'Resume Subscription'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Expiring soon alert */}
                {expiringSoon && !sub.cancelAtPeriodEnd && (
                    <Card className="mb-6 border-blue-200 bg-blue-50">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-blue-900 mb-1">Renewal Coming Soon</h3>
                                    <p className="text-blue-800 text-sm">
                                        Your subscription renews in {days} day{days !== 1 ? 's' : ''}.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main card */}
                <Card className="mb-6">
                    <CardHeader className="border-b border-border">
                        <CardTitle className="flex items-center justify-between">
                            <span>Current Plan</span>
                            <Badge className={getStatusColor(sub.status)}>
                                {getStatusText(sub.status, sub.cancelAtPeriodEnd)}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-6">

                            {/* Plan details */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <Crown className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-text-main capitalize">
                                            {sub.plan ?? 'Premium'} Plan
                                        </h3>
                                        {sub.planAmount && sub.currency && (
                                            <p className="text-2xl font-bold text-primary">
                                                {formatCurrency(sub.planAmount, sub.currency)}
                                                <span className="text-sm font-normal text-text-muted">
                                                    /{sub.planInterval ?? 'month'}
                                                </span>
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {[
                                        'Unlimited AI tutoring sessions',
                                        'Access to all study materials',
                                        'Quizzes & mock tests',
                                        'Personalised study plans',
                                    ].map((f) => (
                                        <div key={f} className="flex items-center gap-2 text-sm">
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                            <span className="text-text-muted">{f}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Billing details */}
                            <div className="space-y-4">
                                {sub.currentPeriodEnd && (
                                    <div className="flex items-start gap-3">
                                        <CreditCard className="w-5 h-5 text-text-muted mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-text-main">
                                                {sub.cancelAtPeriodEnd ? 'Access ends' : 'Next billing date'}
                                            </p>
                                            <p className="text-sm text-text-muted">
                                                {formatDate(sub.currentPeriodEnd)}
                                            </p>
                                            <p className="text-xs text-text-muted mt-1">
                                                {sub.cancelAtPeriodEnd
                                                    ? `${days} days of access remaining`
                                                    : `${days} days until renewal`}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {sub.subscriptionId && (
                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-text-muted mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-text-main">Subscription ID</p>
                                            <p className="text-xs text-text-muted font-mono">{sub.subscriptionId}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                {!sub.cancelAtPeriodEnd && (
                    <Card>
                        <CardHeader className="border-b border-border">
                            <CardTitle>Manage Subscription</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg">
                                <div className="flex items-center gap-3">
                                    <XCircle className="w-5 h-5 text-text-muted" />
                                    <div>
                                        <p className="font-medium text-text-main">Cancel Subscription</p>
                                        <p className="text-sm text-text-muted">
                                            You&#39;ll keep access until {formatDate(sub.currentPeriodEnd)}
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancelSubscription}
                                    disabled={canceling}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                    {canceling
                                        ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Canceling...</>
                                        : 'Cancel Plan'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}