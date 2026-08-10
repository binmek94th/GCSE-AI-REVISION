import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { IMAGE_SOURCES, isImageSource } from "@/lib/imageReview";

export async function POST(req: NextRequest) {
    const adminUser = await requireAdmin(req);
    if (!adminUser)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let sourceParam: string | undefined;
    let relativePath: string | undefined;
    let editedPath: string | undefined;
    let backupPath: string | undefined;
    try {
        const body = await req.json();
        sourceParam = body?.source;
        relativePath = body?.relativePath;
        editedPath = body?.editedPath;
        backupPath = body?.backupPath;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!isImageSource(sourceParam))
        return NextResponse.json({ error: "Invalid source" }, { status: 400 });

    if (!relativePath || typeof relativePath !== "string")
        return NextResponse.json({ error: "relativePath is required" }, { status: 400 });

    // Guard against path traversal / accidentally targeting files outside
    // the expected prefixes.
    if (relativePath.includes("..") || relativePath.startsWith("/"))
        return NextResponse.json({ error: "Invalid relativePath" }, { status: 400 });

    if (!editedPath || typeof editedPath !== "string")
        return NextResponse.json({ error: "editedPath is required" }, { status: 400 });
    if (!backupPath || typeof backupPath !== "string")
        return NextResponse.json({ error: "backupPath is required" }, { status: 400 });

    // Defense in depth: confirm both paths actually sit under the expected
    // prefixes for the given source before touching them.
    const { editedPrefix, backupPrefix } = IMAGE_SOURCES[sourceParam];
    if (
        editedPath.includes("..") ||
        backupPath.includes("..") ||
        !editedPath.startsWith(editedPrefix) ||
        !backupPath.startsWith(backupPrefix)
    ) {
        console.error("[image-review/revert] path outside expected prefixes", {
            editedPath,
            backupPath,
            editedPrefix,
            backupPrefix,
            sourceParam,
        });
        return NextResponse.json({ error: "Invalid editedPath/backupPath" }, { status: 400 });
    }

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
            source: sourceParam,
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