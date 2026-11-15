import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Support",
    description: "Ask StudyCedo's support assistant about plans, billing, your account or how to use the platform.",
    alternates: { canonical: "/support" },
};

export default function SupportLayout({ children }: { children: React.ReactNode }) {
    return children;
}
