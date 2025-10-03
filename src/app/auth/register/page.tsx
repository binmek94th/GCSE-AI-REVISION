'use client';

import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {createUserWithEmailAndPassword, sendEmailVerification} from 'firebase/auth';
import {auth, db} from '@/lib/firebase';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {Input} from "@/app/components/input";
import {Button} from "@/app/components/button";
import {doc, setDoc} from "@firebase/firestore";
import {SelectValue,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,} from "@/app/components/select";

const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(8, "Confirm Password must be at least 8 characters"),
    userType: z.enum(["student", "teacher", "parent"]),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { isSubmitting },
    } = useForm<RegisterForm>({
        resolver: zodResolver(registerSchema),
    });

    const onSubmit = async (data: RegisterForm) => {
        setError(null);
        try {
            const userCred = await createUserWithEmailAndPassword(
                auth,
                data.email,
                data.password
            );

            await setDoc(doc(db, "users", userCred.user.uid), {
                name: data.name,
                email: data.email,
                userType: data.userType,
                createdAt: new Date(),
                tokens: 1000,
            });
            await sendEmailVerification(userCred.user);
            router.push('/verify-email');
        } catch (err: any) {
            setError(err.message);
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow">
                <h1 className="text-2xl font-medium mb-4">Register</h1>

                {error && <p className="text-destructive mb-2">{error}</p>}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Name"
                        {...register("name")}
                        className="w-full bg-input-background"
                    />

                    <Input
                        type="email"
                        placeholder="Email"
                        {...register("email")}
                        className="w-full bg-input-background"
                    />

                    <Input
                        type="password"
                        placeholder="Password"
                        {...register("password")}
                        className="w-full bg-input-background"
                    />
                    <Input
                        type="password"
                        placeholder="Confirm Password"
                        {...register("confirm_password")}
                        className="w-full bg-input-background"
                    />
                    <Select onValueChange={(val) => setValue("userType", val as "student" | "parent" | "teacher")}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                        </SelectContent>
                    </Select>



                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
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
