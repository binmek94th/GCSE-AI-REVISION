import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";
import { EDITED_PREFIX } from "@/lib/imageReview";
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

    let relativePath: string | undefined;
    try {
        const body = await req.json();
        relativePath = body?.relativePath;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!relativePath || typeof relativePath !== "string") {
        return NextResponse.json({ error: "relativePath is required" }, { status: 400 });
    }
    if (relativePath.includes("..") || relativePath.startsWith("/")) {
        return NextResponse.json({ error: "Invalid relativePath" }, { status: 400 });
    }

    const editedPath = `${EDITED_PREFIX}${relativePath}`;

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

        const result = await removeWatermark(sourceBuffer, sourceMimeType);

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