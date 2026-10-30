'use client'
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Brand, PrimaryButton, TUTOR_DASHBOARD, TUTOR_LOGIN } from "./tutorShared";

// The sections on the landing page that the menu scrolls to (see the ids in page.tsx).
const NAV_LINKS = ["Features", "How it Works", "Subjects", "Pricing"];

// The landing page lives at /tutors. The same navigation also appears on the login and
// signup pages, where "#features" would point at nothing — so off the landing page the
// section links go to /tutors#features instead.
const LANDING_PATH = "/tutors";
const sectionHref = (label: string, onLanding: boolean) =>
    `${onLanding ? "" : LANDING_PATH}#${label.toLowerCase().replaceAll(" ", "-")}`;

// checking = we don't know yet; tutor = signed in AND has a tutor account; visitor = anyone else.
type Session = "checking" | "tutor" | "visitor";

// Is the person looking at this page a signed-in tutor? A signed-in STUDENT is not,
// so they still see the "Get Started as a Tutor" button (the signup page lets an
// existing account become a tutor).
function useTutorSession(): Session {
    const [session, setSession] = useState<Session>("checking");

    useEffect(() => {
        let latest = 0; // ignore a slow answer if the signed-in user changed meanwhile
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            const mine = ++latest;
            if (!user || user.isAnonymous) {
                setSession("visitor");
                return;
            }
            try {
                const idToken = await user.getIdToken();
                const res = await fetch("/api/tutors/profile", { headers: { Authorization: `Bearer ${idToken}` } });
                if (mine === latest) setSession(res.ok ? "tutor" : "visitor");
            } catch {
                if (mine === latest) setSession("visitor");
            }
        });
        // If sign-in state never reports back, don't leave the buttons hidden forever.
        const fallback = setTimeout(() => setSession((s) => (s === "checking" ? "visitor" : s)), 4000);
        return () => {
            clearTimeout(fallback);
            unsubscribe();
        };
    }, []);

    return session;
}

// Fixed top navigation for the tutor landing page. A client component because the
// mobile menu keeps open/closed state; the layout that renders it stays a server component.
export default function TutorNav() {
    const [menuOpen, setMenuOpen] = useState(false);
    const session = useTutorSession();
    const onLanding = usePathname() === LANDING_PATH;
    // Until we know who's here, keep the space but hide the buttons, so a signed-in
    // tutor never sees "Login" flash up and then change to "Logout".
    const hideUntilKnown = session === "checking" ? "invisible" : "";

    const handleLogout = async () => {
        setMenuOpen(false);
        try {
            await signOut(auth); // the auth listener above flips the buttons back
        } catch (err) {
            console.error("Logout failed:", err);
        }
    };

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
            <nav className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 sm:px-6">
                <Brand />
                <div className="hidden items-center gap-8 lg:flex">
                    {NAV_LINKS.map((label) => (
                        <Link key={label} href={sectionHref(label, onLanding)} className="text-sm font-semibold text-slate-600 transition hover:text-violet-700">{label}</Link>
                    ))}
                </div>
                <div className={`hidden items-center gap-3 lg:flex ${hideUntilKnown}`}>
                    {session === "tutor" ? (
                        <>
                            <Link href={TUTOR_DASHBOARD} className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">Dashboard</Link>
                            <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-full border-2 border-violet-200 bg-white px-5 py-2 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50">
                                <LogOut className="h-4 w-4" /> Logout
                            </button>
                        </>
                    ) : (
                        <>
                            <Link href={TUTOR_LOGIN} className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100">Login</Link>
                            <PrimaryButton className="px-5 py-2.5">Get Started as a Tutor</PrimaryButton>
                        </>
                    )}
                </div>
                <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-900 lg:hidden" aria-label="Toggle navigation">
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </nav>
            {menuOpen && (
                <div className="border-t border-slate-100 bg-white px-6 py-5 shadow-xl lg:hidden">
                    <div className="flex flex-col gap-4">
                        {NAV_LINKS.map((label) => <Link onClick={() => setMenuOpen(false)} key={label} href={sectionHref(label, onLanding)} className="font-semibold text-slate-700">{label}</Link>)}
                        <div className={`flex flex-col gap-4 ${hideUntilKnown}`}>
                            {session === "tutor" ? (
                                <>
                                    <Link href={TUTOR_DASHBOARD} onClick={() => setMenuOpen(false)} className="font-semibold text-slate-700">Dashboard</Link>
                                    <button onClick={handleLogout} className="inline-flex items-center gap-2 text-left font-semibold text-slate-700">
                                        <LogOut className="h-4 w-4" /> Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link href={TUTOR_LOGIN} onClick={() => setMenuOpen(false)} className="font-semibold text-slate-700">Login</Link>
                                    <PrimaryButton>Get Started as a Tutor</PrimaryButton>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
