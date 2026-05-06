'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {createUserWithEmailAndPassword, sendEmailVerification, signOut} from 'firebase/auth';
import {auth, db} from '@/lib/firebase';
import {useState, useEffect, useRef} from 'react';
import { useRouter } from 'next/navigation';
import {Input} from "@/app/components/ui/input";
import {Button} from "@/app/components/ui/button";
import {doc, setDoc} from "@firebase/firestore";
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

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

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
    const [usernameMessage, setUsernameMessage] = useState<string>('');
    const checkTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

            await sendEmailVerification(userCred.user);
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
                            <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                        )}
                    </div>

                    <div>
                        <Input
                            type="email"
                            placeholder="Parent's Email"
                            {...register("parent_email")}
                            className="w-full bg-input-background"
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.parent_email.message}</p>
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