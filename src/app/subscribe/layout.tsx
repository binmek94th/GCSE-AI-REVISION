import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing – StudyCedo Pro",
    description: "StudyCedo Pro gives full access to AI study plans, notes, quizzes, mock exams and the AI tutor. Monthly or annual plans for GCSE and A-Level students.",
    alternates: { canonical: "/subscribe" },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
    return children;
}
