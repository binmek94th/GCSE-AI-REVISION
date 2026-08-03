import admin from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

export const EDITED_PREFIX = "study_materials/";
export const BACKUP_PREFIX = "backups/study_materials/";
export const DEFAULT_PAGE_SIZE = 24;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
const CONCURRENCY = 12;

export interface ImagePair {
    relativePath: string; // path relative to the prefix, shared by both sides
    fileName: string;
    editedPath: string; // full storage path e.g. study_materials/foo/bar.jpg
    backupPath: string; // full storage path e.g. backups/study_materials/foo/bar.jpg
    editedUrl: string;
    backupUrl: string;
}

interface MatchedFile {
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
 * Lists and matches files under EDITED_PREFIX / BACKUP_PREFIX by identical
 * relative subfolder path + filename. This only calls bucket.getFiles()
 * (cheap, no per-file network calls) — it does NOT resolve download URLs,
 * so it's safe to call for the full tree even when it's large.
 */
async function listMatchedFiles(subfolderFilter?: string): Promise<MatchedFile[]> {
    const bucket = admin.storage().bucket();

    const editedPrefix = subfolderFilter
        ? `${EDITED_PREFIX}${subfolderFilter}`
        : EDITED_PREFIX;
    const backupPrefix = subfolderFilter
        ? `${BACKUP_PREFIX}${subfolderFilter}`
        : BACKUP_PREFIX;

    const [editedFiles] = await bucket.getFiles({ prefix: editedPrefix });
    const [backupFiles] = await bucket.getFiles({ prefix: backupPrefix });

    const backupByRelPath = new Map<string, any>();
    for (const f of backupFiles) {
        if (!isImageFile(f.name)) continue;
        const rel = f.name.slice(BACKUP_PREFIX.length);
        if (rel) backupByRelPath.set(rel, f);
    }

    const matched: MatchedFile[] = [];
    for (const editedFile of editedFiles) {
        if (!isImageFile(editedFile.name)) continue;
        const rel = editedFile.name.slice(EDITED_PREFIX.length);
        if (!rel) continue;
        const backupFile = backupByRelPath.get(rel);
        if (!backupFile) continue; // no matching backup, skip (fail-open, no error)
        matched.push({ rel, editedFile, backupFile });
    }

    matched.sort((a, b) => a.rel.localeCompare(b.rel));
    return matched;
}

async function resolvePairs(items: MatchedFile[]): Promise<ImagePair[]> {
    const bucket = admin.storage().bucket();
    const bucketName = bucket.name;

    const pairs: ImagePair[] = new Array(items.length);
    let cursor = 0;

    async function worker() {
        while (cursor < items.length) {
            const idx = cursor++;
            const { rel, editedFile, backupFile } = items[idx];
            try {
                const [editedUrl, backupUrl] = await Promise.all([
                    getOrCreateDownloadUrl(bucketName, editedFile),
                    getOrCreateDownloadUrl(bucketName, backupFile),
                ]);
                pairs[idx] = {
                    relativePath: rel,
                    fileName: rel.split("/").pop() || rel,
                    editedPath: editedFile.name,
                    backupPath: backupFile.name,
                    editedUrl,
                    backupUrl,
                };
            } catch {
                // Leave a hole for files we fail to read metadata/URLs for, filtered
                // out below, rather than failing the whole page.
                pairs[idx] = undefined as any;
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));

    return pairs.filter(Boolean);
}

export interface ImagePairPage {
    pairs: ImagePair[];
    page: number;
    pageSize: number;
    totalMatched: number;
    totalPages: number;
}

/**
 * Paginated version: matches the full tree cheaply, then only resolves
 * download URLs (the expensive part — one Storage round-trip per file) for
 * the requested page.
 */
export async function listImagePairsPage(
    subfolderFilter: string | undefined,
    page: number,
    pageSize: number = DEFAULT_PAGE_SIZE
): Promise<ImagePairPage> {
    const safePage = Math.max(1, page);
    const matched = await listMatchedFiles(subfolderFilter);
    const totalMatched = matched.length;
    const totalPages = Math.max(1, Math.ceil(totalMatched / pageSize));
    const clampedPage = Math.min(safePage, totalPages);

    const start = (clampedPage - 1) * pageSize;
    const pageItems = matched.slice(start, start + pageSize);
    const pairs = await resolvePairs(pageItems);

    return {
        pairs,
        page: clampedPage,
        pageSize,
        totalMatched,
        totalPages,
    };
}