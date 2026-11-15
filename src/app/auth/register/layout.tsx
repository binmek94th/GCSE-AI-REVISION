import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Create a free account",
    description: "Sign up to StudyCedo for free and get a personalised GCSE or A-Level study plan, quizzes and AI tutor support.",
    alternates: { canonical: "/auth/register" },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
    return children;
}
