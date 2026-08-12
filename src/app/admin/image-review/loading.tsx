import { Loader2 } from "lucide-react";

// Shown automatically by Next.js while app/admin/image-review/page.tsx (and
// its Storage listing) is loading. In normal use, page turns go through
// ImageReviewGrid's own client-side transition + in-place overlay instead —
// this is the fallback for anything that triggers a fresh server render
// directly, such as opening a page link outside the client transition.
export default function ImageReviewLoading() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="h-7 w-40 bg-muted rounded animate-pulse mb-4" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-12 justify-center">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading images…
            </div>
        </div>
    );
}