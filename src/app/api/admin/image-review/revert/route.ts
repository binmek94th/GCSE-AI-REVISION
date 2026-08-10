import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { BACKUP_PREFIX, EDITED_PREFIX } from "@/lib/imageReview";

export async function POST(req: NextRequest) {
    const adminUser = await requireAdmin(req);
    if (!adminUser)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let relativePath: string | undefined;
    try {
        const body = await req.json();
        relativePath = body?.relativePath;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!relativePath || typeof relativePath !== "string")
        return NextResponse.json({ error: "relativePath is required" }, { status: 400 });

    // Guard against path traversal / accidentally targeting files outside
    // the expected prefixes.
    if (relativePath.includes("..") || relativePath.startsWith("/"))
        return NextResponse.json({ error: "Invalid relativePath" }, { status: 400 });

    const editedPath = `${EDITED_PREFIX}${relativePath}`;
    const backupPath = `${BACKUP_PREFIX}${relativePath}`;

    try {
        const bucket = admin.storage().bucket();
        const backupFile = bucket.file(backupPath);
        const editedFile = bucket.file(editedPath);

        const [backupExists] = await backupFile.exists();
        if (!backupExists)
            return NextResponse.json({ error: "Backup file not found" }, { status: 404 });

        // Preserve the edited file's existing download token so any links
        // already shared/cached against it keep working after the overwrite.
        let existingToken: string | undefined;
        const [editedExists] = await editedFile.exists();
        if (editedExists) {
            const [editedMeta] = await editedFile.getMetadata();
            existingToken = (editedMeta.metadata as Record<string, string> | undefined)
                ?.firebaseStorageDownloadTokens;
        }

        await backupFile.copy(editedFile);

        await editedFile.setMetadata({
            cacheControl: "no-cache, max-age=0, must-revalidate",
            metadata: existingToken ? { firebaseStorageDownloadTokens: existingToken } : undefined,
        });

        const fileName = relativePath.split("/").pop() || relativePath;

        await adminDb.collection("image_reverts").add({
            fileName,
            relativePath,
            editedPath,
            backupPath,
            revertedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("Image revert failed", { relativePath, error: err?.message });
        return NextResponse.json({ error: "Revert failed" }, { status: 500 });
    }
}