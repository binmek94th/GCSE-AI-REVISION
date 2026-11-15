import { NextResponse, type NextRequest } from "next/server";

// Tells search engines not to index signed-in / admin / checkout pages.
// (robots.txt only stops crawling; this header is what keeps a URL out of search results.)
// Most of these pages are client components, which cannot export `metadata`, so a header is the clean way.
export function middleware(_req: NextRequest) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
}

// Next.js needs this list written out literally (it can't be built from a variable).
export const config = {
    matcher: [
        "/admin/:path*",
        "/dashboard/:path*",
        "/teacher/:path*",
        "/classroom/:path*",
        "/purchase/:path*",
        "/study_packs/:path*",
        "/subscribe/checkout/:path*",
        "/verify-email/:path*",
        "/auth/action/:path*",
        "/tutors/dashboard/:path*",
        "/tutors/verify-email/:path*",
    ],
};
