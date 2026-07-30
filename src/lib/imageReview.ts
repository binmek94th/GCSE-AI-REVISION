import admin from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

export const EDITED_PREFIX = "study_materials/";
export const BACKUP_PREFIX = "backups/study_materials/";
export const LIST_LIMIT = 150;

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif"];

export interface ImagePair {
    relativePath: string; // path relative to the prefix, shared by both sides
    fileName: string;
    editedPath: string; // full storage path e.g. study_materials/foo/bar.jpg
    backupPath: string; // full storage path e.g. backups/study_materials/foo/bar.jpg
    editedUrl: string;
    backupUrl: string;
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
 * Lists all image files under EDITED_PREFIX and BACKUP_PREFIX, matches them
 * by identical relative subfolder path + filename, and returns only pairs
 * that exist on both sides (fail-open: unmatched files are simply omitted,
 * never hidden with an error).
 */
export async function listImagePairs(subfolderFilter?: string): Promise<ImagePair[]> {
    const bucket = admin.storage().bucket();
    const bucketName = bucket.name;

    const editedPrefix = subfolderFilter
        ? `${EDITED_PREFIX}${subfolderFilter}`
        : EDITED_PREFIX;
    const backupPrefix = subfolderFilter
        ? `${BACKUP_PREFIX}${subfolderFilter}`
        : BACKUP_PREFIX;

    const [editedFiles] = await bucket.getFiles({ prefix: editedPrefix });
    const [backupFiles] = await bucket.getFiles({ prefix: backupPrefix });

    const backupByRelPath = new Map<string, (typeof backupFiles)[number]>();
    for (const f of backupFiles) {
        if (!isImageFile(f.name)) continue;
        const rel = f.name.slice(BACKUP_PREFIX.length);
        if (rel) backupByRelPath.set(rel, f);
    }

    // Build the list of matched (edited, backup) file objects first — this
    // part is free, no network calls.
    const matched: { rel: string; editedFile: (typeof editedFiles)[number]; backupFile: (typeof backupFiles)[number] }[] = [];
    for (const editedFile of editedFiles) {
        if (!isImageFile(editedFile.name)) continue;
        const rel = editedFile.name.slice(EDITED_PREFIX.length);
        if (!rel) continue;
        const backupFile = backupByRelPath.get(rel);
        if (!backupFile) continue; // no matching backup, skip (fail-open, no error)
        matched.push({ rel, editedFile, backupFile });
    }

    // Cap how many pairs we resolve URLs for on a single page load. Without a
    // subfolder filter, a large study_materials tree can otherwise mean
    // thousands of sequential getMetadata/setMetadata round-trips, which is
    // what was causing the page to hang indefinitely.
    const MAX_PAIRS = LIST_LIMIT;
    const limited = matched.slice(0, MAX_PAIRS);

    // Resolve download URLs concurrently, but capped, so we don't fire
    // hundreds of simultaneous requests at Storage either.
    const CONCURRENCY = 12;
    const pairs: ImagePair[] = [];
    let cursor = 0;

    async function worker() {
        while (cursor < limited.length) {
            const idx = cursor++;
            const { rel, editedFile, backupFile } = limited[idx];
            try {
                const [editedUrl, backupUrl] = await Promise.all([
                    getOrCreateDownloadUrl(bucketName, editedFile as any),
                    getOrCreateDownloadUrl(bucketName, backupFile as any),
                ]);
                pairs.push({
                    relativePath: rel,
                    fileName: rel.split("/").pop() || rel,
                    editedPath: editedFile.name,
                    backupPath: backupFile.name,
                    editedUrl,
                    backupUrl,
                });
            } catch {
                // Skip files we fail to read metadata/URLs for rather than failing
                // the whole listing.
            }
        }
    }

    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, limited.length) }, worker));

    return pairs.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}