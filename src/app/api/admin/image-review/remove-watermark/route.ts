import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { IMAGE_SOURCES, isImageSource } from "@/lib/imageReview";
import { removeWatermark } from "@/lib/geminiWatermark";

function guessMimeType(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    return "image/jpeg";
}

export async function POST(req: NextRequest) {
    const adminUser = await requireAdmin(req);
    if (!adminUser) {
        console.warn("[image-review/remove-watermark] Unauthorized request");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let sourceParam: string | undefined;
    let relativePath: string | undefined;
    let editedPath: string | undefined;
    let elementDescription: string | undefined;
    try {
        const body = await req.json();
        sourceParam = body?.source;
        relativePath = body?.relativePath;
        editedPath = body?.editedPath;
        elementDescription = body?.elementDescription;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!isImageSource(sourceParam)) {
        return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }
    if (!relativePath || typeof relativePath !== "string") {
        return NextResponse.json({ error: "relativePath is required" }, { status: 400 });
    }
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
        return NextResponse.json({ error: "Invalid relativePath" }, { status: 400 });
    }
    if (!editedPath || typeof editedPath !== "string") {
        return NextResponse.json({ error: "editedPath is required" }, { status: 400 });
    }

    // Defense in depth: confirm editedPath actually sits under the expected
    // prefix for the given source before reading from it.
    const { editedPrefix } = IMAGE_SOURCES[sourceParam];
    if (editedPath.includes("..") || !editedPath.startsWith(editedPrefix)) {
        console.error("[image-review/remove-watermark] editedPath outside expected prefix", {
            editedPath,
            editedPrefix,
            sourceParam,
        });
        return NextResponse.json({ error: "Invalid editedPath" }, { status: 400 });
    }

    try {
        const bucket = admin.storage().bucket();
        const editedFile = bucket.file(editedPath);

        const [exists] = await editedFile.exists();
        if (!exists) {
            console.error("[image-review/remove-watermark] Source file not found", { editedPath });
            return NextResponse.json({ error: "Source image not found" }, { status: 404 });
        }

        console.log("[image-review/remove-watermark] Downloading source image", { editedPath });
        const [sourceBuffer] = await editedFile.download();
        const [meta] = await editedFile.getMetadata();
        const sourceMimeType = meta.contentType || guessMimeType(relativePath);

        console.log("[image-review/remove-watermark] Calling Gemini", {
            editedPath,
            sourceBytes: sourceBuffer.length,
            sourceMimeType,
        });

        const result = await removeWatermark(sourceBuffer, sourceMimeType, elementDescription);

        console.log("[image-review/remove-watermark] ✅ Gemini returned edited image", {
            editedPath,
            resultBytes: result.buffer.length,
            resultMimeType: result.mimeType,
        });

        return NextResponse.json({
            imageBase64: result.buffer.toString("base64"),
            contentType: result.mimeType,
        });
    } catch (err: any) {
        console.error("[image-review/remove-watermark] ❌ Failed", {
            relativePath,
            editedPath,
            error: err?.message,
        });
        return NextResponse.json(
            { error: err?.message || "Watermark removal failed" },
            { status: 500 }
        );
    }
}
