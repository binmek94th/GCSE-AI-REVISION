import Link from "next/link";
import { listImagePairsPage, DEFAULT_PAGE_SIZE } from "@/lib/imageReview";
import ImageReviewGrid from "./ImageReviewGrid";

// This route sits under app/admin/*, which is expected to already be
// protected by your existing admin auth (middleware/layout), matching the
// pattern used by app/admin/tutors/page.tsx. No client-side data fetching
// here — pairs are resolved server-side via the Admin SDK.
export const dynamic = "force-dynamic"; // storage listing should always be fresh

function buildHref(subfolder: string | undefined, page: number) {
    const params = new URLSearchParams();
    if (subfolder) params.set("subfolder", subfolder);
    params.set("page", String(page));
    return `/admin/image-review?${params.toString()}`;
}

export default async function ImageReviewPage({
                                                  searchParams,
                                              }: {
    searchParams: Promise<{ subfolder?: string; page?: string }>;
}) {
    const { subfolder, page: pageParam } = await searchParams;
    const requestedPage = pageParam ? parseInt(pageParam, 10) || 1 : 1;

    const { pairs, page, totalPages, totalMatched } = await listImagePairsPage(
        subfolder,
        requestedPage,
        DEFAULT_PAGE_SIZE
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold mb-1">Image Review</h1>
            <p className="text-sm text-muted-foreground mb-4">
                Comparing <code>study_materials/</code> against{" "}
                <code>backups/study_materials/</code>. Only files present in both
                locations are shown. {totalMatched} pair{totalMatched === 1 ? "" : "s"}
                {subfolder ? ` in "${subfolder}"` : ""} total &middot; page {page} of{" "}
                {totalPages}.
            </p>

            <ImageReviewGrid initialPairs={pairs} initialSubfolder={subfolder ?? ""} />

            <div className="flex items-center justify-between mt-8">
                {page > 1 ? (
                    <Link
                        href={buildHref(subfolder, page - 1)}
                        className="text-sm px-3 py-1.5 border rounded hover:bg-muted"
                    >
                        ← Previous
                    </Link>
                ) : (
                    <span />
                )}
                <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
                {page < totalPages ? (
                    <Link
                        href={buildHref(subfolder, page + 1)}
                        className="text-sm px-3 py-1.5 border rounded hover:bg-muted"
                    >
                        Next →
                    </Link>
                ) : (
                    <span />
                )}
            </div>
        </div>
    );
}