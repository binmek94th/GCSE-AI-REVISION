'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import {
    onAuthStateChanged,
    signOut,
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, KeyRound, Landmark, Loader2, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import { normalizeAuthErrorCode } from '@/lib/authErrors';

interface TutorProfile {
    name: string;
    email: string | null;
    status: string | null;
    createdAt: string | null;
}

const NAME_MIN = 2;
const NAME_MAX = 80;
const PASSWORD_MIN = 8;

const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50 disabled:text-gray-500';

function passwordErrorMessage(err: unknown): string {
    switch (normalizeAuthErrorCode(err)) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
            return 'Your current password is incorrect.';
        case 'auth/weak-password':
            return 'That new password is too weak. Try a longer one.';
        case 'auth/too-many-requests':
            return 'Too many attempts. Please wait a few minutes and try again.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection and try again.';
        case 'auth/requires-recent-login':
            return 'For security, please log out and back in, then try again.';
        default:
            return 'Something went wrong. Please try again.';
    }
}

export default function TutorProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<TutorProfile | null>(null);
    // Only accounts that sign in with a password have one to change.
    const [hasPassword, setHasPassword] = useState(false);

    const [name, setName] = useState('');
    const [savingName, setSavingName] = useState(false);
    const [nameError, setNameError] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/tutors/login');
                return;
            }
            setHasPassword(user.providerData.some((p) => p.providerId === 'password'));
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/tutors/profile', { headers: { Authorization: `Bearer ${idToken}` } });
                if (!res.ok) {
                    toast.error("You aren't a tutor.");
                    router.push('/tutors/login');
                    return;
                }
                const data = await res.json();
                setProfile(data.profile);
                setName(data.profile.name ?? '');
            } catch (err) {
                console.error(err);
                toast.error("Couldn't load your profile. Please refresh and try again.");
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    const trimmedName = name.replace(/\s+/g, ' ').trim();
    const nameValid = trimmedName.length >= NAME_MIN && trimmedName.length <= NAME_MAX;
    const nameChanged = !!profile && trimmedName !== profile.name;

    const saveName = async () => {
        if (!nameValid || !nameChanged) return;
        setSavingName(true);
        setNameError(null);
        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch('/api/tutors/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ name: trimmedName }),
            });
            const data = await res.json();
            if (!res.ok) {
                setNameError(data.error ?? 'Something went wrong. Please try again.');
                return;
            }
            setProfile((p) => (p ? { ...p, name: data.profile.name } : p));
            setName(data.profile.name);
            toast.success('Name updated');
        } catch {
            setNameError('Something went wrong. Please try again.');
        } finally {
            setSavingName(false);
        }
    };

    const savePassword = async () => {
        setPasswordError(null);
        const user = auth.currentUser;
        if (!user?.email) return;
        if (!currentPassword) return setPasswordError('Enter your current password.');
        if (newPassword.length < PASSWORD_MIN) return setPasswordError(`Your new password must be at least ${PASSWORD_MIN} characters.`);
        if (newPassword === currentPassword) return setPasswordError('Your new password must be different from your current one.');
        if (newPassword !== confirmPassword) return setPasswordError("The new passwords don't match.");

        setSavingPassword(true);
        try {
            // Changing a password requires proving you know the current one.
            await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
            await updatePassword(user, newPassword);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            toast.success('Password updated');
        } catch (err) {
            console.error('Password change failed:', err);
            setPasswordError(passwordErrorMessage(err));
        } finally {
            setSavingPassword(false);
        }
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

    if (!profile) return null;

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/tutors/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="w-4 h-4" /> Back to dashboard
                        </Link>
                        <h1 className="mt-1 text-2xl font-bold text-gray-900">Your profile</h1>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="cursor-pointer">
                        <LogOut className="w-4 h-4 mr-2" /> Log out
                    </Button>
                </div>

                {/* Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="w-5 h-5 text-gray-500" /> Your details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label htmlFor="tutor-name" className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                            <input
                                id="tutor-name"
                                type="text"
                                value={name}
                                maxLength={NAME_MAX}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setNameError(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveName();
                                }}
                                className={inputClass}
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Students you work with see this name under Profile → My Tutor.
                            </p>
                            {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
                        </div>

                        <div>
                            <label htmlFor="tutor-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input id="tutor-email" type="email" value={profile.email ?? ''} disabled readOnly className={inputClass} />
                            <p className="mt-1 text-xs text-gray-500">Your email is your sign-in and can&#39;t be changed here.</p>
                        </div>

                        {profile.createdAt && (
                            <p className="text-xs text-gray-500">
                                Partner since {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        )}

                        <Button
                            onClick={saveName}
                            disabled={savingName || !nameValid || !nameChanged}
                            className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                        >
                            {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save name'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Password */}
                {hasPassword && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-gray-500" /> Password
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
                                <input
                                    id="current-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                                <input
                                    id="new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className={inputClass}
                                />
                                <p className="mt-1 text-xs text-gray-500">At least {PASSWORD_MIN} characters.</p>
                            </div>
                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={inputClass}
                                />
                            </div>
                            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
                            <Button
                                onClick={savePassword}
                                disabled={savingPassword}
                                className="cursor-pointer bg-blue-600 hover:bg-blue-700"
                            >
                                {savingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update password'}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Payouts live on the dashboard */}
                <Card>
                    <CardContent className="pt-6 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                            <Landmark className="w-5 h-5 text-gray-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">Payout details</p>
                                <p className="text-xs text-gray-500">Where your commission is paid. Managed from your dashboard.</p>
                            </div>
                        </div>
                        <Link href="/tutors/dashboard" className="text-sm font-medium text-blue-600 hover:underline whitespace-nowrap">
                            Go to dashboard
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
