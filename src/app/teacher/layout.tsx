'use client';

import {usePathname, useRouter} from 'next/navigation';
import Link from 'next/link';
import {signOut} from "firebase/auth";
import {auth} from "@/lib/firebase";
import {Button} from "@/app/components/ui/button";

export default function DashboardLayout({
                                            children,
                                        }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter()

    const navItems = [
        { label: 'Study Materials', href: '/teacher/study-materials' },
        { label: 'Questions', href: '/teacher/questions' },
    ];

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("auth/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <div>
            <div className="min-h-screen bg-gray-50">
                {/* Navigation */}
                <nav className="bg-white border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-6 flex justify-between">
                        <div className="flex items-center h-14 gap-6">
                            {navItems.map(item => {
                                const isActive = pathname.startsWith(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`text-sm font-medium transition-colors ${
                                            isActive
                                                ? 'text-blue-600 border-b-2 border-blue-600 pb-3'
                                                : 'text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </div>
                        <div className={'py-3'}>
                            <Button onClick={handleLogout}>Logout</Button>
                        </div>
                    </div>
                </nav>

                <main className="max-w-7xl mx-auto px-6 py-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
