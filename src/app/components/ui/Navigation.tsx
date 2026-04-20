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
        { label: 'Support', href: '/support' },
        { label: 'Plan', href: '/subscribe' }
    ];

    const handleNavigate = (href: string) => {
        setIsOpen(false);
        router.push(href);
    };

    const handleLogout = async () => {
        try {
            setUser(null);
            await signOut(auth);
            router.push("/");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const pathname = usePathname();

    const showNavigation = ["/auth/login", "/auth/register", '/onboarding', "/subjects", "/subscribe", "/support", "/"].includes(pathname);

    if (!showNavigation) return null;

    return (
        <nav className="top-0 z-[40] bg-white/90 backdrop-blur-md border-b pointer-events-auto relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                <div className="flex items-center justify-between h-20">
                    <button
                        onClick={() => handleNavigate('/')}
                        className="flex items-center gap-3 hover:opacity-80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary rounded-xl p-2 -ml-2"
                    >
                        <div className="w-50 h-50 rounded-xl flex items-center justify-center">
                            <img src="StudyCedo logo with name.png" alt="logo"/>
                        </div>
                    </button>

                    <div className="hidden md:flex items-center gap-2">
                        {navLinks.map((link) => (
                            <button
                                key={link.href}
                                onClick={() => handleNavigate(link.href)}
                                className={`px-4 py-2 text-sm hover:cursor-pointer font-medium transition-all duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-xl ${
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
                                className="text-text-muted hover:text-primary hover:cursor-pointer"
                            >
                                <User className="w-4 h-4 mr-2" />
                                Login
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => handleNavigate('/auth/register')}
                                className="bg-primary hover:bg-primary-dark ml-2 px-6 rounded-xl hover:cursor-pointer"
                            >
                                Get Started
                            </Button>
                        </div> :
                            <div className={"flex gap-3"}>
                                <Button className={"hover:cursor-pointer"} onClick={() => handleNavigate("/dashboard")} variant={"default"}>
                                    Dashboard
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleLogout}
                                    className="text-red-500 hover:text-red-600 hover:cursor-pointer"
                                >
                                    Logout
                                </Button>
                            </div>
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
                            <SheetContent
                                side="right"
                                className="w-80 z-[1000]"
                            >
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
                                        onClick={() => handleNavigate('/auth/login')}
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