"use client";

import { Button } from "@/app/components/ui/button";

interface Preview {
    imageBase64: string;
    contentType: string;
}

export default function WatermarkModal({
                                           originalUrl,
                                           fileName,
                                           preview,
                                           loading,
                                           saving,
                                           error,
                                           onRegenerate,
                                           onKeep,
                                           onCancel,
                                       }: {
    originalUrl: string; // proxied URL of the current edited image
    fileName: string;
    preview: Preview | null;
    loading: boolean; // generating a preview via Gemini
    saving: boolean; // persisting the "Keep" choice
    error: string | null;
    onRegenerate: () => void;
    onKeep: () => void;
    onCancel: () => void;
}) {
    const previewSrc = preview
        ? `data:${preview.contentType};base64,${preview.imageBase64}`
        : null;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg p-4 max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium truncate">
                        Remove watermark — {fileName}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">Current</div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={originalUrl}
                            alt={`${fileName} current`}
                            className="w-full h-72 object-contain bg-muted rounded"
                        />
                    </div>
                    <div>
                        <div className="text-xs text-muted-foreground mb-1">
                            Watermark removed (preview)
                        </div>
                        <div className="w-full h-72 bg-muted rounded flex items-center justify-center">
                            {loading && (
                                <span className="text-sm text-muted-foreground">
                  Generating with Gemini...
                </span>
                            )}
                            {!loading && previewSrc && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={previewSrc}
                                    alt={`${fileName} watermark removed`}
                                    className="w-full h-72 object-contain"
                                />
                            )}
                            {!loading && !previewSrc && !error && (
                                <span className="text-sm text-muted-foreground">No preview yet</span>
                            )}
                        </div>
                    </div>
                </div>

                {error && <p className="text-sm text-destructive mt-3">{error}</p>}

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={onCancel} disabled={saving}>
                        Cancel
                    </Button>
                    <Button
                        variant="outline"
                        onClick={onRegenerate}
                        disabled={loading || saving}
                    >
                        {loading ? "Generating..." : "Regenerate"}
                    </Button>
                    <Button onClick={onKeep} disabled={loading || saving || !preview}>
                        {saving ? "Saving..." : "Keep this version"}
                    </Button>
                </div>
            </div>
        </div>
    );
}