'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/card';
import { Button } from '@/app/components/button';
import { Badge } from '@/app/components/badge';
import {
    useSubscription,
    formatCurrency,
    formatDate,
    getStatusColor,
    getStatusText
} from '@/hooks/useSubscription';
import {
    CreditCard,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    RefreshCw,
    ChevronRight,
    Crown,
    Loader2
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import {useRouter} from "next/navigation";
import {toast} from "sonner";

export default function SubscriptionPage() {
    const { subscription, error, hasSubscription, daysUntilRenewal, isExpiringSoon, refresh } = useSubscription();
    const [canceling, setCanceling] = useState(false);
    const [resuming, setResuming] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();

    // Ensure component only renders on client
    useEffect(() => {
        setMounted(true);
    }, []);

    const handleCancelSubscription = async () => {
        if (!confirm('Are you sure you want to cancel your subscription? You will still have access until the end of your billing period.')) {
            return;
        }

        setCanceling(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No authenticated user');
            }
            const idToken = await user.getIdToken();
            const response = await fetch('/api/cancel-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to cancel subscription');
            }

            toast.success('Subscription canceled successfully. You will have access until the end of your billing period.');
            await refresh();
        } catch (error: any) {
            console.error('Error canceling subscription:', error);
            toast.error(`Failed to cancel subscription: ${error.message}`);
        } finally {
            setCanceling(false);
        }
    };

    const handleBuy = async () => {
        router.push("/token")
    }

    const handleResumeSubscription = async () => {
        setResuming(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                throw new Error('No authenticated user');
            }
            const idToken = await user.getIdToken();
            const response = await fetch('/api/resume-subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to resume subscription');
            }

            toast.success('Subscription resumed successfully!');
            await refresh();
        } catch (error: any) {
            console.error('Error resuming subscription:', error);
            toast.error(`Failed to resume subscription: ${error.message}`);
        } finally {
            setResuming(false);
        }
    };

    const handleManageBilling = () => {
        // Open Stripe Customer Portal
        window.open('https://billing.stripe.com/p/login/test_XXXXXXX', '_blank');
    };

    // Don't render anything until mounted (prevents SSR issues)
    if (!mounted) {
        return null;
    }

    // if (isLoading) {
    //     return (
    //         <div className="min-h-screen bg-bg-subtle flex items-center justify-center">
    //             <Spinner />
    //         </div>
    //     );
    // }

    if (error) {
        return (
            <div className="min-h-screen bg-bg-subtle flex items-center justify-center p-4">
                <Card className="max-w-md w-full">
                    <CardContent className="p-6 text-center">
                        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-text-main mb-2">
                            Error Loading Subscription
                        </h2>
                        <p className="text-text-muted mb-4">{error}</p>
                        <Button onClick={refresh}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!hasSubscription) {
        return (
            <div className="min-h-screen bg-bg-subtle py-8">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <Card className="border-2 border-dashed">
                        <CardContent className="p-12 text-center">
                            <Crown className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold text-text-main mb-2">
                                No Active Subscription
                            </h2>
                            <p className="text-text-muted mb-6 max-w-md mx-auto">
                                Subscribe to unlock unlimited AI tutoring sessions and premium study resources.
                            </p>
                            <Button
                                size="lg"
                                onClick={() => handleBuy()}
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

    return (
        <div className="min-h-screen bg-bg-subtle py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-text-main mb-2">
                        Subscription Management
                    </h1>
                    <p className="text-text-muted">
                        Manage your subscription and billing information
                    </p>
                </div>

                {/* Status Alert */}
                {subscription.cancelAtPeriodEnd && (
                    <Card className="mb-6 border-yellow-200 bg-yellow-50">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-yellow-900 mb-1">
                                        Subscription Ending
                                    </h3>
                                    <p className="text-yellow-800 text-sm mb-4">
                                        Your subscription will end on {formatDate(subscription.currentPeriodEnd)}.
                                        You can resume it at any time before then to continue your access.
                                    </p>
                                    <Button
                                        size="sm"
                                        onClick={handleResumeSubscription}
                                        disabled={resuming}
                                        className="bg-yellow-600 hover:bg-yellow-700"
                                    >
                                        {resuming ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Resuming...
                                            </>
                                        ) : (
                                            <>Resume Subscription</>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {isExpiringSoon && !subscription.cancelAtPeriodEnd && (
                    <Card className="mb-6 border-blue-200 bg-blue-50">
                        <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                                <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-semibold text-blue-900 mb-1">
                                        Renewal Coming Soon
                                    </h3>
                                    <p className="text-blue-800 text-sm">
                                        Your subscription will automatically renew in {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Main Subscription Card */}
                <Card className="mb-6">
                    <CardHeader className="border-b border-border">
                        <CardTitle className="flex items-center justify-between">
                            <span>Current Plan</span>
                            <Badge className={getStatusColor(subscription.subscriptionStatus)}>
                                {getStatusText(subscription.subscriptionStatus, subscription.cancelAtPeriodEnd)}
                            </Badge>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Plan Details */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-3 bg-primary/10 rounded-lg">
                                        <Crown className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-text-main capitalize">
                                            {subscription.planInterval}ly Plan
                                        </h3>
                                        <p className="text-2xl font-bold text-primary">
                                            {formatCurrency(subscription.planAmount, subscription.currency)}
                                            <span className="text-sm font-normal text-text-muted">
                                                /{subscription.planInterval}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span className="text-text-muted">Unlimited AI tutoring sessions</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span className="text-text-muted">Access to all study materials</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        <span className="text-text-muted">Priority support</span>
                                    </div>
                                </div>
                            </div>

                            {/* Billing Details */}
                            <div className="space-y-4">
                                <div className="flex items-start gap-3">
                                    <Calendar className="w-5 h-5 text-text-muted mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-text-main">
                                            Current Period
                                        </p>
                                        <p className="text-sm text-text-muted">
                                            {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CreditCard className="w-5 h-5 text-text-muted mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-text-main">
                                            {subscription.cancelAtPeriodEnd ? 'Ends On' : 'Next Billing Date'}
                                        </p>
                                        <p className="text-sm text-text-muted">
                                            {formatDate(subscription.currentPeriodEnd)}
                                        </p>
                                        <p className="text-xs text-text-muted mt-1">
                                            {subscription.cancelAtPeriodEnd
                                                ? `${daysUntilRenewal} days of access remaining`
                                                : `${daysUntilRenewal} days until renewal`
                                            }
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <CheckCircle2 className="w-5 h-5 text-text-muted mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-text-main">
                                            Subscription ID
                                        </p>
                                        <p className="text-xs text-text-muted font-mono">
                                            {subscription.subscriptionId}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <Card>
                    <CardHeader className="border-b border-border">
                        <CardTitle>Manage Subscription</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">


                            {/* Cancel/Resume Subscription */}
                            {!subscription.cancelAtPeriodEnd ? (
                                <div className="flex items-center justify-between p-4 bg-bg-subtle rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <XCircle className="w-5 h-5 text-text-muted" />
                                        <div>
                                            <p className="font-medium text-text-main">
                                                Cancel Subscription
                                            </p>
                                            <p className="text-sm text-text-muted">
                                                You&#39;ll have access until {formatDate(subscription.currentPeriodEnd)}
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
                                        {canceling ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Canceling...
                                            </>
                                        ) : (
                                            'Cancel Plan'
                                        )}
                                    </Button>
                                </div>
                            ) : null}

                        </div>
                    </CardContent>
                </Card>

                {/* Help Section */}
                {/*<div className="mt-6 text-center">*/}
                {/*    <p className="text-sm text-text-muted">*/}
                {/*        Need help? <a href="mailto:support@yourapp.com" className="text-primary hover:underline">Contact Support</a>*/}
                {/*    </p>*/}
                {/*</div>*/}
            </div>
        </div>
    );
}