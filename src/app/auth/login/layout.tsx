import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Log in",
    description: "Log in to StudyCedo to continue your GCSE and A-Level revision plan.",
    alternates: { canonical: "/auth/login" },
    robots: { index: false, follow: true },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
    return children;
}
