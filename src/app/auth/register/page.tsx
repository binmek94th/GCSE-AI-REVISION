'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    createUserWithEmailAndPassword,
    linkWithCredential,
    EmailAuthProvider,
    GoogleAuthProvider,
    signInWithPopup,
    linkWithPopup,
    signInWithCredential,
    onAuthStateChanged,
    type User,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { doc, getDoc, setDoc } from "@firebase/firestore";
import { CheckCircle, XCircle, Loader2, Gift } from 'lucide-react';
import GoogleIcon from '@/app/components/GoogleIcon';
import { normalizeAuthErrorCode } from '@/lib/authErrors';

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

// A Google sign-in only gives us a name + verified email — no username or
// parent email, and no password to set. This is the small form shown after
// Google auth succeeds, to collect the rest of what a `users/{uid}` doc needs.
const googleCompleteSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    parent_email: z
        .string()
        .optional()
        .or(z.literal(""))
        .refine((val) => !val || z.string().email().safeParse(val).success, {
            message: "Invalid parent email",
        }),
});

type GoogleCompleteForm = z.infer<typeof googleCompleteSchema>;

// `hadGuestSession`: they took the free assessment first, so their result is
// saved under a guest session and logging in will bring it over. Only mention
// that when it's actually true.
const getFriendlyAuthError = (errorCode: string, hadGuestSession = false): string => {
    switch (errorCode) {
        case "auth/email-already-in-use":
        case "auth/credential-already-in-use":
            return hadGuestSession
                ? "An account with this email already exists. We've saved your assessment result — log in to bring it over."
                : "An account with this email already exists. Please log in instead.";
        case "auth/account-exists-with-different-credential":
            return "An account already exists with this email using a different sign-in method. Try logging in with your password instead.";
        case "auth/invalid-email":
            return "Invalid email address. Please check and try again.";
        case "auth/weak-password":
            return "Password is too weak. Please choose a stronger one.";
        case "auth/network-request-failed":
            return "Network error. Please check your connection.";
        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";
        case "auth/popup-blocked":
            return "Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.";
        case "auth/user-disabled":
            return "This account has been disabled. Please contact support.";
        case "auth/unauthorized-domain":
            return "This website isn't authorised for Google sign-in yet. Please contact support.";
        case "auth/operation-not-allowed":
            return "This sign-in method isn't enabled right now. Please contact support.";
        default:
            return "Something went wrong. Please try again.";
    }
};

// Shared by both the normal signup form and the "finish your profile after
// Google" form — same debounced call to /api/auth/check-username either way.
function useUsernameAvailability(username: string | undefined) {
    const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [message, setMessage] = useState('');
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!username || username.length < 3) {
            setStatus('idle');
            setMessage('');
            return;
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            setStatus('checking');
            try {
                const response = await fetch('/api/auth/check-username', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username }),
                });
                const data = await response.json();
                setStatus(data.available ? 'available' : 'taken');
                setMessage(data.message);
            } catch (err) {
                console.error('Error checking username:', err);
                setStatus('idle');
                setMessage('');
            }
        }, 500);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [username]);

    return { status, message };
}

function RegisterFormInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [googleLoading, setGoogleLoading] = useState(false);

    // Set once Google auth succeeds for a brand-new account — switches the
    // page into "finish your profile" mode instead of the normal form.
    const [pendingGoogleUser, setPendingGoogleUser] = useState<User | null>(null);
    const [googleSubmitting, setGoogleSubmitting] = useState(false);

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

    // If someone lands here already signed in with Google (e.g. the login
    // page redirected them here because they don't have a profile doc yet),
    // pick that up and go straight into "finish your profile" mode.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user || user.isAnonymous) return;
            try {
                const snap = await getDoc(doc(db, "users", user.uid));
                if (!snap.exists()) setPendingGoogleUser(user);
            } catch (err) {
                console.error("Error checking existing profile:", err);
            }
        });
        return unsubscribe;
    }, []);

    const {
        register,
        handleSubmit,
        watch,
        formState: { isSubmitting, errors },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const username = watch('username');
    const { status: usernameStatus, message: usernameMessage } = useUsernameAvailability(username);

    const {
        register: registerGoogle,
        handleSubmit: handleGoogleSubmit,
        watch: watchGoogle,
        formState: { errors: googleErrors },
    } = useForm<GoogleCompleteForm>({
        resolver: zodResolver(googleCompleteSchema),
    });
    const googleUsername = watchGoogle('username');
    const { status: googleUsernameStatus, message: googleUsernameMessage } = useUsernameAvailability(googleUsername);

    // ── Referral attribution — shared by both the password path and the
    // Google-completion path below ──────────────────────────────────────────
    //
    // This used to ALSO send the verification email and wait for it (Admin
    // lookup + a few Firestore calls + a Brevo API call) before moving on.
    // /verify-email already sends a code by itself the first time it loads,
    // so that was a slow duplicate — and the page's own send then got
    // rejected by the 60s resend cooldown, which left it showing the
    // "code not sent" state. The verify page is now the only sender.
    const trackReferral = async (idToken: string) => {
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
    };

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
        let hadGuestSession = false;
        try {
            // If they took the free assessment first, they're already signed
            // in anonymously. Linking that same uid to this email/password
            // (instead of creating a brand-new account) keeps every bit of
            // onboarding/quiz data already saved under it — no merge needed.
            const anonymousUser = auth.currentUser?.isAnonymous ? auth.currentUser : null;
            hadGuestSession = !!anonymousUser;
            let userCred;
            try {
                userCred = anonymousUser
                    ? await linkWithCredential(
                        anonymousUser,
                        EmailAuthProvider.credential(data.email, data.password)
                    )
                    : await createUserWithEmailAndPassword(auth, data.email, data.password);
            } catch (linkErr: any) {
                const linkErrCode = normalizeAuthErrorCode(linkErr);
                if (
                    anonymousUser &&
                    (linkErrCode === "auth/email-already-in-use" || linkErrCode === "auth/credential-already-in-use")
                ) {
                    // A real account already exists with this email — we can't
                    // attach the guest session to it here. Remember the guest
                    // uid so the login page can merge its data in once they
                    // sign in to that existing account.
                    try {
                        localStorage.setItem('pendingMergeGuestUid', anonymousUser.uid);
                    } catch {
                        // localStorage unavailable — merge simply won't happen; non-fatal
                    }
                }
                throw linkErr;
            }

            // merge: true — an anonymous guest session already has onboarding
            // fields (level, subjects, quizPlan, email, …) saved under this
            // uid; a plain overwrite would wipe them out.
            await setDoc(doc(db, "users", userCred.user.uid), {
                username: data.username,
                username_lowercase: data.username.toLowerCase().trim(),
                parent_email: data.parent_email,
                name: data.name,
                email: data.email,
                userType: "student",
                createdAt: new Date(),
                tokens: 1000,
                accountType: "permanent",
            }, { merge: true });
            localStorage.setItem('User', JSON.stringify({ uid: userCred.user.uid, email: data.email }));

            const idToken = await userCred.user.getIdToken();
            await trackReferral(idToken);

            router.push('/verify-email');
        } catch (err: any) {
            console.error('Registration failed:', err);
            setError(getFriendlyAuthError(normalizeAuthErrorCode(err), hadGuestSession));
        }
    };

    // ── Continue with Google ────────────────────────────────────────────────
    const handleGoogleContinue = async () => {
        setError(null);
        setGoogleLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const anonymousUser = auth.currentUser?.isAnonymous ? auth.currentUser : null;

            let userCred;
            try {
                userCred = anonymousUser
                    ? await linkWithPopup(anonymousUser, provider)
                    : await signInWithPopup(auth, provider);
            } catch (linkErr: any) {
                const code = normalizeAuthErrorCode(linkErr);

                if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
                    setGoogleLoading(false);
                    return; // they just closed the popup — not an error worth showing
                }

                if (anonymousUser && code === "auth/credential-already-in-use") {
                    // This Google account already has a real Firebase account.
                    // Firebase hands back the credential in the error itself,
                    // so we can sign straight into that existing account
                    // instead of asking them to start over — then bring the
                    // guest's assessment data across immediately.
                    const existingCredential = GoogleAuthProvider.credentialFromError(linkErr);
                    if (!existingCredential) throw linkErr;

                    const guestUid = anonymousUser.uid;
                    userCred = await signInWithCredential(auth, existingCredential);

                    try {
                        const idToken = await userCred.user.getIdToken();
                        await fetch('/api/onboarding/merge-anonymous', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                            body: JSON.stringify({ guestUid }),
                        });
                    } catch (mergeErr) {
                        console.error('Guest data merge failed:', mergeErr);
                    }
                } else {
                    throw linkErr;
                }
            }

            const snap = await getDoc(doc(db, "users", userCred.user.uid));
            if (snap.exists()) {
                const data = snap.data();
                router.push(data?.onboardingComplete ? '/dashboard' : '/onboarding');
                return;
            }

            // Brand new account — still need a username (and optionally a
            // parent email) before we can create their profile doc.
            setPendingGoogleUser(userCred.user);
        } catch (err: any) {
            console.error('Google sign-in failed:', err);
            setError(getFriendlyAuthError(normalizeAuthErrorCode(err)));
        } finally {
            setGoogleLoading(false);
        }
    };

    const onSubmitGoogleProfile = async (data: GoogleCompleteForm) => {
        if (!pendingGoogleUser) return;
        if (googleUsernameStatus === 'taken') {
            setError('Please choose a different username');
            return;
        }
        const email = pendingGoogleUser.email ?? '';
        if (data.parent_email && email.toLowerCase() === data.parent_email.toLowerCase()) {
            setError("Parent's email must be different from your own email.");
            return;
        }

        setError(null);
        setGoogleSubmitting(true);
        try {
            await setDoc(doc(db, "users", pendingGoogleUser.uid), {
                username: data.username,
                username_lowercase: data.username.toLowerCase().trim(),
                parent_email: data.parent_email,
                name: pendingGoogleUser.displayName || '',
                email,
                userType: "student",
                createdAt: new Date(),
                tokens: 1000,
                accountType: "permanent",
            }, { merge: true });
            localStorage.setItem('User', JSON.stringify({ uid: pendingGoogleUser.uid, email }));

            const idToken = await pendingGoogleUser.getIdToken();
            await trackReferral(idToken);

            router.push('/onboarding');
        } catch (err: any) {
            console.error('Error finishing Google signup:', err);
            setError('Something went wrong saving your details. Please try again.');
        } finally {
            setGoogleSubmitting(false);
        }
    };

    const usernameIndicator = (status: typeof usernameStatus) => {
        if (status === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
        if (status === 'available') return <CheckCircle className="w-4 h-4 text-green-500" />;
        if (status === 'taken') return <XCircle className="w-4 h-4 text-red-500" />;
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

                {pendingGoogleUser ? (
                    /* ── Finish profile after Google sign-in ── */
                    <>
                        <div className="mb-4 p-3 rounded-md bg-blue-50 border border-blue-200 flex items-center gap-3">
                            <GoogleIcon className="w-5 h-5 flex-shrink-0" />
                            <p className="text-blue-800 text-sm">
                                Signed in as <strong>{pendingGoogleUser.email}</strong>. Just need a couple more details.
                            </p>
                        </div>

                        <form onSubmit={handleGoogleSubmit(onSubmitGoogleProfile)} className="space-y-4">
                            <div>
                                <div className="relative">
                                    <Input
                                        type="text"
                                        placeholder="Username"
                                        {...registerGoogle("username")}
                                        className={`w-full bg-input-background pr-10 ${
                                            googleUsernameStatus === 'taken' ? 'border-red-500' :
                                                googleUsernameStatus === 'available' ? 'border-green-500' : ''
                                        }`}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        {usernameIndicator(googleUsernameStatus)}
                                    </div>
                                </div>
                                {googleErrors.username && (
                                    <p className="text-red-500 text-sm mt-1">{googleErrors.username.message}</p>
                                )}
                                {googleUsernameMessage && (
                                    <p className={`text-sm mt-1 ${
                                        googleUsernameStatus === 'available' ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        {googleUsernameMessage}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Input
                                    type="email"
                                    placeholder="Parent's Email (optional)"
                                    {...registerGoogle("parent_email")}
                                    className="w-full bg-input-background"
                                />
                                {googleErrors.parent_email && (
                                    <p className="text-red-500 text-sm mt-1">{googleErrors.parent_email?.message}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                disabled={googleSubmitting || googleUsernameStatus === 'taken' || googleUsernameStatus === 'checking'}
                                className="w-full bg-primary text-primary-foreground cursor-pointer disabled:cursor-not-allowed hover:bg-primary-dark disabled:opacity-50"
                            >
                                {googleSubmitting ? "Finishing up..." : "Complete registration"}
                            </Button>
                        </form>
                    </>
                ) : (
                    /* ── Normal signup ── */
                    <>
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
                                        {usernameIndicator(usernameStatus)}
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

                        <div className="flex items-center gap-3 my-4">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs text-muted-foreground">or</span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <Button
                            type="button"
                            onClick={handleGoogleContinue}
                            disabled={googleLoading}
                            className="w-full flex items-center justify-center gap-2 bg-white text-gray-700 border border-border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {googleLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <GoogleIcon className="w-4 h-4" />
                            )}
                            Continue with Google
                        </Button>
                    </>
                )}

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
