'use client'
import {useEffect, useState} from 'react';
import { Button } from './button';
import { Sheet, SheetContent, SheetTrigger } from './sheet';
import { Menu, BookOpen, User } from 'lucide-react';
import {usePathname, useRouter} from "next/navigation";
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "@/lib/firebase";
import { signOut } from "firebase/auth";

interface NavigationProps {
    currentPage?: string;
}

export function Navigation({ currentPage }: NavigationProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);


    const navLinks = [
        { label: 'Free Planner', href: '/onboarding' },
        { label: 'Subjects', href: '/subjects' },
        { label: 'Pricing', href: '/pricing' }
    ];

    const handleNavigate = (href: string) => {
        setIsOpen(false);
        router.push(href);

    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            router.push("/");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };
    const pathname = usePathname();

    const showNavigation = ["/auth/login", "/auth/register", "/"].includes(pathname);

    if (!showNavigation) return null;

    return (
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                <div className="flex items-center justify-between h-20">
                    {/* Logo */}
                    <button
                        onClick={() => handleNavigate('/')}
                        className="flex items-center gap-3 hover:opacity-80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary rounded-xl p-2 -ml-2"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center">
                            <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-xl text-text-main hidden sm:block">GCSE AI Revision</span>
                    </button>

                    <div className="hidden md:flex items-center gap-2">
                        {navLinks.map((link) => (
                            <button
                                key={link.href}
                                onClick={() => handleNavigate(link.href)}
                                className={`px-4 py-2 text-sm font-medium transition-all duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-xl ${
                                    currentPage === link.href ? 'text-primary bg-primary/10' : 'text-text-muted hover:bg-bg-subtle'
                                }`}
                            >
                                {link.label}
                            </button>
                        ))}
                        <div className="w-px h-6 bg-border mx-2"></div>
                        { !user ?
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleNavigate('/auth/login')}
                                className="text-text-muted hover:text-primary"
                            >
                                <User className="w-4 h-4 mr-2" />
                                Login
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleNavigate('/auth/register')}
                                className="bg-primary hover:bg-primary-dark ml-2 px-6 rounded-xl"
                            >
                                Get Started
                            </Button>
                        </div> :
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-red-500 hover:text-red-600"
                            >
                                Logout
                            </Button>
                        }
                    </div>

                    <div className="md:hidden flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => handleNavigate('/onboarding')}
                            className="bg-primary hover:bg-primary-dark px-4 rounded-xl"
                        >
                            Get Started
                        </Button>
                        <Sheet open={isOpen} onOpenChange={setIsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="sm" className="p-2 ml-1">
                                    <Menu className="w-6 h-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-80">
                                <div className="flex flex-col gap-2 mt-8">
                                    {navLinks.map((link) => (
                                        <button
                                            key={link.href}
                                            onClick={() => handleNavigate(link.href)}
                                            className={`text-left text-lg font-medium transition-all duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-xl px-4 py-3 ${
                                                currentPage === link.href ? 'text-primary bg-primary/10' : 'text-text-main hover:bg-bg-subtle'
                                            }`}
                                        >
                                            {link.label}
                                        </button>
                                    ))}
                                    <div className="h-px bg-border my-4"></div>
                                    <Button
                                        onClick={() => handleNavigate('/account')}
                                        className="justify-start"
                                        variant="ghost"
                                    >
                                        <User className="w-4 h-4 mr-2" />
                                        Login
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>
                </div>
            </div>
        </nav>
    );
}