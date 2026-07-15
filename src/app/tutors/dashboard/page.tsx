'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Copy, Check, LogOut, Users, TrendingUp, DollarSign, Loader2, Landmark, Pencil } from 'lucide-react';
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

interface PayoutMethod {
    accountName: string;
    sortCodeLast: string;   // e.g. "12-34-56" — fine to show in full, low sensitivity
    accountNumberLast4: string;
    updatedAt: string | null;
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
    payoutMethod: PayoutMethod | null;
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

function formatSortCode(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    return digits.match(/.{1,2}/g)?.join('-') ?? digits;
}

export default function TutorDashboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [tutor, setTutor] = useState<TutorData | null>(null);
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [commissionEvents, setCommissionEvents] = useState<CommissionEvent[]>([]);
    const [copied, setCopied] = useState(false);

    const [editingPayout, setEditingPayout] = useState(false);
    const [savingPayout, setSavingPayout] = useState(false);
    const [payoutError, setPayoutError] = useState<string | null>(null);
    const [accountName, setAccountName] = useState('');
    const [sortCode, setSortCode] = useState('');
    const [accountNumber, setAccountNumber] = useState('');

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
                    toast.error("You aren't a tutor.")
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

    const startEditingPayout = () => {
        setAccountName(tutor?.payoutMethod?.accountName ?? '');
        setSortCode('');
        setAccountNumber('');
        setPayoutError(null);
        setEditingPayout(true);
    };

    const savePayoutMethod = async () => {
        const cleanSortCode = sortCode.replace(/\D/g, '');
        const cleanAccountNumber = accountNumber.replace(/\D/g, '');

        if (!accountName.trim()) {
            setPayoutError('Enter the name on the account');
            return;
        }
        if (cleanSortCode.length !== 6) {
            setPayoutError('Sort code must be 6 digits');
            return;
        }
        if (cleanAccountNumber.length !== 8) {
            setPayoutError('Account number must be 8 digits');
            return;
        }

        setSavingPayout(true);
        setPayoutError(null);
        try {
            const user = auth.currentUser;
            if (!user) return;
            const idToken = await user.getIdToken();

            const res = await fetch('/api/tutors/payout-method', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    accountName: accountName.trim(),
                    sortCode: cleanSortCode,
                    accountNumber: cleanAccountNumber,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                setPayoutError(err.error ?? 'Failed to save payout details');
                return;
            }

            const data = await res.json();
            setTutor(prev => prev ? { ...prev, payoutMethod: data.payoutMethod } : prev);
            setEditingPayout(false);
            toast.success('Payout method saved');
        } catch {
            setPayoutError('Failed to save payout details. Please try again.');
        } finally {
            setSavingPayout(false);
        }
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

                {/* Payout method */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Landmark className="w-5 h-5 text-gray-500" /> Payout Method
                            </CardTitle>
                            {!editingPayout && (
                                <Button variant="outline" size="sm" onClick={startEditingPayout} className="cursor-pointer">
                                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                                    {tutor.payoutMethod ? 'Update' : 'Add bank details'}
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!editingPayout ? (
                            tutor.payoutMethod ? (
                                <div className="text-sm space-y-1">
                                    <p className="text-gray-900 font-medium">{tutor.payoutMethod.accountName}</p>
                                    <p className="text-gray-600">Sort code {tutor.payoutMethod.sortCodeLast}</p>
                                    <p className="text-gray-600">Account ending •••• {tutor.payoutMethod.accountNumberLast4}</p>
                                    {tutor.payoutMethod.updatedAt && (
                                        <p className="text-xs text-gray-400 pt-1">
                                            Last updated {new Date(tutor.payoutMethod.updatedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-sm text-gray-500">
                                    No payout method on file yet. Add your bank details so we can pay out your commission.
                                </p>
                            )
                        ) : (
                            <div className="space-y-3 max-w-sm">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Name on account</label>
                                    <input
                                        type="text"
                                        value={accountName}
                                        onChange={e => setAccountName(e.target.value)}
                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Sort code</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="12-34-56"
                                            value={sortCode}
                                            onChange={e => setSortCode(formatSortCode(e.target.value))}
                                            maxLength={8}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Account number</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="12345678"
                                            value={accountNumber}
                                            onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 8))}
                                            maxLength={8}
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>

                                {payoutError && <p className="text-sm text-red-600">{payoutError}</p>}

                                <div className="flex gap-2 pt-1">
                                    <Button
                                        onClick={savePayoutMethod}
                                        disabled={savingPayout}
                                        className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                                    >
                                        {savingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => setEditingPayout(false)}
                                        disabled={savingPayout}
                                        className="cursor-pointer"
                                    >
                                        Cancel
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400">UK bank accounts only, for now.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

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