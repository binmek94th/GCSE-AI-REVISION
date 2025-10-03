'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/app/components/button';
import {toast} from "sonner";

export default function VerifyEmailPage() {
    const router = useRouter();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [resendLoading, setResendLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUserEmail(user.email);
                if (user.emailVerified) {
                    router.push('/dashboard');
                }
            } else {
                router.push('/auth/login');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleResend = async () => {
        if (!auth.currentUser) return;
        setResendLoading(true);
        try {
            await sendEmailVerification(auth.currentUser);
            toast.success('Verification successfully sent');
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setResendLoading(false);
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
                    A verification email has been sent to <strong>{userEmail}</strong>. <br />
                    Please check your inbox and click the verification link before logging in.
                </p>

                <div className="flex flex-col gap-2">
                    <Button
                        onClick={handleResend}
                        disabled={resendLoading}
                        className="bg-primary text-primary-foreground hover:bg-primary-dark"
                    >
                        {resendLoading ? 'Sending...' : 'Resend Email'}
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
