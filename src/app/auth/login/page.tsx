'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import {auth, db} from '@/lib/firebase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {Button} from "@/app/components/button";
import {Input} from "@/app/components/input";
import {doc, getDoc} from "@firebase/firestore";

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { isSubmitting },
    } = useForm<LoginForm>({
        resolver: zodResolver(loginSchema),
    });
    const getFriendlyAuthError = (errorCode: string): string => {
        switch (errorCode) {
            case "auth/invalid-email":
                return "Invalid email address. Please check and try again.";

            case "auth/user-disabled":
                return "This account has been disabled. Contact support.";

            case "auth/user-not-found":
            case "auth/wrong-password":
                return "Incorrect email or password. Please try again.";

            case "auth/too-many-requests":
                return "Too many failed attempts. Please try again later.";

            case "auth/network-request-failed":
                return "Network error. Please check your connection.";

            case "auth/missing-password":
                return "Password is required.";

            case "auth/invalid-credential":
            case "auth/request-had-invalid-authentication-credentials":
                return "Your login session is invalid or expired. Please try again.";

            default:
                return "Something went wrong. Please try again.";
        }
    };

    const onSubmit = async (data: LoginForm) => {
        setError(null);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);

            // TODO: Enable email verification flow
            // if (!userCredential.user.emailVerified) {
            //     router.push('/verify-email');
            //     return;
            // }

            const userDocRef = doc(db, "users", userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();

                if (!userData.onboardingComplete) {
                    router.push("/onboarding");
                    return;
                }
            } else {
                router.push("/auth/register");
                return;
            }

            router.push('/dashboard');
        } catch (err: any) {
            setError(getFriendlyAuthError(err.message));
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow">
                <h1 className="text-2xl font-medium mb-4">Login</h1>

                {error && <p className="text-destructive mb-2">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        type="email"
                        placeholder="Email"
                        {...register('email')}
                        className="w-full bg-input-background"
                    />
                    <Input
                        type="password"
                        placeholder="Password"
                        {...register('password')}
                        className="w-full bg-input-background"
                    />

                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
                    >
                        {isSubmitting ? 'Logging in...' : 'Login'}
                    </Button>
                </form>

                <p className="mt-4 text-sm text-muted-foreground">
                    Don’t have an account?{' '}
                    <a href="/auth/register" className="text-primary underline">
                        Register
                    </a>
                </p>
            </div>
        </main>
    );
}
