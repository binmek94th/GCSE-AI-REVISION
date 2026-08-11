"use client";

import { useEffect } from "react";
import { Button } from "@/app/components/ui/button";

interface Preview {
    imageBase64: string;
    contentType: string;
}

interface DescriptionPreset {
    id: string;
    label: string;
    description: string;
}

// Common recurring watermark variants seen on study material images. "Keep
// visual, not intent-based" applies here too — describe what's there, not
// what to do about it, to avoid tripping Gemini's content filters.
const PRESETS: DescriptionPreset[] = [
    {
        id: "symbol",
        label: "Symbol / logo",
        description:
            "a large, low-opacity circular graphic with a lightning-bolt shape inside it, centered on the image",
    },
    {
        id: "text-save-my-exam",
        label: "Text: \u201cSave My Exam\u201d",
        description:
            "the words \u201cSave My Exam\u201d displayed as a semi-transparent, diagonally angled text watermark repeated across the image",
    },
];

export default function WatermarkModal({
                                           originalUrl,
                                           fileName,
                                           preview,
                                           loading,
                                           saving,
                                           error,
                                           description,
                                           onDescriptionChange,
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
    description: string;
    onDescriptionChange: (value: string) => void;
    onRegenerate: () => void;
    onKeep: () => void;
    onCancel: () => void;
}) {
    const previewSrc = preview
        ? `data:${preview.contentType};base64,${preview.imageBase64}`
        : null;

    const activePresetId = PRESETS.find((p) => p.description === description)?.id;

    function applyPreset(preset: DescriptionPreset) {
        onDescriptionChange(preset.description);
    }

    useEffect(() => {
        function isTypingTarget(target: EventTarget | null): boolean {
            const el = target as HTMLElement | null;
            return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
        }

        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") {
                e.preventDefault();
                onCancel();
                return;
            }
            if (isTypingTarget(e.target)) return; // let typing in the description field through
            if (e.key === "Enter" && preview && !loading && !saving) {
                e.preventDefault();
                onKeep();
            } else if (e.key.toLowerCase() === "g" && !loading && !saving) {
                e.preventDefault();
                onRegenerate();
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [preview, loading, saving]);

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg p-4 max-w-4xl w-full max-h-[90vh] overflow-auto">
                <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-medium truncate">
                        Remove watermark — {fileName}
                    </div>
                </div>

                <div className="mb-3">
                    <label className="block text-xs font-medium mb-1">Quick presets</label>
                    <div className="flex flex-wrap gap-2">
                        {PRESETS.map((preset) => (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                                    activePresetId === preset.id
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "hover:bg-muted"
                                }`}
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mb-3">
                    <label className="block text-xs font-medium mb-1">
                        Describe what to remove (position, shape, appearance)
                    </label>
                    <input
                        className="border rounded px-3 py-1.5 text-sm w-full"
                        placeholder="e.g. a large, faint circular logo with a lightning bolt inside it, centered"
                        value={description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Being specific about what&#39;s visually there (not why) gets much
                        better and more reliable results. Pick a preset above as a starting
                        point, then tweak wording (position, size, opacity) if this image
                        differs.
                    </p>
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