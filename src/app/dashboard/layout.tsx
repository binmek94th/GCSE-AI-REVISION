'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { DashboardProvider } from '@/contexts/DashboardContext';
import Spinner from "@/app/components/ui/Spinner";

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (user) => {
            console.log(user);
            if (!user) {
                router.replace('/auth/login');
                return;
            }

            if (!user.emailVerified) {
                router.replace('/verify-email');
                return;
            }

            setLoading(false);
        });

        return () => unsub();
    }, [router]);

    if (loading) {
        return (
            <Spinner></Spinner>
        );
    }

    return (
        <DashboardProvider>
            {children}
        </DashboardProvider>
    );
}
