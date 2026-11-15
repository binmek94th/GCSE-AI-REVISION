import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Note: private pages (dashboard, admin, checkout...) are NOT blocked here on purpose.
// They are kept out of search results by the X-Robots-Tag header set in middleware.ts, and a
// page blocked in robots.txt can't be crawled, so Google would never see that header.
export default function robots(): MetadataRoute.Robots {
    // Only the real production domain should be crawled; previews/localhost stay hidden.
    const isProduction = SITE_URL.startsWith("https://") && !SITE_URL.includes("localhost");
    if (!isProduction) {
        return { rules: { userAgent: "*", disallow: "/" } };
    }
    return {
        rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
        sitemap: `${SITE_URL}/sitemap.xml`,
        host: SITE_URL,
    };
}
