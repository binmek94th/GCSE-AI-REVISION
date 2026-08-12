import Link from "next/link";
import { listImagePairsPage, isImageSource, IMAGE_SOURCES, DEFAULT_PAGE_SIZE, type ImageSource } from "@/lib/imageReview";
import ImageReviewGrid from "./ImageReviewGrid";

// This route sits under app/admin/*, which is expected to already be
// protected by your existing admin auth (middleware/layout), matching the
// pattern used by app/admin/tutors/page.tsx. No client-side data fetching
// here — pairs are resolved server-side via the Admin SDK.
export const dynamic = "force-dynamic"; // storage listing should always be fresh

function buildHref(source: ImageSource, subfolder: string | undefined, page: number) {
    const params = new URLSearchParams();
    params.set("source", source);
    if (subfolder) params.set("subfolder", subfolder);
    params.set("page", String(page));
    return `/admin/image-review?${params.toString()}`;
}

export default async function ImageReviewPage({
                                                  searchParams,
                                              }: {
    searchParams: Promise<{ source?: string; subfolder?: string; page?: string }>;
}) {
    const { source: sourceParam, subfolder, page: pageParam } = await searchParams;
    const source: ImageSource = isImageSource(sourceParam) ? sourceParam : "gcse";
    const requestedPage = pageParam ? parseInt(pageParam, 10) || 1 : 1;

    const { pairs, page, totalPages, totalMatched } = await listImagePairsPage(
        source,
        subfolder,
        requestedPage,
        DEFAULT_PAGE_SIZE
    );

    const { editedPrefix, backupPrefix } = IMAGE_SOURCES[source];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-2xl font-semibold mb-1">Image Review</h1>

            <div className="flex gap-2 mb-4">
                {(Object.keys(IMAGE_SOURCES) as ImageSource[]).map((key) => (
                    <Link
                        key={key}
                        href={buildHref(key, undefined, 1)}
                        className={`text-sm px-3 py-1.5 rounded border ${
                            key === source
                                ? "bg-blue-600 text-white border-blue-600"
                                : "hover:bg-muted"
                        }`}
                    >
                        {IMAGE_SOURCES[key].label}
                    </Link>
                ))}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
                Comparing <code>{editedPrefix}</code> against{" "}
                <code>{backupPrefix}</code>. Only files present in both
                locations are shown. {totalMatched} pair{totalMatched === 1 ? "" : "s"}
                {subfolder ? ` in "${subfolder}"` : ""} total &middot; page {page} of{" "}
                {totalPages}.
            </p>

            {/*
              Pagination controls live inside ImageReviewGrid now rather than
              as plain <Link>s here. That lets Previous/Next share the same
              client-side transition (and loading indicator) as the keyboard
              arrow shortcuts and the subfolder filter, instead of being a
              separate full-page navigation with no visible feedback.
            */}
            <ImageReviewGrid
                initialPairs={pairs}
                initialSubfolder={subfolder ?? ""}
                source={source}
                page={page}
                totalPages={totalPages}
            />
        </div>
    );
}