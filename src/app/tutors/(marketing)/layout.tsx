import type { Metadata } from "next";
import TutorNav from "./TutorNav";

export const metadata: Metadata = {
    title: "AI Tutoring Tools for GCSE & A-Level Tutors",
    description:
        "Assign targeted work, track student progress in real time and see where students struggle before your next session. Free for GCSE and A-Level tutors.",
    alternates: { canonical: "/tutors" },
    openGraph: {
        url: "/tutors",
        title: "StudyCedo for Tutors – AI insights for your tutoring sessions",
        description: "Assign work, track progress and spot struggling students early. Free for GCSE and A-Level tutors.",
    },
};

// Layout for the tutor landing page only.
//
// "(marketing)" is a route group: it doesn't appear in the URL (the page is still
// /tutors) but it means this layout wraps ONLY the landing page — the tutor
// dashboard, login, signup and verify-email pages next to it are untouched.
//
// Stays a server component (so a `metadata` export can be added here for SEO);
// the interactive menu is the client component TutorNav.
export default function TutorMarketingLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div id="top" className="min-h-screen overflow-hidden bg-background font-sans text-foreground selection:bg-violet-200 selection:text-violet-950">
            <TutorNav />
            {children}
        </div>
    );
}
