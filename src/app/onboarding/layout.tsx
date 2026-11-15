import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Free GCSE & A-Level Study Planner",
    description: "Tell us your subjects, exam board and exam date and StudyCedo builds you a free personalised revision plan in minutes.",
    alternates: { canonical: "/onboarding" },
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    return children;
}
