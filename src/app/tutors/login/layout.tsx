import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tutor log in",
    description: "Log in to your StudyCedo tutor dashboard.",
    alternates: { canonical: "/tutors/login" },
    robots: { index: false, follow: true },
};

export default function TutorLoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
