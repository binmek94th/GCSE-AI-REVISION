'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/app/components/ui/button';
import { toast } from "sonner";
import { MailWarning, Loader2 } from 'lucide-react';

const CODE_LENGTH = 6;

export default function VerifyEmailPage() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const initialSendDone = useRef(false);

    // ── Code entry ────────────────────────────────────────────────────────────
    // Stored as an array of single characters so each box can be
    // independently controlled — joined together on submit.
    const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [verifying, setVerifying] = useState(false);

    const code = digits.join('');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserEmail(user.email);
                if (user.emailVerified) {
                    if (!(user as any).onboardingComplete)
                        router.push("/onboarding");
                    router.push('/dashboard');
                    return;
                }

                // Auto-send a code the first time this page loads for an
                // unverified user, so they don't have to click "Resend"
                // immediately after registering.
                if (!initialSendDone.current) {
                    initialSendDone.current = true;
                    sendCode(false);
                }
            } else {
                router.push('/auth/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const sendCode = async (showToast: boolean) => {
        if (!auth.currentUser) return;
        setResendLoading(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/auth/send-verification-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to send verification code');
            }

            const data = await res.json();
            if (data.alreadyVerified) {
                toast.success('Your email is already verified — redirecting...');
                router.push('/dashboard');
                return;
            }

            setCodeSent(true);
            setDigits(Array(CODE_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
            if (showToast) toast.success('Verification code sent');
        } catch (err: any) {
            if (showToast) toast.error(err.message || 'Failed to send verification code');
        } finally {
            setResendLoading(false);
        }
    };

    const handleResend = () => sendCode(true);

    // ── Per-box input handling ──────────────────────────────────────────────
    const handleDigitChange = (index: number, value: string) => {
        // Handle pasting a full code into any box: distribute across all boxes.
        if (value.length > 1) {
            const pasted = value.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');
            const next = Array(CODE_LENGTH).fill('');
            pasted.forEach((char, i) => { next[i] = char; });
            setDigits(next);
            const lastFilledIndex = Math.min(pasted.length, CODE_LENGTH) - 1;
            inputRefs.current[Math.max(lastFilledIndex, 0)]?.focus();
            return;
        }

        const digit = value.replace(/\D/g, '');
        setDigits(prev => {
            const next = [...prev];
            next[index] = digit;
            return next;
        });

        if (digit && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text');
        handleDigitChange(0, pastedText);
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.currentUser || code.length !== CODE_LENGTH) return;

        setVerifying(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const res = await fetch('/api/auth/verify-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ code }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            toast.success('Email verified! Redirecting...');

            // The Firebase Auth token still has the stale emailVerified
            // claim cached — force a refresh so onAuthStateChanged picks
            // up the new value and redirects correctly.
            await auth.currentUser.getIdToken(true);
            await auth.currentUser.reload();

            if (!(auth.currentUser as any).onboardingComplete) {
                router.push('/onboarding');
            } else {
                router.push('/dashboard');
            }
        } catch (err: any) {
            toast.error(err.message || 'Verification failed');
            // Clear the boxes on a failed attempt so the user isn't stuck
            // editing a code that's already known to be wrong.
            setDigits(Array(CODE_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setVerifying(false);
        }
    };

    const handleLogout = async () => {
        await signOut(auth);
        router.push('/auth/login');
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow">
                <h1 className="text-2xl font-medium mb-4">Verify Your Email</h1>
                <p className="mb-4">
                    {codeSent ? (
                        <>A 6-digit code has been sent to <strong>{userEmail}</strong>. Enter it below to verify your account.</>
                    ) : (
                        <>Sending a verification code to <strong>{userEmail}</strong>...</>
                    )}
                </p>

                {/* Spam-folder reminder */}
                <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3">
                    <MailWarning className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-800">
                        Can't find it? Please check your <strong>spam</strong> or <strong>junk</strong> folder.
                    </p>
                </div>

                <form onSubmit={handleVerify} className="flex flex-col gap-4">
                    <div className="flex justify-center gap-2">
                        {digits.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleDigitChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                autoFocus={index === 0}
                                className="w-11 h-13 sm:w-12 sm:h-14 rounded-md border border-border bg-background text-center text-xl font-semibold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                            />
                        ))}
                    </div>

                    <Button
                        type="submit"
                        disabled={verifying || code.length !== CODE_LENGTH}
                        className="bg-primary text-primary-foreground hover:bg-primary-dark hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin inline" />Verifying...</> : 'Verify Email'}
                    </Button>
                </form>

                <div className="flex flex-col gap-2 mt-3">
                    <Button
                        onClick={handleResend}
                        disabled={resendLoading}
                        variant="outline"
                        className="hover:cursor-pointer"
                    >
                        {resendLoading ? 'Sending...' : 'Resend Code'}
                    </Button>
                    <Button
                        onClick={handleLogout}
                        variant="destructive"
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
                    >
                        Logout
                    </Button>
                </div>
            </div>
        </main>
    );
}