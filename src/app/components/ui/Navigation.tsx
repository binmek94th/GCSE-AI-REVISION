'use client'
import {useEffect, useState} from 'react';
import { Button } from './button';
import { Sheet, SheetContent, SheetTrigger } from './sheet';
import { Menu, User } from 'lucide-react';
import {usePathname, useRouter} from "next/navigation";
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "@/lib/firebase";
import { signOut } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";

interface NavigationProps {
    currentPage?: string;
}

export function Navigation({ currentPage }: NavigationProps) {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            // Anonymous sessions (free-assessment guests) aren't a real,
            // logged-in account — treat them the same as signed-out here so
            // the nav shows Login/Get Started instead of Dashboard/Logout.
            setUser(currentUser && !currentUser.isAnonymous ? currentUser : null);
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

    const showNavigation = ["/auth/login", "/auth/register", "/oauth-callback/login", "/oauth-callback/register", '/onboarding', "/subjects", "/subscribe", "/support", "/"].includes(pathname);

    if (!showNavigation) return null;

    return (
        <nav className="sticky top-0 z-[40] bg-white/90 backdrop-blur-md border-b pointer-events-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                <div className="flex items-center justify-between h-15">
                    <Link href={"/"}>
                        <Image
                            width={120}
                            height={26}
                            src="/StudyCedoLogo.png"
                            alt="StudyCedo"
                        />
                    </Link>

                    <div className="hidden md:flex items-center gap-2">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 text-sm hover:cursor-pointer font-medium transition-all duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-xl ${
                                    currentPage === link.href ? 'text-primary bg-primary/10' : 'text-text-muted hover:bg-bg-subtle'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="w-px h-6 bg-border mx-2"></div>
                        { !user ?
                            <div>
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="sm"
                                    className="text-text-muted hover:text-primary hover:cursor-pointer"
                                >
                                    <Link href="/auth/login">
                                        <User className="w-4 h-4 mr-2" />
                                        Login
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className="bg-primary hover:bg-primary-dark ml-2 px-6 rounded-xl hover:cursor-pointer"
                                >
                                    <Link href="/auth/register">Get Started</Link>
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
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`text-left text-lg font-medium transition-all duration-200 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-xl px-4 py-3 ${
                                                currentPage === link.href ? 'text-primary bg-primary/10' : 'text-text-main hover:bg-bg-subtle'
                                            }`}
                                        >
                                            {link.label}
                                        </Link>
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