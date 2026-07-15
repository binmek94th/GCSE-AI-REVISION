'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Loader2, MailCheck } from 'lucide-react';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function TutorVerifyEmailPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [verifying, setVerifying] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const hasSentInitial = useRef(false);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, u => {
            setUser(u);
            setAuthChecked(true);
            if (!u) router.push('/tutors/login');
        });
        return unsub;
    }, [router]);

    const sendCode = useCallback(async () => {
        if (!auth.currentUser) return;
        setSending(true);
        setError(null);
        setInfo(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/auth/send-verification-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Failed to send code');
                return;
            }

            if (data.alreadyVerified) {
                router.push('/tutors/dashboard');
                return;
            }

            setInfo('Code sent — check your inbox.');
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch {
            setError('Failed to send code. Please try again.');
        } finally {
            setSending(false);
        }
    }, [router]);

    // Auto-send once, as soon as we know the user is signed in.
    useEffect(() => {
        if (authChecked && user && !hasSentInitial.current) {
            hasSentInitial.current = true;
            sendCode();
        }
    }, [authChecked, user, sendCode]);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setTimeout(() => setCooldown(c => c - 1), 1000);
        return () => clearTimeout(t);
    }, [cooldown]);

    const handleDigitChange = (index: number, value: string) => {
        const clean = value.replace(/\D/g, '');
        if (!clean) {
            const next = [...digits];
            next[index] = '';
            setDigits(next);
            return;
        }

        // Support pasting the full code into one box.
        if (clean.length > 1) {
            const chars = clean.slice(0, CODE_LENGTH).split('');
            const next = Array(CODE_LENGTH).fill('');
            chars.forEach((c, i) => { next[i] = c; });
            setDigits(next);
            const lastIndex = Math.min(chars.length, CODE_LENGTH - 1);
            inputRefs.current[lastIndex]?.focus();
            return;
        }

        const next = [...digits];
        next[index] = clean;
        setDigits(next);
        if (index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        const code = digits.join('');
        if (code.length !== CODE_LENGTH) {
            setError('Enter the full 6-digit code');
            return;
        }
        if (!auth.currentUser) return;

        setVerifying(true);
        setError(null);
        setInfo(null);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ code }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Verification failed');
                setDigits(Array(CODE_LENGTH).fill(''));
                inputRefs.current[0]?.focus();
                return;
            }

            // Refresh the token so emailVerified is current on the client.
            await auth.currentUser.getIdToken(true);
            router.push('/tutors/dashboard');
        } catch {
            setError('Verification failed. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    if (!authChecked) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full">
                <CardHeader className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-3">
                        <MailCheck className="w-7 h-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl">Verify your email</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                        We sent a 6-digit code to {user?.email}
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center gap-2 mb-4">
                        {digits.map((d, i) => (
                            <input
                                key={i}
                                ref={el => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={CODE_LENGTH}
                                value={d}
                                onChange={e => handleDigitChange(i, e.target.value)}
                                onKeyDown={e => handleKeyDown(i, e)}
                                className="w-11 h-13 text-center text-lg font-semibold rounded-lg border border-gray-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                            />
                        ))}
                    </div>

                    {error && <p className="text-sm text-red-600 text-center mb-2">{error}</p>}
                    {info && !error && <p className="text-sm text-green-600 text-center mb-2">{info}</p>}

                    <Button
                        onClick={handleVerify}
                        className="w-full bg-blue-600 hover:bg-blue-700 cursor-pointer"
                        disabled={verifying || digits.join('').length !== CODE_LENGTH}
                    >
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Verify'}
                    </Button>

                    <button
                        onClick={sendCode}
                        disabled={sending || cooldown > 0}
                        className="w-full text-xs text-center text-blue-600 hover:underline mt-3 disabled:text-gray-400 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
                    >
                        {cooldown > 0 ? `Resend code in ${cooldown}s` : sending ? 'Sending...' : 'Resend code'}
                    </button>
                </CardContent>
            </Card>
        </div>
    );
}