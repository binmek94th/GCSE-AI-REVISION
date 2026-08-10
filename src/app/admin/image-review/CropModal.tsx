"use client";

import { useEffect, useRef, useState } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop, convertToPixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/app/components/ui/button";

function defaultCrop(width: number, height: number): Crop {
    return centerCrop(
        makeAspectCrop({ unit: "%", width: 90 }, width / height, width, height),
        width,
        height
    );
}

async function getCroppedBlob(
    image: HTMLImageElement,
    crop: Crop,
    mimeType: string
): Promise<Blob> {
    // ReactCrop gives us the crop in whatever unit it's tracked in (we use
    // "%"), relative to the *displayed* (CSS) image size. Convert that to
    // displayed pixels first, then scale up to the natural image resolution
    // — skipping the first step was cropping wildly wrong regions.
    const displayedPixelCrop = convertToPixelCrop(crop, image.width, image.height);

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelCrop = {
        x: displayedPixelCrop.x * scaleX,
        y: displayedPixelCrop.y * scaleY,
        width: displayedPixelCrop.width * scaleX,
        height: displayedPixelCrop.height * scaleY,
    };

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(pixelCrop.width));
    canvas.height = Math.max(1, Math.round(pixelCrop.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        canvas.width,
        canvas.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Canvas is empty"))),
            mimeType
        );
    });
}

function guessMimeType(fileName: string): string {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".png")) return "image/png";
    if (lower.endsWith(".webp")) return "image/webp";
    if (lower.endsWith(".gif")) return "image/gif";
    return "image/jpeg";
}

export default function CropModal({
                                      imageUrl,
                                      fileName,
                                      saving,
                                      onCancel,
                                      onSave,
                                  }: {
    imageUrl: string;
    fileName: string;
    saving: boolean;
    onCancel: () => void;
    onSave: (blob: Blob, mimeType: string) => void;
}) {
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [crop, setCrop] = useState<Crop>();
    const [error, setError] = useState<string | null>(null);

    // Route through the existing same-origin image proxy rather than loading
    // Firebase Storage's URL directly. Loading a cross-origin image with
    // crossOrigin="anonymous" silently taints the canvas if the CORS headers
    // aren't exactly right, and canvas.toBlob() then throws with no visible
    // error — which is what was happening here.
    const proxiedSrc = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;

    function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
        const { width, height } = e.currentTarget;
        setCrop(defaultCrop(width, height));
    }

    async function handleSave() {
        if (!imgRef.current || !crop || !crop.width || !crop.height) return;
        setError(null);
        try {
            const mimeType = guessMimeType(fileName);
            const blob = await getCroppedBlob(imgRef.current, crop, mimeType);
            onSave(blob, mimeType);
        } catch (err: any) {
            console.error("Crop failed", err);
            setError(
                err?.name === "SecurityError"
                    ? "Couldn't read the image for cropping (cross-origin restriction). Try reloading the page."
                    : err?.message || "Crop failed"
            );
        }
    }

    // Esc cancels, Enter saves (when not typing — there's no text input in
    // this modal, but this guards against future additions).
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
            } else if (e.key === "Enter") {
                e.preventDefault();
                handleSave();
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [crop, saving]);

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg p-4 max-w-3xl w-full max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium truncate">Crop — {fileName}</div>
                </div>

                <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        ref={imgRef}
                        src={proxiedSrc}
                        alt={fileName}
                        onLoad={handleImageLoad}
                        className="max-h-[65vh] w-auto"
                    />
                </ReactCrop>

                {error && <p className="text-sm text-destructive mt-2">{error}</p>}

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !crop?.width}>
                        {saving ? "Saving..." : "Save crop"}
                    </Button>
                </div>
            </div>
        </div>
    );
}