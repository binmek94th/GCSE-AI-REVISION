'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Copy, Check, LogOut, Users, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Referral {
    id: string;
    referredEmail: string | null;
    status: string;
    signedUpAt: string | null;
    subscribedAt: string | null;
    churnedAt: string | null;
    firstYearEndsAt: string | null;
}

interface CommissionEvent {
    id: string;
    subscriptionAmount: number;
    commissionAmount: number;
    status: string;
    createdAt: string | null;
    paidAt: string | null;
}

interface TutorData {
    name: string;
    email: string;
    referralCode: string;
    referralLink: string;
    status: string;
    totalReferrals: number;
    totalSubscribed: number;
    totalCommissionEarned: number;
    totalCommissionPaid: number;
    pendingCommission: number;
}

const statusStyle: Record<string, string> = {
    clicked: 'bg-gray-100 text-gray-700',
    signed_up: 'bg-blue-100 text-blue-700',
    subscribed: 'bg-green-100 text-green-700',
    churned: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
};

export default function TutorDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tutor, setTutor] = useState<TutorData | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [commissionEvents, setCommissionEvents] = useState<CommissionEvent[]>([]);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/tutors/login');
                return;
            }
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/tutors/me', { headers: { Authorization: `Bearer ${idToken}` } });
                if (!res.ok) {
                    router.push('/tutors/login');
                    return;
                }
                const data = await res.json();
                setTutor(data.tutor);
                setReferrals(data.referrals);
                setCommissionEvents(data.commissionEvents);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const copyLink = () => {
        if (!tutor) return;
        navigator.clipboard.writeText(tutor.referralLink);
        setCopied(true);
        toast.success('Referral link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/tutors/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!tutor) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Welcome, {tutor.name}</h1>
                        <p className="text-sm text-gray-600">Partner dashboard</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" /> Log out
                    </Button>
                </div>

                {/* Referral link */}
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">Your referral link</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-800 truncate">
                                {tutor.referralLink}
                            </code>
                            <Button onClick={copyLink} className="cursor-pointer bg-blue-600 hover:bg-blue-700 flex-shrink-0">
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-900">{tutor.totalReferrals}</div>
                            <div className="text-xs text-gray-600">Referrals</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <TrendingUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-900">{tutor.totalSubscribed}</div>
                            <div className="text-xs text-gray-600">Subscribed</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <DollarSign className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-900">£{tutor.pendingCommission.toFixed(2)}</div>
                            <div className="text-xs text-gray-600">Pending Payout</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <DollarSign className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-900">£{tutor.totalCommissionPaid.toFixed(2)}</div>
                            <div className="text-xs text-gray-600">Total Paid</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Referrals table */}
                <Card>
                    <CardHeader><CardTitle>Your Referrals</CardTitle></CardHeader>
                    <CardContent>
                        {referrals.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">
                                No referrals yet — share your link to get started!
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="pb-2 font-medium">Student</th>
                                        <th className="pb-2 font-medium">Status</th>
                                        <th className="pb-2 font-medium">Signed Up</th>
                                        <th className="pb-2 font-medium">Rev-Share Ends</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {referrals.map(r => (
                                        <tr key={r.id} className="border-b last:border-0">
                                            <td className="py-2 text-gray-900">{r.referredEmail ?? '—'}</td>
                                            <td className="py-2">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[r.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                        {r.status}
                                                    </span>
                                            </td>
                                            <td className="py-2 text-gray-600">{r.signedUpAt ? new Date(r.signedUpAt).toLocaleDateString() : '—'}</td>
                                            <td className="py-2 text-gray-600">{r.firstYearEndsAt ? new Date(r.firstYearEndsAt).toLocaleDateString() : '—'}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Commission events */}
                <Card>
                    <CardHeader><CardTitle>Commission History</CardTitle></CardHeader>
                    <CardContent>
                        {commissionEvents.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">No commission earned yet.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                    <tr className="text-left text-gray-500 border-b">
                                        <th className="pb-2 font-medium">Date</th>
                                        <th className="pb-2 font-medium">Subscription</th>
                                        <th className="pb-2 font-medium">Your Commission</th>
                                        <th className="pb-2 font-medium">Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {commissionEvents.map(c => (
                                        <tr key={c.id} className="border-b last:border-0">
                                            <td className="py-2 text-gray-600">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}</td>
                                            <td className="py-2 text-gray-900">£{c.subscriptionAmount.toFixed(2)}</td>
                                            <td className="py-2 font-semibold text-gray-900">£{c.commissionAmount.toFixed(2)}</td>
                                            <td className="py-2">
                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[c.status] ?? 'bg-gray-100 text-gray-700'}`}>
                                                        {c.status}
                                                    </span>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}