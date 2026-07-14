'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { doc, setDoc } from "@firebase/firestore";
import { CheckCircle, XCircle, Loader2, Gift } from 'lucide-react';

const registerSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    parent_email: z
        .string()
        .optional()
        .or(z.literal(""))
        .refine((val) => !val || z.string().email().safeParse(val).success, {
            message: "Invalid parent email",
        }),
    confirm_password: z.string().min(8, "Confirm Password must be at least 8 characters"),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});

type RegisterForm = z.infer<typeof registerSchema>;

const getFriendlyAuthError = (errorCode: string): string => {
    switch (errorCode) {
        case "auth/email-already-in-use":
            return "An account with this email already exists. Try logging in instead.";
        case "auth/invalid-email":
            return "Invalid email address. Please check and try again.";
        case "auth/weak-password":
            return "Password is too weak. Please choose a stronger one.";
        case "auth/network-request-failed":
            return "Network error. Please check your connection.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        default:
            return "Something went wrong. Please try again.";
    }
};

function RegisterFormInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [usernameMessage, setUsernameMessage] = useState<string>('');
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // ── Referral code handling ──────────────────────────────────────────────
    const referralCode = searchParams.get('code');
    const [referralTutorName, setReferralTutorName] = useState<string | null>(null);
    const [checkingReferral, setCheckingReferral] = useState(!!referralCode);

    useEffect(() => {
        if (!referralCode) {
            setCheckingReferral(false);
            return;
        }
        fetch(`/api/referrals/validate-code?code=${encodeURIComponent(referralCode)}`)
            .then(res => res.json())
            .then(data => {
                if (data.valid) setReferralTutorName(data.tutorName);
            })
            .catch(err => console.error('Referral code validation failed:', err))
            .finally(() => setCheckingReferral(false));
    }, [referralCode]);

    const {
        register,
        handleSubmit,
        watch,
        formState: { isSubmitting, errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const username = watch('username');

    // Check username availability with debounce
    useEffect(() => {
        if (!username || username.length < 3) {
            setUsernameStatus("idle");
            setUsernameMessage("");
            return;
        }

        if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
        }

        checkTimeoutRef.current = setTimeout(async () => {
            setUsernameStatus("checking");

            try {
                const response = await fetch("/api/auth/check-username", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ username }),
                });

                const data = await response.json();

                if (data.available) {
                    setUsernameStatus("available");
                    setUsernameMessage(data.message);
                } else {
                    setUsernameStatus("taken");
                    setUsernameMessage(data.message);
                }
            } catch (err) {
                console.error("Error checking username:", err);
                setUsernameStatus("idle");
                setUsernameMessage("");
            }
        }, 500);

        return () => {
            if (checkTimeoutRef.current) {
                clearTimeout(checkTimeoutRef.current);
            }
        };
    }, [username]);


    const onSubmit = async (data: RegisterForm) => {
        if (data.email.toLowerCase() === data.parent_email.toLowerCase()) {
            setError("Parent's email must be different from your own email.");
            return;
        }
        if (usernameStatus === 'taken') {
            setError('Please choose a different username');
            return;
        }

        setError(null);
        try {
            const userCred = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );

            const user = await setDoc(doc(db, "users", userCred.user.uid), {
                username: data.username,
                username_lowercase: data.username.toLowerCase().trim(),
                parent_email: data.parent_email,
                name: data.name,
                email: data.email,
                userType: "student",
                createdAt: new Date(),
                tokens: 1000,
            });
            localStorage.setItem('User', JSON.stringify(user));

            const idToken = await userCred.user.getIdToken();

            // ✅ Attribute this signup to the referring tutor, if a valid
            // code was carried through the URL. Non-blocking.
            if (referralCode && referralTutorName) {
                try {
                    await fetch('/api/referrals/track-signup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                        body: JSON.stringify({ referralCode }),
                    });
                } catch (refErr) {
                    console.error('Referral tracking failed:', refErr);
                }
            }

            // ✅ Send the verification email via Brevo instead of Firebase's
            // built-in sendEmailVerification — same underlying Firebase
            // verification link, just delivered through your own sender
            // domain/templates instead of Firebase's default email service.
            try {
                const res = await fetch('/api/auth/send-verification-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) {
                    const err = await res.json();
                    console.error('Failed to send verification email:', err);
                    // Non-fatal for the signup flow itself — the account
                    // was created successfully. The /verify-email page
                    // should offer a "resend" option hitting this same
                    // endpoint in case this initial send failed.
                }
            } catch (verifyErr) {
                console.error('Verification email request failed:', verifyErr);
            }

            router.push('/verify-email');
        } catch (err: any) {
            setError(getFriendlyAuthError(err.code));
        }
    };

    const getUsernameIndicator = () => {
        if (usernameStatus === 'checking') {
            return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
        }
        if (usernameStatus === 'available') {
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
        if (usernameStatus === 'taken') {
            return <XCircle className="w-4 h-4 text-red-500" />;
        }
        return null;
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow">
                <h1 className="text-2xl font-medium mb-4">Register</h1>

                {/* Referral banner */}
                {referralCode && !checkingReferral && referralTutorName && (
                    <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 flex items-center gap-2">
                        <Gift className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        <p className="text-blue-800 text-sm">
                            You were referred by <strong>{referralTutorName}</strong> 🎉
                        </p>
                    </div>
                )}
                {referralCode && !checkingReferral && !referralTutorName && (
                    <div className="mb-4 p-3 rounded-md bg-amber-50 border border-amber-200">
                        <p className="text-amber-700 text-sm">
                            This referral link isn't valid, but you can still create your account below.
                        </p>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200">
                        <p className="text-red-600 text-sm">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <div className="relative">
                            <Input
                                type="text"
                                placeholder="Username"
                                {...register("username")}
                                className={`w-full bg-input-background pr-10 ${
                                    usernameStatus === 'taken' ? 'border-red-500' :
                                        usernameStatus === 'available' ? 'border-green-500' : ''
                                }`}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {getUsernameIndicator()}
                            </div>
                        </div>
                        {errors.username && (
                            <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
                        )}
                        {usernameMessage && (
                            <p className={`text-sm mt-1 ${
                                usernameStatus === 'available' ? 'text-green-600' : 'text-red-600'
                            }`}>
                                {usernameMessage}
                            </p>
                        )}
                    </div>

                    <div>
                        <Input
                            type="text"
                            placeholder="Name"
                            {...register("name")}
                            className="w-full bg-input-background"
                        />
                        {errors.name && (
                            <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
                        )}
                    </div>

                    <div>
                        <Input
                            type="email"
                            placeholder="Email"
                            {...register("email")}
                            className="w-full bg-input-background"
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.email?.message}</p>
                        )}
                    </div>

                    <div>
                        <Input
                            type="email"
                            placeholder="Parent's Email"
                            {...register("parent_email")}
                            className="w-full bg-input-background"
                        />
                        {errors.parent_email && (
                            <p className="text-red-500 text-sm mt-1">{errors.parent_email?.message}</p>
                        )}
                    </div>

                    <div>
                        <Input
                            type="password"
                            placeholder="Password"
                            {...register("password")}
                            className="w-full bg-input-background"
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
                        )}
                    </div>

                    <div>
                        <Input
                            type="password"
                            placeholder="Confirm Password"
                            {...register("confirm_password")}
                            className="w-full bg-input-background"
                        />
                        {errors.confirm_password && (
                            <p className="text-red-500 text-sm mt-1">{errors.confirm_password.message}</p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={isSubmitting || usernameStatus === 'taken' || usernameStatus === 'checking'}
                        className="w-full bg-primary text-primary-foreground cursor-pointer disabled:cursor-not-allowed hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Creating account..." : "Register"}
                    </Button>
                </form>

                <p className="mt-4 text-sm text-muted-foreground">
                    Already have an account?{' '}
                    <a href="/auth/login" className="text-primary underline">
                        Login
                    </a>
                </p>
            </div>
        </main>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <RegisterFormInner />
        </Suspense>
    );
}