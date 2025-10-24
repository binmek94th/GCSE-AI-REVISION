'use client';

import {Suspense, useEffect, useState} from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    applyActionCode,
    confirmPasswordReset,
    verifyPasswordResetCode,
} from 'firebase/auth';
import { Input } from '@/app/components/input';
import { Button } from '@/app/components/button';
import {auth} from "@/lib/firebase";

function AuthActionInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<string>('Processing...');
    const [newPassword, setNewPassword] = useState('');
    const [oobCodeValid, setOobCodeValid] = useState(false);
    const [mode, setMode] = useState<string | null>(null);
    const [oobCode, setOobCode] = useState<string | null>(null);

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
                    setStatus('Your email has been successfully verified!');
                })
                .catch((err) => {
                    setStatus(`Failed to verify email: ${err.message}`);
                });
        } else if (actionMode === 'resetPassword') {
            verifyPasswordResetCode(auth, code)
                .then((email) => {
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
        if (!oobCode) return;
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setStatus('Password has been reset successfully!');
            setOobCodeValid(false);
            router.push('/auth/login');
        } catch (err: any) {
            setStatus(`Failed to reset password: ${err.message}`);
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
                            className="bg-primary text-primary-foreground hover:bg-primary-dark"
                        >
                            Reset Password
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