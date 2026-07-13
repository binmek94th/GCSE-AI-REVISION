'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Loader2, Copy, Check, Plus, ChevronDown, ChevronUp, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

interface Tutor {
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
}

interface Referral {
    id: string;
    referredEmail: string | null;
    status: string;
    signedUpAt: string | null;
    subscribedAt: string | null;
    firstYearEndsAt: string | null;
}

interface CommissionEvent {
    id: string;
    tutorId: string;
    tutorName: string;
    subscriptionAmount: number;
    commissionAmount: number;
    status: string;
    createdAt: string | null;
    paidAt: string | null;
}

const statusStyle: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-700',
    invited: 'bg-amber-100 text-amber-700',
    signed_up: 'bg-blue-100 text-blue-700',
    subscribed: 'bg-green-100 text-green-700',
    churned: 'bg-red-100 text-red-700',
    pending: 'bg-amber-100 text-amber-700',
    approved: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
};

export default function AdminTutorsPage() {
    const [idToken, setIdToken] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'tutors' | 'payouts'>('tutors');

    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loadingTutors, setLoadingTutors] = useState(true);
    const [expandedTutorId, setExpandedTutorId] = useState<string | null>(null);
    const [tutorReferrals, setTutorReferrals] = useState<Record<string, Referral[]>>({});

    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteName, setInviteName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    const [commissionEvents, setCommissionEvents] = useState<CommissionEvent[]>([]);
    const [loadingPayouts, setLoadingPayouts] = useState(true);
    const [payoutFilter, setPayoutFilter] = useState<'pending' | 'approved' | 'paid' | ''>('pending');
    const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
    const [payoutNote, setPayoutNote] = useState('');
    const [processingPayout, setProcessingPayout] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) return;
            const token = await user.getIdToken();
            setIdToken(token);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (idToken) fetchTutors();
    }, [idToken]);

    useEffect(() => {
        if (idToken && activeTab === 'payouts') fetchCommissionEvents();
    }, [idToken, activeTab, payoutFilter]);

    const fetchTutors = async () => {
        setLoadingTutors(true);
        try {
            const res = await fetch('/api/admin/tutors', { headers: { Authorization: `Bearer ${idToken}` } });
            if (!res.ok) throw new Error('Failed to fetch tutors');
            const data = await res.json();
            setTutors(data.tutors);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load tutors');
        } finally {
            setLoadingTutors(false);
        }
    };

    const fetchCommissionEvents = async () => {
        setLoadingPayouts(true);
        try {
            const url = payoutFilter
                ? `/api/admin/commission-events?status=${payoutFilter}`
                : '/api/admin/commission-events';
            const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
            if (!res.ok) throw new Error('Failed to fetch commission events');
            const data = await res.json();
            setCommissionEvents(data.events);
            setSelectedEventIds(new Set());
        } catch (err) {
            console.error(err);
            toast.error('Failed to load payouts');
        } finally {
            setLoadingPayouts(false);
        }
    };

    const toggleExpandTutor = async (tutorId: string) => {
        if (expandedTutorId === tutorId) {
            setExpandedTutorId(null);
            return;
        }
        setExpandedTutorId(tutorId);

        if (!tutorReferrals[tutorId]) {
            try {
                const res = await fetch(`/api/admin/tutors/${tutorId}/referrals`, {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setTutorReferrals(prev => ({ ...prev, [tutorId]: data.referrals }));
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        try {
            const res = await fetch('/api/admin/tutors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ name: inviteName, email: inviteEmail }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to invite tutor');
            }
            toast.success('Tutor invited!');
            setInviteName('');
            setInviteEmail('');
            setShowInviteForm(false);
            fetchTutors();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to invite tutor');
        } finally {
            setInviting(false);
        }
    };

    const handleStatusChange = async (tutorId: string, newStatus: string) => {
        // Optimistic update
        setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, status: newStatus as Tutor['status'] } : t));

        try {
            const res = await fetch(`/api/admin/tutors/${tutorId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ status: newStatus }),
            });
            if (!res.ok) throw new Error('Failed to update status');
        } catch (err) {
            toast.error('Failed to update tutor status');
            fetchTutors(); // revert on failure
        }
    };

    const copyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        toast.success('Referral link copied!');
    };

    const toggleSelectEvent = (id: string) => {
        setSelectedEventIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedEventIds.size === commissionEvents.length) {
            setSelectedEventIds(new Set());
        } else {
            setSelectedEventIds(new Set(commissionEvents.map(e => e.id)));
        }
    };

    const handleMarkPaid = async () => {
        if (selectedEventIds.size === 0) return;
        setProcessingPayout(true);
        try {
            const res = await fetch('/api/admin/commission-events/payout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ eventIds: Array.from(selectedEventIds), note: payoutNote || null }),
            });
            if (!res.ok) throw new Error('Failed to record payout');
            const data = await res.json();
            toast.success(`Marked ${data.eventsMarkedPaid} commission event(s) as paid`);
            setPayoutNote('');
            fetchCommissionEvents();
            fetchTutors();
        } catch (err) {
            toast.error('Failed to record payout');
        } finally {
            setProcessingPayout(false);
        }
    };

    const selectedTotal = commissionEvents
        .filter(e => selectedEventIds.has(e.id))
        .reduce((sum, e) => sum + e.commissionAmount, 0);

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tutor Partner Admin</h1>
                    <p className="text-sm text-gray-600">Manage tutors, referrals, and payouts</p>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('tutors')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${
                            activeTab === 'tutors' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <Users className="w-4 h-4 inline mr-1.5" /> Tutors
                    </button>
                    <button
                        onClick={() => setActiveTab('payouts')}
                        className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px cursor-pointer ${
                            activeTab === 'payouts' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <DollarSign className="w-4 h-4 inline mr-1.5" /> Payouts
                    </button>
                </div>

                {/* ══ Tutors tab ══ */}
                {activeTab === 'tutors' && (
                    <>
                        <div className="flex justify-end">
                            <Button onClick={() => setShowInviteForm(v => !v)} className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                                <Plus className="w-4 h-4 mr-2" /> Invite Tutor
                            </Button>
                        </div>

                        {showInviteForm && (
                            <Card>
                                <CardContent className="pt-6">
                                    <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
                                        <input
                                            type="text"
                                            placeholder="Tutor name"
                                            required
                                            value={inviteName}
                                            onChange={e => setInviteName(e.target.value)}
                                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            required
                                            value={inviteEmail}
                                            onChange={e => setInviteEmail(e.target.value)}
                                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
                                        />
                                        <Button type="submit" disabled={inviting} className="bg-blue-600 hover:bg-blue-700 cursor-pointer">
                                            {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Invite'}
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>
                        )}

                        <Card>
                            <CardHeader><CardTitle>All Tutors ({tutors.length})</CardTitle></CardHeader>
                            <CardContent>
                                {loadingTutors ? (
                                    <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                                ) : tutors.length === 0 ? (
                                    <p className="text-sm text-gray-500 text-center py-8">No tutors yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {tutors.map(t => (
                                            <div key={t.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                                <div className="p-3 flex flex-wrap items-center gap-3">
                                                    <button
                                                        onClick={() => toggleExpandTutor(t.id)}
                                                        className="flex items-center gap-2 flex-1 min-w-[200px] cursor-pointer text-left"
                                                    >
                                                        {expandedTutorId === t.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                                                            <p className="text-xs text-gray-500">{t.email}</p>
                                                        </div>
                                                    </button>

                                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[t.status]}`}>
                                                        {t.status}
                                                    </span>

                                                    <div className="flex gap-4 text-xs text-gray-600">
                                                        <span>{t.totalReferrals} referred</span>
                                                        <span>{t.totalSubscribed} subscribed</span>
                                                        <span className="font-semibold text-gray-900">£{t.totalCommissionEarned.toFixed(2)} earned</span>
                                                        <span className="text-amber-700 font-semibold">£{(t.totalCommissionEarned - t.totalCommissionPaid).toFixed(2)} owed</span>
                                                    </div>

                                                    <button onClick={() => copyLink(t.referralLink)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                                                        <Copy className="w-4 h-4" />
                                                    </button>

                                                    <select
                                                        value={t.status}
                                                        onChange={e => handleStatusChange(t.id, e.target.value)}
                                                        className="text-xs border border-gray-300 rounded-md px-2 py-1 cursor-pointer"
                                                    >
                                                        <option value="active">Active</option>
                                                        <option value="inactive">Inactive</option>
                                                        <option value="invited">Invited</option>
                                                    </select>
                                                </div>

                                                {expandedTutorId === t.id && (
                                                    <div className="p-3 border-t border-gray-200 bg-gray-50">
                                                        {!tutorReferrals[t.id] ? (
                                                            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
                                                        ) : tutorReferrals[t.id].length === 0 ? (
                                                            <p className="text-xs text-gray-500 py-2">No referrals yet.</p>
                                                        ) : (
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                <tr className="text-left text-gray-500">
                                                                    <th className="pb-1 font-medium">Student</th>
                                                                    <th className="pb-1 font-medium">Status</th>
                                                                    <th className="pb-1 font-medium">Signed Up</th>
                                                                    <th className="pb-1 font-medium">Rev-Share Ends</th>
                                                                </tr>
                                                                </thead>
                                                                <tbody>
                                                                {tutorReferrals[t.id].map(r => (
                                                                    <tr key={r.id} className="border-t border-gray-200">
                                                                        <td className="py-1.5 text-gray-900">{r.referredEmail ?? '—'}</td>
                                                                        <td className="py-1.5">
                                                                            <span className={`px-1.5 py-0.5 rounded-full font-semibold ${statusStyle[r.status]}`}>{r.status}</span>
                                                                        </td>
                                                                        <td className="py-1.5 text-gray-600">{r.signedUpAt ? new Date(r.signedUpAt).toLocaleDateString() : '—'}</td>
                                                                        <td className="py-1.5 text-gray-600">{r.firstYearEndsAt ? new Date(r.firstYearEndsAt).toLocaleDateString() : '—'}</td>
                                                                    </tr>
                                                                ))}
                                                                </tbody>
                                                            </table>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* ══ Payouts tab ══ */}
                {activeTab === 'payouts' && (
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                            <CardTitle>Commission Events</CardTitle>
                            <div className="flex gap-2">
                                {(['pending', 'approved', 'paid', ''] as const).map(f => (
                                    <button
                                        key={f || 'all'}
                                        onClick={() => setPayoutFilter(f)}
                                        className={`text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer ${
                                            payoutFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
                                    </button>
                                ))}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loadingPayouts ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
                            ) : commissionEvents.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center py-8">No commission events for this filter.</p>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                            <tr className="text-left text-gray-500 border-b">
                                                <th className="pb-2 pr-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedEventIds.size === commissionEvents.length}
                                                        onChange={toggleSelectAll}
                                                        className="cursor-pointer"
                                                    />
                                                </th>
                                                <th className="pb-2 font-medium">Tutor</th>
                                                <th className="pb-2 font-medium">Date</th>
                                                <th className="pb-2 font-medium">Subscription</th>
                                                <th className="pb-2 font-medium">Commission</th>
                                                <th className="pb-2 font-medium">Status</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {commissionEvents.map(e => (
                                                <tr key={e.id} className="border-b last:border-0">
                                                    <td className="py-2 pr-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedEventIds.has(e.id)}
                                                            onChange={() => toggleSelectEvent(e.id)}
                                                            disabled={e.status === 'paid'}
                                                            className="cursor-pointer disabled:cursor-not-allowed"
                                                        />
                                                    </td>
                                                    <td className="py-2 text-gray-900">{e.tutorName}</td>
                                                    <td className="py-2 text-gray-600">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '—'}</td>
                                                    <td className="py-2 text-gray-600">£{e.subscriptionAmount.toFixed(2)}</td>
                                                    <td className="py-2 font-semibold text-gray-900">£{e.commissionAmount.toFixed(2)}</td>
                                                    <td className="py-2">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusStyle[e.status]}`}>{e.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {selectedEventIds.size > 0 && (
                                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap items-center gap-3">
                                            <span className="text-sm font-semibold text-blue-900">
                                                {selectedEventIds.size} selected · £{selectedTotal.toFixed(2)}
                                            </span>
                                            <input
                                                type="text"
                                                placeholder="Payout note (e.g. bank ref)"
                                                value={payoutNote}
                                                onChange={e => setPayoutNote(e.target.value)}
                                                className="flex-1 min-w-[180px] rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none"
                                            />
                                            <Button onClick={handleMarkPaid} disabled={processingPayout} className="bg-green-600 hover:bg-green-700 cursor-pointer">
                                                {processingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Paid'}
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}