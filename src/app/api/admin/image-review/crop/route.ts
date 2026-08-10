import { NextRequest, NextResponse } from "next/server";
import admin, { adminDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { IMAGE_SOURCES, isImageSource } from "@/lib/imageReview";

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB safety cap

export async function POST(req: NextRequest) {
    const adminUser = await requireAdmin(req);
    if (!adminUser) {
        console.warn("[image-review/crop] Unauthorized request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let sourceParam: string | undefined;
    let relativePath: string | undefined;
    let editedPath: string | undefined;
    let imageBase64: string | undefined;
    let contentType: string | undefined;
    let editType: string = "crop";

    try {
        const body = await req.json();
        sourceParam = body?.source;
        relativePath = body?.relativePath;
        editedPath = body?.editedPath;
        imageBase64 = body?.imageBase64;
        contentType = body?.contentType || "image/jpeg";
        if (body?.editType && typeof body.editType === "string") {
            editType = body.editType;
        }
    } catch {
        console.error("[image-review/crop] Failed to parse request body");
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    console.log("[image-review/crop] Request received", {
        sourceParam,
        relativePath,
        editedPath,
        contentType,
        base64Length: imageBase64?.length ?? 0,
    });

    if (!isImageSource(sourceParam)) {
        console.error("[image-review/crop] Missing/invalid source", { sourceParam });
        return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }
    if (!relativePath || typeof relativePath !== "string") {
        console.error("[image-review/crop] Missing relativePath");
        return NextResponse.json({ error: "relativePath is required" }, { status: 400 });
    }
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
        console.error("[image-review/crop] Rejected suspicious relativePath", { relativePath });
        return NextResponse.json({ error: "Invalid relativePath" }, { status: 400 });
    }
    if (!editedPath || typeof editedPath !== "string") {
        console.error("[image-review/crop] Missing editedPath", { relativePath });
        return NextResponse.json({ error: "editedPath is required" }, { status: 400 });
    }

    // Defense in depth: even though editedPath comes straight from the
    // client now (rather than being reconstructed server-side), confirm it
    // actually sits under the expected prefix for the given source before
    // writing to it.
    const { editedPrefix } = IMAGE_SOURCES[sourceParam];
    if (editedPath.includes("..") || !editedPath.startsWith(editedPrefix)) {
        console.error("[image-review/crop] editedPath outside expected prefix", {
            editedPath,
            editedPrefix,
            sourceParam,
        });
        return NextResponse.json({ error: "Invalid editedPath" }, { status: 400 });
    }

    if (!imageBase64 || typeof imageBase64 !== "string") {
        console.error("[image-review/crop] Missing imageBase64", { relativePath });
        return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(imageBase64, "base64");
        console.log("[image-review/crop] Decoded buffer", {
            editedPath,
            byteLength: buffer.length,
        });

        if (buffer.length === 0) {
            console.error("[image-review/crop] Empty image data after decode", { editedPath });
            return NextResponse.json({ error: "Empty image data" }, { status: 400 });
        }
        if (buffer.length > MAX_UPLOAD_BYTES) {
            console.error("[image-review/crop] Image exceeds size cap", {
                editedPath,
                byteLength: buffer.length,
                MAX_UPLOAD_BYTES,
            });
            return NextResponse.json({ error: "Image too large" }, { status: 413 });
        }

        const bucket = admin.storage().bucket();
        const editedFile = bucket.file(editedPath);
        console.log("[image-review/crop] Target file resolved", {
            bucket: bucket.name,
            editedPath,
        });

        // Preserve the existing download token so shared/cached links keep
        // working after the crop is saved.
        let existingToken: string | undefined;
        const [exists] = await editedFile.exists();
        console.log("[image-review/crop] Existing file check", { editedPath, exists });

        if (exists) {
            const [meta] = await editedFile.getMetadata();
            existingToken = (meta.metadata as Record<string, string> | undefined)
                ?.firebaseStorageDownloadTokens;
            console.log("[image-review/crop] Existing token found", {
                editedPath,
                hasToken: !!existingToken,
            });
        }

        await editedFile.save(buffer, {
            contentType,
            metadata: {
                cacheControl: "no-cache, max-age=0, must-revalidate",
                metadata: existingToken
                    ? { firebaseStorageDownloadTokens: existingToken }
                    : undefined,
            },
        });

        console.log("[image-review/crop] ✅ Saved cropped image to Storage", {
            bucket: bucket.name,
            editedPath,
            byteLength: buffer.length,
            contentType,
            preservedToken: !!existingToken,
        });

        const fileName = relativePath.split("/").pop() || relativePath;

        console.log("[image-review/crop] adminUser shape", adminUser);

        try {
            const logRef = await adminDb.collection("image_edits").add({
                type: editType,
                source: sourceParam,
                fileName,
                relativePath,
                editedPath,
                editedBy: (adminUser as any)?.uid ?? (adminUser as any)?.id ?? "unknown",
                editedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log("[image-review/crop] ✅ Logged edit to Firestore", {
                docId: logRef.id,
                editedPath,
            });
        } catch (logErr: any) {
            // The image is already saved at this point — a logging failure
            // shouldn't turn into a 500 for the user.
            console.error("[image-review/crop] ⚠️ Failed to log edit (image was still saved)", {
                editedPath,
                error: logErr?.message,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[image-review/crop] ❌ Crop save failed", {
            relativePath,
            editedPath,
            error: err?.message,
            stack: err?.stack,
        });
        return NextResponse.json({ error: "Crop save failed" }, { status: 500 });
    }
}