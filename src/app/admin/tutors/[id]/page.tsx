'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Loader2, Copy, ArrowLeft, ShieldAlert, Landmark, Eye, EyeOff, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface PayoutMethodSummary {
    accountName: string;
    sortCodeLast: string;
    accountNumberLast4: string;
    updatedAt: string | null;
}

interface PayoutMethodFull {
    accountName: string | null;
    sortCode: string | null;
    accountNumber: string | null;
    updatedAt: string | null;
}

interface TutorDetail {
    id: string;
    name: string;
    email: string;
    referralCode: string;
    referralLink: string;
    status: 'active' | 'inactive' | 'invited';
    createdAt: string | null;
    totalReferrals: number;
    totalSubscribed: number;
    totalCommissionEarned: number;
    totalCommissionPaid: number;
    payoutMethod: PayoutMethodSummary | null;
}

interface Referral {
    id: string;
    referredEmail: string | null;
    status: string;
    signedUpAt: string | null;
    subscribedAt: string | null;
    firstYearEndsAt: string | null;
}

const statusStyle: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    invited: 'bg-amber-100 text-amber-700',
    signed_up: 'bg-blue-100 text-blue-700',
    subscribed: 'bg-green-100 text-green-700',
    churned: 'bg-red-100 text-red-700',
};

function formatSortCodeDisplay(raw: string): string {
    const digits = raw.replace(/\D/g, '').slice(0, 6);
    return digits.match(/.{1,2}/g)?.join('-') ?? digits;
}

export default function AdminTutorDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const tutorId = params.id;

    const [idToken, setIdToken] = useState<string | null>(null);
    const [checkingAccess, setCheckingAccess] = useState(true);
    const [accessDenied, setAccessDenied] = useState(false);
    const [notFound, setNotFound] = useState(false);

    const [tutor, setTutor] = useState<TutorDetail | null>(null);
    const [loadingTutor, setLoadingTutor] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const [referrals, setReferrals] = useState<Referral[] | null>(null);
    const [loadingReferrals, setLoadingReferrals] = useState(true);

    const [revealedPayout, setRevealedPayout] = useState<PayoutMethodFull | null>(null);
    const [revealingPayout, setRevealingPayout] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setCheckingAccess(false);
                setAccessDenied(true);
                return;
            }
            const token = await user.getIdToken();
            setIdToken(token);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (idToken) {
            fetchTutor();
            fetchReferrals();
        }
    }, [idToken]);

    const fetchTutor = async () => {
        setLoadingTutor(true);
        try {
            const res = await fetch(`/api/admin/tutors/${tutorId}`, { headers: { Authorization: `Bearer ${idToken}` } });

            if (res.status === 401 || res.status === 403) {
                setAccessDenied(true);
                setCheckingAccess(false);
                return;
            }
            if (res.status === 404) {
                setNotFound(true);
                setCheckingAccess(false);
                return;
            }
            if (!res.ok) throw new Error('Failed to fetch tutor');

            const data = await res.json();
            setTutor(data.tutor);
            setCheckingAccess(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load tutor');
            setCheckingAccess(false);
        } finally {
            setLoadingTutor(false);
        }
    };

    const fetchReferrals = async () => {
        setLoadingReferrals(true);
        try {
            const res = await fetch(`/api/admin/tutors/${tutorId}/referrals`, { headers: { Authorization: `Bearer ${idToken}` } });
            if (res.status === 401 || res.status === 403) {
                setAccessDenied(true);
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setReferrals(data.referrals);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingReferrals(false);
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!tutor) return;
        const prevStatus = tutor.status;
        setTutor({ ...tutor, status: newStatus as TutorDetail['status'] });
        setUpdatingStatus(true);
        try {
            const res = await fetch(`/api/admin/tutors/${tutorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');
        } catch (err) {
            toast.error('Failed to update tutor status');
            setTutor({ ...tutor, status: prevStatus });
        } finally {
            setUpdatingStatus(false);
        }
    };

    const copyLink = () => {
        if (!tutor) return;
        navigator.clipboard.writeText(tutor.referralLink);
        toast.success('Referral link copied!');
    };

    const revealPayoutMethod = async () => {
        if (revealedPayout) {
            setRevealedPayout(null);
            return;
        }
        setRevealingPayout(true);
        try {
            const res = await fetch(`/api/admin/tutors/${tutorId}/payout-method`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to load payout details');
            }
            const data: PayoutMethodFull = await res.json();
            setRevealedPayout(data);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to load payout details');
        } finally {
            setRevealingPayout(false);
        }
    };

    const copyPayoutDetails = () => {
        if (!revealedPayout?.accountName || !revealedPayout.sortCode || !revealedPayout.accountNumber) return;
        navigator.clipboard.writeText(
            `${revealedPayout.accountName} · Sort code ${formatSortCodeDisplay(revealedPayout.sortCode)} · Account ${revealedPayout.accountNumber}`
        );
        toast.success('Payout details copied');
    };

    if (checkingAccess) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (accessDenied) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-sm w-full">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert className="w-7 h-7 text-red-600" />
                        </div>
                        <h1 className="text-lg font-bold text-gray-900 mb-1">Access denied</h1>
                        <p className="text-sm text-gray-600">
                            You don't have permission to view this page. This area is restricted to admins.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (notFound || !tutor) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <Card className="max-w-sm w-full">
                    <CardContent className="pt-8 pb-8 text-center">
                        <h1 className="text-lg font-bold text-gray-900 mb-1">Tutor not found</h1>
                        <Button variant="outline" className="mt-4 cursor-pointer" onClick={() => router.push('/admin/tutors')}>
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Tutors
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                <button
                    onClick={() => router.push('/admin/tutors')}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Tutors
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{tutor.name}</h1>
                        <p className="text-sm text-gray-600">{tutor.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[tutor.status]}`}>
                            {tutor.status}
                        </span>
                        <select
                            value={tutor.status}
                            onChange={e => handleStatusChange(e.target.value)}
                            disabled={updatingStatus}
                            className="text-xs border border-gray-300 rounded-md px-2 py-1 cursor-pointer"
                        >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="invited">Invited</option>
                        </select>
                    </div>
                </div>

                {/* Referral link */}
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-sm font-medium text-gray-700 mb-2">Referral link</p>
                        <div className="flex items-center gap-2">
                            <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-800 truncate">
                                {tutor.referralLink}
                            </code>
                            <Button onClick={copyLink} variant="outline" className="cursor-pointer flex-shrink-0">
                                <Copy className="w-4 h-4" />
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
                            <Users className="w-6 h-6 text-green-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-900">{tutor.totalSubscribed}</div>
                            <div className="text-xs text-gray-600">Subscribed</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <DollarSign className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-900">£{tutor.totalCommissionEarned.toFixed(2)}</div>
                            <div className="text-xs text-gray-600">Earned</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <DollarSign className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                            <div className="text-2xl font-bold text-gray-900">
                                £{(tutor.totalCommissionEarned - tutor.totalCommissionPaid).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-600">Owed</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Payout method */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Landmark className="w-5 h-5 text-gray-500" /> Payout Method
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!tutor.payoutMethod ? (
                            <p className="text-sm text-gray-500">No bank details on file for this tutor yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {revealedPayout ? (
                                    <div className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-1.5">
                                        <p><span className="text-gray-500">Name on account:</span> {revealedPayout.accountName}</p>
                                        <p><span className="text-gray-500">Sort code:</span> {revealedPayout.sortCode ? formatSortCodeDisplay(revealedPayout.sortCode) : '—'}</p>
                                        <p><span className="text-gray-500">Account number:</span> {revealedPayout.accountNumber ?? '—'}</p>
                                        <button
                                            onClick={copyPayoutDetails}
                                            className="text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1 mt-1 text-sm"
                                        >
                                            <Copy className="w-3.5 h-3.5" /> Copy details
                                        </button>
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-600">
                                        {tutor.payoutMethod.accountName} · Sort code {tutor.payoutMethod.sortCodeLast} · Account ending •••• {tutor.payoutMethod.accountNumberLast4}
                                    </p>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={revealPayoutMethod}
                                    disabled={revealingPayout}
                                    className="cursor-pointer"
                                >
                                    {revealingPayout ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : revealedPayout ? (
                                        <><EyeOff className="w-3.5 h-3.5 mr-1.5" />Hide full details</>
                                    ) : (
                                        <><Eye className="w-3.5 h-3.5 mr-1.5" />Reveal full details</>
                                    )}
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Referrals */}
                <Card>
                    <CardHeader><CardTitle>Referrals</CardTitle></CardHeader>
                    <CardContent>
                        {loadingReferrals || referrals === null ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                        ) : referrals.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">No referrals yet.</p>
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
            </div>
        </div>
    );
}