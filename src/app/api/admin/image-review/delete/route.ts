import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { IMAGE_SOURCES, isImageSource } from "@/lib/imageReview";

export async function POST(req: NextRequest) {
    const adminUser = await requireAdmin(req);
    if (!adminUser) {
        console.warn("[image-review/delete] Unauthorized request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    if (relativePath.includes("..") || relativePath.startsWith("/"))
        return NextResponse.json({ error: "Invalid relativePath" }, { status: 400 });

    if (!editedPath || typeof editedPath !== "string")
        return NextResponse.json({ error: "editedPath is required" }, { status: 400 });
    if (!backupPath || typeof backupPath !== "string")
        return NextResponse.json({ error: "backupPath is required" }, { status: 400 });

    // Defense in depth: confirm both paths actually sit under the expected
    // prefixes for the given source before deleting anything.
    const { editedPrefix, backupPrefix } = IMAGE_SOURCES[sourceParam];
    if (
        editedPath.includes("..") ||
        backupPath.includes("..") ||
        !editedPath.startsWith(editedPrefix) ||
        !backupPath.startsWith(backupPrefix)
    ) {
        console.error("[image-review/delete] path outside expected prefixes", {
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
        const editedFile = bucket.file(editedPath);
        const backupFile = bucket.file(backupPath);

        const [editedExisted] = await editedFile.exists();
        const [backupExisted] = await backupFile.exists();

        if (!editedExisted && !backupExisted) {
            console.warn("[image-review/delete] Neither file exists, nothing to delete", {
                editedPath,
                backupPath,
            });
            return NextResponse.json({ error: "Files not found" }, { status: 404 });
        }

        // ignoreNotFound so a partial prior failure (e.g. only one side
        // deleted last time) doesn't block cleaning up the rest.
        await Promise.all([
            editedFile.delete({ ignoreNotFound: true }),
            backupFile.delete({ ignoreNotFound: true }),
        ]);

        console.log("[image-review/delete] ✅ Deleted pair from Storage", {
            editedPath,
            backupPath,
            editedExisted,
            backupExisted,
        });

        const fileName = relativePath.split("/").pop() || relativePath;

        try {
            await adminDb.collection("image_deletes").add({
                source: sourceParam,
                fileName,
                relativePath,
                editedPath,
                backupPath,
                deletedBy: (adminUser as any)?.uid ?? (adminUser as any)?.id ?? "unknown",
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (logErr: any) {
            // Files are already gone at this point — a logging failure
            // shouldn't turn into a 500 for the user.
            console.error("[image-review/delete] ⚠️ Failed to log delete (files were still removed)", {
                editedPath,
                backupPath,
                error: logErr?.message,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[image-review/delete] ❌ Delete failed", {
            relativePath,
            editedPath,
            backupPath,
            error: err?.message,
        });
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}