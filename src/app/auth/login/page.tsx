'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp } from "@firebase/firestore";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 15;
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

const forgotSchema = z.object({
    resetEmail: z.string().email('Please enter a valid email address.'),
});

type LoginForm = z.infer<typeof loginSchema>;
type ForgotForm = z.infer<typeof forgotSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Sanitise an email address into a safe Firestore document ID */
const emailToDocId = (email: string) => email.toLowerCase().replace(/\./g, '_dot_').replace(/@/g, '_at_');

const getFriendlyAuthError = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'Invalid email address. Please check and try again.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Contact support.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/request-had-invalid-authentication-credentials':
            return 'Incorrect email or password. Please try again.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your connection.';
        case 'auth/missing-password':
            return 'Password is required.';
        default:
            return 'Something went wrong. Please try again.';
    }
};

const formatCountdown = (ms: number): string => {
    const totalSeconds = Math.ceil(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function LoginPage() {
    const router = useRouter();

    // Login state
    const [error, setError] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [lockoutRemaining, setLockoutRemaining] = useState(0);

    // Forgot-password state
    const [showForgot, setShowForgot] = useState(false);
    const [resetSent, setResetSent] = useState(false);
    const [resetError, setResetError] = useState<string | null>(null);
    const [isSendingReset, setIsSendingReset] = useState(false);

    // ---------------------------------------------------------------------------
    // Forms
    // ---------------------------------------------------------------------------
    const {
        register,
        handleSubmit,
        watch,
        formState: { isSubmitting },
    } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

    const {
        register: registerForgot,
        handleSubmit: handleForgotSubmit,
        formState: { errors: forgotErrors },
        reset: resetForgotForm,
    } = useForm<ForgotForm>({ resolver: zodResolver(forgotSchema) });

    const watchedEmail = watch('email');

    // ---------------------------------------------------------------------------
    // Lockout countdown ticker
    // ---------------------------------------------------------------------------
    useEffect(() => {
        if (!isLocked || lockoutRemaining <= 0) return;

        const interval = setInterval(() => {
            setLockoutRemaining((prev) => {
                const next = prev - 1000;
                if (next <= 0) {
                    setIsLocked(false);
                    clearInterval(interval);
                    return 0;
                }
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isLocked, lockoutRemaining]);

    // ---------------------------------------------------------------------------
    // Lockout helpers (Firestore: users_login_attempts/{emailDocId})
    // ---------------------------------------------------------------------------
    const getAttemptDoc = useCallback(async (email: string) => {
        const docId = emailToDocId(email);
        const ref = doc(db, 'users_login_attempts', docId);
        const snap = await getDoc(ref);
        return { ref, snap };
    }, []);

    /**
     * Check if the email is currently locked out.
     * Returns { locked: true, remainingMs } or { locked: false }.
     */
    const checkLockout = useCallback(async (email: string): Promise<{ locked: boolean; remainingMs?: number }> => {
        const { snap } = await getAttemptDoc(email);
        if (!snap.exists()) return { locked: false };

        const data = snap.data();
        const attempts: number = data.attempts ?? 0;
        const lockedAt: Timestamp | null = data.lockedAt ?? null;

        if (attempts >= MAX_ATTEMPTS && lockedAt) {
            const lockedAtMs = lockedAt.toMillis();
            const elapsed = Date.now() - lockedAtMs;
            if (elapsed < LOCKOUT_MS) {
                return { locked: true, remainingMs: LOCKOUT_MS - elapsed };
            }
            // Lockout expired — clear it
            await deleteDoc(snap.ref);
            return { locked: false };
        }

        return { locked: false };
    }, [getAttemptDoc]);

    /** Increment the failed attempt counter; lock if threshold reached */
    const recordFailedAttempt = useCallback(async (email: string) => {
        const { ref, snap } = await getAttemptDoc(email);
        const prev = snap.exists() ? (snap.data().attempts ?? 0) : 0;
        const newAttempts = prev + 1;

        await setDoc(ref, {
            attempts: newAttempts,
            lastAttempt: serverTimestamp(),
            ...(newAttempts >= MAX_ATTEMPTS ? { lockedAt: serverTimestamp() } : {}),
        }, { merge: true });

        return newAttempts;
    }, [getAttemptDoc]);

    /** Clear attempt record after successful login */
    const clearAttempts = useCallback(async (email: string) => {
        const { ref } = await getAttemptDoc(email);
        await deleteDoc(ref).catch(() => {}); // non-fatal
    }, [getAttemptDoc]);

    // ---------------------------------------------------------------------------
    // Login submit
    // ---------------------------------------------------------------------------
    const onSubmit = async (data: LoginForm) => {
        setError(null);

        // 1. Check lockout before doing anything
        const lockStatus = await checkLockout(data.email);
        if (lockStatus.locked) {
            setIsLocked(true);
            setLockoutRemaining(lockStatus.remainingMs ?? LOCKOUT_MS);
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);

            // Success — clear any previous attempt record
            await clearAttempts(data.email);

            if (!userCredential.user.emailVerified) {
                router.push('/verify-email');
                return;
            }

            const userDocRef = doc(db, 'users', userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (!userData.onboardingComplete) {
                    router.push('/onboarding');
                    return;
                }
            } else {
                router.push('/auth/register');
                return;
            }

            router.push('/dashboard');
        } catch (err: any) {
            // Wrong credentials — increment attempt counter
            const isCredentialError = [
                'auth/wrong-password',
                'auth/user-not-found',
                'auth/invalid-credential',
                'auth/request-had-invalid-authentication-credentials',
            ].includes(err.code);

            if (isCredentialError) {
                const attempts = await recordFailedAttempt(data.email);
                const remaining = MAX_ATTEMPTS - attempts;

                if (attempts >= MAX_ATTEMPTS) {
                    setIsLocked(true);
                    setLockoutRemaining(LOCKOUT_MS);
                    setError(
                        `Account temporarily locked after ${MAX_ATTEMPTS} failed attempts. ` +
                        `Please try again in ${LOCKOUT_MINUTES} minutes or reset your password.`
                    );
                } else {
                    setError(
                        `${getFriendlyAuthError(err.code)} ` +
                        `${remaining} attempt${remaining === 1 ? '' : 's'} remaining before your account is locked.`
                    );
                }
            } else {
                setError(getFriendlyAuthError(err.code ?? err.message));
            }
        }
    };

    // ---------------------------------------------------------------------------
    // Forgot-password submit
    // ---------------------------------------------------------------------------
    const onForgotSubmit = async (data: ForgotForm) => {
        setResetError(null);
        setIsSendingReset(true);
        try {
            await sendPasswordResetEmail(auth, data.resetEmail);
            setResetSent(true);
        } catch (err: any) {
            // Deliberately vague to avoid user-enumeration
            setResetSent(true);
        } finally {
            setIsSendingReset(false);
        }
    };

    const closeForgot = () => {
        setShowForgot(false);
        setResetSent(false);
        setResetError(null);
        resetForgotForm();
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow">
                <h1 className="text-2xl font-medium mb-4">Login</h1>

                {/* ── Error banner ── */}
                {error && (
                    <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}

                {/* ── Locked state banner ── */}
                {isLocked && lockoutRemaining > 0 && (
                    <div className="mb-4 rounded-md border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        <p className="font-medium">Account temporarily locked</p>
                        <p className="mt-1 text-xs">
                            Try again in{' '}
                            <span className="font-mono font-semibold">{formatCountdown(lockoutRemaining)}</span>
                            {' '}or{' '}
                            <button
                                type="button"
                                onClick={() => {
                                    setShowForgot(true);
                                    // Pre-fill with the email they were trying
                                    resetForgotForm({ resetEmail: watchedEmail ?? '' });
                                }}
                                className="underline font-medium"
                            >
                                reset your password
                            </button>
                            .
                        </p>
                    </div>
                )}

                {/* ── Login form ── */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="Email"
                        {...register('email')}
                        className="w-full bg-input-background"
                        disabled={isLocked}
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        {...register('password')}
                        className="w-full bg-input-background"
                        disabled={isLocked}
                    />

                    {/* Forgot password link */}
                    <div className="flex justify-end -mt-1">
                        <button
                            type="button"
                            onClick={() => {
                                setShowForgot(true);
                                resetForgotForm({ resetEmail: watchedEmail ?? '' });
                            }}
                            className="text-xs text-primary underline hover:text-primary/80 transition-colors"
                        >
                            Forgot password?
                        </button>
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting || isLocked}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary-dark cursor-pointer disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'Logging in…' : 'Login'}
                    </Button>
                </form>

                <p className="mt-4 text-sm text-muted-foreground">
                    Don&#39;t have an account?{' '}
                    <a href="/auth/register" className="text-primary underline">
                        Register
                    </a>
                </p>
            </div>

            {/* ── Forgot-password modal ── */}
            {showForgot && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) closeForgot(); }}
                >
                    <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-xl mx-4">
                        {resetSent ? (
                            /* ── Success state ── */
                            <div className="text-center space-y-3">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h2 className="text-lg font-medium">Check your email</h2>
                                <p className="text-sm text-muted-foreground">
                                    If an account exists for that email, we've sent a password reset link. Check your inbox and spam folder.
                                </p>
                                <Button onClick={closeForgot} className="w-full mt-2">
                                    Back to login
                                </Button>
                            </div>
                        ) : (
                            /* ── Reset form ── */
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-medium">Reset password</h2>
                                    <button
                                        type="button"
                                        onClick={closeForgot}
                                        className="text-muted-foreground hover:text-foreground transition-colors"
                                        aria-label="Close"
                                    >
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>

                                <p className="text-sm text-muted-foreground mb-4">
                                    Enter the email address linked to your account and we'll send you a reset link.
                                </p>

                                {resetError && (
                                    <p className="mb-3 text-sm text-destructive">{resetError}</p>
                                )}

                                <form onSubmit={handleForgotSubmit(onForgotSubmit)} className="space-y-4">
                                    <div>
                                        <Input
                                            type="email"
                                            placeholder="Your email address"
                                            {...registerForgot('resetEmail')}
                                            className="w-full bg-input-background"
                                        />
                                        {forgotErrors.resetEmail && (
                                            <p className="mt-1 text-xs text-destructive">
                                                {forgotErrors.resetEmail.message}
                                            </p>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isSendingReset}
                                        className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
                                    >
                                        {isSendingReset ? 'Sending…' : 'Send reset link'}
                                    </Button>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}