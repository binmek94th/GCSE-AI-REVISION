import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create a free tutor account",
    description: "Sign up as a GCSE or A-Level tutor on StudyCedo, invite your students and track their progress for free.",
    alternates: { canonical: "/tutors/signup" },
};

export default function TutorSignupLayout({ children }: { children: React.ReactNode }) {
    return children;
}
