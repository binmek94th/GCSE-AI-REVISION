import { listImagePairs, LIST_LIMIT } from "@/lib/imageReview";
import ImageReviewGrid from "./ImageReviewGrid";

// This route sits under app/admin/*, which is expected to already be
// protected by your existing admin auth (middleware/layout), matching the
// pattern used by app/admin/tutors/page.tsx. No client-side data fetching
// here — pairs are resolved server-side via the Admin SDK.
export const dynamic = "force-dynamic"; // storage listing should always be fresh

export default async function ImageReviewPage({
                                                  searchParams,
                                              }: {
    searchParams: Promise<{ subfolder?: string }>;
}) {
    const { subfolder } = await searchParams;
    const pairs = await listImagePairs(subfolder);

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold mb-1">Image Review</h1>
            <p className="text-sm text-muted-foreground mb-6">
                Comparing <code>study_materials/</code> against{" "}
                <code>backups/study_materials/</code>. Only files present in both
                locations are shown ({pairs.length} pair{pairs.length === 1 ? "" : "s"}
                {subfolder ? ` in "${subfolder}"` : ""}).
            </p>
            {pairs.length >= LIST_LIMIT && (
                <p className="text-sm text-amber-600 mb-4">
                    Showing the first {LIST_LIMIT} pairs. Narrow down using the subfolder
                    filter below to see more.
                </p>
            )}
            <ImageReviewGrid initialPairs={pairs} initialSubfolder={subfolder ?? ""} />
        </div>
    );
}