import admin from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

// Each "source" is an independent (edited prefix, backup prefix) pair under
// Firebase Storage. Add new entries here to review additional buckets/folders
// without touching the pagination or resolution logic below.
export const IMAGE_SOURCES = {
    gcse: {
        label: "GCSE",
        editedPrefix: "study_materials/",
        backupPrefix: "backups/study_materials/",
    },
    alevel: {
        label: "A-Level",
        editedPrefix: "alevel_study_materials/",
        backupPrefix: "backups/alevel_study_materials/",
    },
} as const;

export type ImageSource = keyof typeof IMAGE_SOURCES;

export function isImageSource(value: string | undefined): value is ImageSource {
    return !!value && value in IMAGE_SOURCES;
}

// Kept for any other existing callers of the legacy, non-paginated function
// (defaults to the original GCSE prefixes so existing behavior is unchanged).
export const EDITED_PREFIX = IMAGE_SOURCES.gcse.editedPrefix;
export const BACKUP_PREFIX = IMAGE_SOURCES.gcse.backupPrefix;

// LIST_LIMIT only bounds the legacy, non-paginated listImagePairs() below.
// listImagePairsPage() never truncates the matched set — it only resolves
// download URLs for the current page's slice, so it's cheap regardless of
// how many total pairs exist.
export const LIST_LIMIT = 150;
export const DEFAULT_PAGE_SIZE = 24;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export interface ImagePair {
    relativePath: string; // path relative to the prefix, shared by both sides
    fileName: string;
    editedPath: string; // full storage path e.g. study_materials/foo/bar.jpg
    backupPath: string; // full storage path e.g. backups/study_materials/foo/bar.jpg
    editedUrl: string;
    backupUrl: string;
}

export interface PaginatedImagePairs {
    pairs: ImagePair[];
    page: number;
    pageSize: number;
    totalMatched: number;
    totalPages: number;
}

interface MatchedEntry {
    rel: string;
    editedFile: any;
    backupFile: any;
}

function isImageFile(name: string): boolean {
    const lower = name.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Reads (or creates, if missing) a firebaseStorageDownloadTokens value on a
 * file's metadata and returns a permanent download URL. Matches the pattern
 * used elsewhere in the app for UBLA-enabled buckets.
 */
export async function getOrCreateDownloadUrl(
    bucketName: string,
    file: { getMetadata: () => Promise<any>; setMetadata: (m: any) => Promise<any>; name: string }
): Promise<string> {
    const [metadata] = await file.getMetadata();
    let token = (metadata.metadata as Record<string, string> | undefined)
        ?.firebaseStorageDownloadTokens;

    if (!token) {
        token = randomUUID();
        await file.setMetadata({
            metadata: { firebaseStorageDownloadTokens: token },
        });
    } else if (token.includes(",")) {
        // If multiple tokens exist, just use the first — any valid token works.
        token = token.split(",")[0];
    }

    return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
        file.name
    )}?alt=media&token=${token}`;
}

/**
 * Lists all image files under the given source's edited/backup prefixes and
 * matches them by identical relative subfolder path + filename. Does NOT
 * resolve download URLs — that's the expensive part (a getMetadata, and
 * sometimes a setMetadata, round-trip per file) and callers should only pay
 * it for the slice of pairs they're actually about to show. Fail-open:
 * unmatched files are simply omitted, never hidden behind an error. Sorted
 * up front so pagination is stable across page loads.
 */
async function getMatchedFileEntries(
    source: ImageSource,
    subfolderFilter?: string
): Promise<{ bucketName: string; matched: MatchedEntry[] }> {
    const { editedPrefix: basEditedPrefix, backupPrefix: baseBackupPrefix } = IMAGE_SOURCES[source];

    const bucket = admin.storage().bucket();
    const bucketName = bucket.name;

    const editedPrefix = subfolderFilter
        ? `${basEditedPrefix}${subfolderFilter}`
        : basEditedPrefix;
    const backupPrefix = subfolderFilter
        ? `${baseBackupPrefix}${subfolderFilter}`
        : baseBackupPrefix;

    const [editedFiles] = await bucket.getFiles({ prefix: editedPrefix });
    const [backupFiles] = await bucket.getFiles({ prefix: backupPrefix });

    const backupByRelPath = new Map<string, (typeof backupFiles)[number]>();
    for (const f of backupFiles) {
        if (!isImageFile(f.name)) continue;
        const rel = f.name.slice(baseBackupPrefix.length);
        if (rel) backupByRelPath.set(rel, f);
    }

    const matched: MatchedEntry[] = [];
    for (const editedFile of editedFiles) {
        if (!isImageFile(editedFile.name)) continue;
        const rel = editedFile.name.slice(basEditedPrefix.length);
        if (!rel) continue;
        const backupFile = backupByRelPath.get(rel);
        if (!backupFile) continue; // no matching backup, skip (fail-open, no error)
        matched.push({ rel, editedFile, backupFile });
    }

    matched.sort((a, b) => a.rel.localeCompare(b.rel));

    return { bucketName, matched };
}

/**
 * Resolves download URLs for a set of matched entries, concurrently but
 * capped, so we don't fire dozens of simultaneous requests at Storage.
 */
async function resolvePairs(bucketName: string, entries: MatchedEntry[]): Promise<ImagePair[]> {
    const CONCURRENCY = 12;
    const pairs: ImagePair[] = [];
    let cursor = 0;

    async function worker() {
        while (cursor < entries.length) {
            const idx = cursor++;
            const { rel, editedFile, backupFile } = entries[idx];
            try {
                const [editedUrl, backupUrl] = await Promise.all([
                    getOrCreateDownloadUrl(bucketName, editedFile),
                    getOrCreateDownloadUrl(bucketName, backupFile),
                ]);
                pairs.push({
                    relativePath: rel,
                    fileName: rel.split("/").pop() || rel,
                    editedPath: editedFile.name,
                    backupPath: backupFile.name,
                    editedUrl,
                    backupUrl,
                });
            } catch (err) {
                // Skip files we fail to read metadata/URLs for rather than
                // failing the whole page.
                if (process.env.NODE_ENV !== "production") {
                    console.error(`[imageReview] failed to resolve pair "${rel}":`, err);
                }
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, entries.length) }, worker));
    return pairs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

/**
 * Legacy, non-paginated entry point (GCSE source only, for backwards
 * compatibility with any other existing callers). Resolves URLs for up to
 * LIST_LIMIT pairs. Prefer listImagePairsPage for the admin UI.
 */
export async function listImagePairs(subfolderFilter?: string): Promise<ImagePair[]> {
    const { bucketName, matched } = await getMatchedFileEntries("gcse", subfolderFilter);
    const limited = matched.slice(0, LIST_LIMIT);
    return resolvePairs(bucketName, limited);
}

/**
 * Paginated entry point used by the admin image-review page. Builds the
 * FULL matched set for the given source to compute accurate totals, then
 * only resolves download URLs for the requested page's slice — so page 1
 * and page 54 cost the same, and no page comes back empty just because it's
 * past some global cap.
 */
export async function listImagePairsPage(
    source: ImageSource,
    subfolderFilter: string | undefined,
    requestedPage: number,
    pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedImagePairs> {
    const { bucketName, matched } = await getMatchedFileEntries(source, subfolderFilter);

    const totalMatched = matched.length;
    const totalPages = Math.max(1, Math.ceil(totalMatched / pageSize));
    const page = Math.min(Math.max(1, requestedPage || 1), totalPages);

    const start = (page - 1) * pageSize;
    const pageEntries = matched.slice(start, start + pageSize);

    const pairs = await resolvePairs(bucketName, pageEntries);

    return { pairs, page, pageSize, totalMatched, totalPages };
}