'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    applyActionCode,
    confirmPasswordReset,
    verifyPasswordResetCode,
    signInWithEmailAndPassword,
} from 'firebase/auth';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { auth } from "@/lib/firebase";

function AuthActionInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<string>('Processing...');
    const [newPassword, setNewPassword] = useState('');
    const [oobCodeValid, setOobCodeValid] = useState(false);
    const [mode, setMode] = useState<string | null>(null);
    const [oobCode, setOobCode] = useState<string | null>(null);
    const [resetEmail, setResetEmail] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState(false);

    useEffect(() => {
        const actionMode = searchParams.get('mode');
        const code = searchParams.get('oobCode');
        if (!actionMode || !code) {
            setStatus('Invalid action link.');
            return;
        }
        setMode(actionMode);
        setOobCode(code);

        if (actionMode === 'verifyEmail') {
            applyActionCode(auth, code)
                .then(() => {
                    setStatus('Your email has been successfully verified! Redirecting...');
                    setTimeout(() => router.push('/auth/login'), 2000);
                })
                .catch((err) => {
                    setStatus(`Failed to verify email: ${err.message}`);
                });
        } else if (actionMode === 'resetPassword') {
            verifyPasswordResetCode(auth, code)
                .then((email) => {
                    setResetEmail(email);
                    setStatus(`Reset password for ${email}`);
                    setOobCodeValid(true);
                })
                .catch((err) => {
                    setStatus(`Invalid or expired password reset link: ${err.message}`);
                });
        } else {
            setStatus('Unsupported action.');
        }
    }, [searchParams]);

    const handleResetPassword = async () => {
        if (!oobCode || !resetEmail) return;
        setIsResetting(true);

        try {
            // 1. Reset the password in Firebase Auth
            await confirmPasswordReset(auth, oobCode, newPassword);

            // 2. Clear the Firestore lockout record for this email so the
            //    login page stops blocking them. Fire-and-forget — a failure
            //    here does not stop the user from proceeding.
            await fetch('/api/clear-login-attempts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
            }).catch(() => {});

            // 3. Sign in with the new password to establish a session
            await signInWithEmailAndPassword(auth, resetEmail, newPassword);

            setStatus('Password reset successfully! Redirecting...');
            setOobCodeValid(false);
            setTimeout(() => router.push('/dashboard'), 1500);

        } catch (err: any) {
            if (err.code === 'auth/too-many-requests') {
                setStatus(
                    'Password reset successfully, but your account is temporarily locked by Firebase. ' +
                    'Please wait a few minutes then log in.'
                );
                setOobCodeValid(false);
                setTimeout(() => router.push('/auth/login'), 4000);
            } else {
                setStatus(`Failed to reset password: ${err.message}`);
            }
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow">
                <h1 className="text-2xl font-medium mb-4">Account Action</h1>
                <p className="mb-4">{status}</p>

                {mode === 'resetPassword' && oobCodeValid && (
                    <div className="flex flex-col gap-4">
                        <Input
                            type="password"
                            placeholder="New Password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-input-background"
                        />
                        <Button
                            onClick={handleResetPassword}
                            disabled={isResetting || !newPassword}
                            className="bg-primary text-primary-foreground hover:bg-primary-dark"
                        >
                            {isResetting ? 'Resetting…' : 'Reset Password'}
                        </Button>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function AuthActionPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
            <AuthActionInner />
        </Suspense>
    );
}