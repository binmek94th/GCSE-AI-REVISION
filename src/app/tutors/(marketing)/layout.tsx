import TutorNav from "./TutorNav";

// Layout for the tutor landing page AND the tutor login / signup pages — the public
// pages that share the top navigation.
//
// "(marketing)" is a route group: it doesn't appear in the URL (the pages are still
// /tutors, /tutors/login and /tutors/signup) but it means this layout wraps ONLY those —
// the tutor dashboard, profile and verify-email pages next to it are untouched.
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
