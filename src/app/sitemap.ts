import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Public, indexable pages only. Add new marketing pages here.
const PAGES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
    { path: "/", priority: 1, changeFrequency: "weekly" },
    { path: "/subjects", priority: 0.9, changeFrequency: "weekly" },
    { path: "/subscribe", priority: 0.8, changeFrequency: "monthly" },
    { path: "/tutors", priority: 0.8, changeFrequency: "monthly" },
    { path: "/auth/register", priority: 0.6, changeFrequency: "yearly" },
    { path: "/tutors/signup", priority: 0.5, changeFrequency: "yearly" },
    { path: "/support", priority: 0.5, changeFrequency: "yearly" },
    { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
    { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
    { path: "/cookies", priority: 0.2, changeFrequency: "yearly" },
    { path: "/notice", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
    return PAGES.map(({ path, priority, changeFrequency }) => ({
        url: `${SITE_URL}${path === "/" ? "" : path}`,
        changeFrequency,
        priority,
    }));
}
