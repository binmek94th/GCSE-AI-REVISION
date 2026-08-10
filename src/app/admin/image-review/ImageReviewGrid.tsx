"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getAuth } from "firebase/auth";
import { firebase } from "@/lib/firebase"; // adjust to your existing client init path
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import CropModal from "./CropModal";
import WatermarkModal from "./WatermarkModal";

interface ImagePair {
    relativePath: string;
    fileName: string;
    editedPath: string;
    backupPath: string;
    editedUrl: string;
    backupUrl: string;
}

interface WatermarkPreview {
    imageBase64: string;
    contentType: string;
}

type ActionState = "idle" | "working" | "done" | "error";

async function blobToBase64(blob: Blob): Promise<string> {
    const buf = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

function proxied(url: string): string {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}

export default function ImageReviewGrid({
                                            initialPairs,
                                            initialSubfolder,
                                        }: {
    initialPairs: ImagePair[];
    initialSubfolder: string;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState("");
    const [subfolderInput, setSubfolderInput] = useState(initialSubfolder);
    const [revertState, setRevertState] = useState<Record<string, ActionState>>({});
    const [cropState, setCropState] = useState<Record<string, ActionState>>({});
    const [cropTarget, setCropTarget] = useState<ImagePair | null>(null);
    const [cacheBust, setCacheBust] = useState<Record<string, number>>({});
    const [isPending, startTransition] = useTransition();

    // Watermark removal review state
    const [watermarkTarget, setWatermarkTarget] = useState<ImagePair | null>(null);
    const [watermarkPreview, setWatermarkPreview] = useState<WatermarkPreview | null>(null);
    const [watermarkLoading, setWatermarkLoading] = useState(false);
    const [watermarkSaving, setWatermarkSaving] = useState(false);
    const [watermarkError, setWatermarkError] = useState<string | null>(null);
    const [watermarkState, setWatermarkState] = useState<Record<string, ActionState>>({});
    const [watermarkDescription, setWatermarkDescription] = useState(
        "a large, low-opacity circular graphic with a lightning-bolt shape inside it, centered on the image"
    );

    // Keyboard-navigation state: which card is focused (J/K or arrows to move,
    // R/C/W to act on it).
    const [focusedIndex, setFocusedIndex] = useState(0);
    const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
    const [showShortcutHelp, setShowShortcutHelp] = useState(false);

    const filteredPairs = useMemo(() => {
        if (!search.trim()) return initialPairs;
        const q = search.toLowerCase();
        return initialPairs.filter((p) => p.relativePath.toLowerCase().includes(q));
    }, [initialPairs, search]);

    function applySubfolderFilter() {
        const params = new URLSearchParams(searchParams.toString());
        if (subfolderInput.trim()) {
            params.set("subfolder", subfolderInput.trim());
        } else {
            params.delete("subfolder");
        }
        params.set("page", "1"); // reset pagination whenever the filter changes
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }

    async function getIdToken(): Promise<string> {
        const user = getAuth(firebase).currentUser;
        if (!user) throw new Error("Not signed in");
        return user.getIdToken();
    }

    async function handleRevert(pair: ImagePair) {
        setRevertState((s) => ({ ...s, [pair.relativePath]: "working" }));
        try {
            const idToken = await getIdToken();
            const res = await fetch("/api/admin/image-review/revert", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ relativePath: pair.relativePath }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            setRevertState((s) => ({ ...s, [pair.relativePath]: "done" }));
            setCacheBust((c) => ({ ...c, [pair.relativePath]: Date.now() }));
            toast.success(`Reverted ${pair.fileName}`);
        } catch (err: any) {
            setRevertState((s) => ({ ...s, [pair.relativePath]: "error" }));
            toast.error(err?.message || "Revert failed");
        }
    }

    async function handleCropSave(pair: ImagePair, blob: Blob, mimeType: string) {
        setCropState((s) => ({ ...s, [pair.relativePath]: "working" }));
        try {
            const idToken = await getIdToken();
            const imageBase64 = await blobToBase64(blob);
            const res = await fetch("/api/admin/image-review/crop", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    relativePath: pair.relativePath,
                    imageBase64,
                    contentType: mimeType,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            setCropState((s) => ({ ...s, [pair.relativePath]: "done" }));
            setCacheBust((c) => ({ ...c, [pair.relativePath]: Date.now() }));
            setCropTarget(null);
            toast.success(`Saved crop for ${pair.fileName}`);
        } catch (err: any) {
            setCropState((s) => ({ ...s, [pair.relativePath]: "error" }));
            toast.error(err?.message || "Crop save failed");
        }
    }

    async function requestWatermarkPreview(pair: ImagePair) {
        setWatermarkLoading(true);
        setWatermarkError(null);
        try {
            const idToken = await getIdToken();
            const res = await fetch("/api/admin/image-review/remove-watermark", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    relativePath: pair.relativePath,
                    elementDescription: watermarkDescription,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            const data = await res.json();
            setWatermarkPreview({ imageBase64: data.imageBase64, contentType: data.contentType });
        } catch (err: any) {
            setWatermarkError(err?.message || "Watermark removal failed");
        } finally {
            setWatermarkLoading(false);
        }
    }

    function openWatermarkModal(pair: ImagePair) {
        setWatermarkTarget(pair);
        setWatermarkPreview(null);
        setWatermarkError(null);
        requestWatermarkPreview(pair);
    }

    async function handleWatermarkKeep() {
        if (!watermarkTarget || !watermarkPreview) return;
        setWatermarkSaving(true);
        try {
            const idToken = await getIdToken();
            const res = await fetch("/api/admin/image-review/crop", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    relativePath: watermarkTarget.relativePath,
                    imageBase64: watermarkPreview.imageBase64,
                    contentType: watermarkPreview.contentType,
                    editType: "watermark_removal",
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            setWatermarkState((s) => ({ ...s, [watermarkTarget.relativePath]: "done" }));
            setCacheBust((c) => ({ ...c, [watermarkTarget.relativePath]: Date.now() }));
            toast.success(`Watermark removed for ${watermarkTarget.fileName}`);
            setWatermarkTarget(null);
            setWatermarkPreview(null);
        } catch (err: any) {
            setWatermarkError(err?.message || "Save failed");
        } finally {
            setWatermarkSaving(false);
        }
    }

    // Clamp focus if the filtered list shrinks (e.g. search narrows results).
    useEffect(() => {
        if (focusedIndex >= filteredPairs.length) {
            setFocusedIndex(Math.max(0, filteredPairs.length - 1));
        }
    }, [filteredPairs.length, focusedIndex]);

    function goToPage(delta: number) {
        const params = new URLSearchParams(searchParams.toString());
        const currentPage = parseInt(params.get("page") || "1", 10) || 1;
        const nextPage = Math.max(1, currentPage + delta);
        params.set("page", String(nextPage));
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }

    // Global keyboard shortcuts. Disabled while a modal is open (modals own
    // their own shortcuts) and while typing in any input/textarea.
    useEffect(() => {
        function isTypingTarget(target: EventTarget | null): boolean {
            const el = target as HTMLElement | null;
            if (!el) return false;
            const tag = el.tagName;
            return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
        }

        function onKeyDown(e: KeyboardEvent) {
            if (isTypingTarget(e.target)) return;
            if (cropTarget || watermarkTarget) return; // modals handle their own keys

            const pair = filteredPairs[focusedIndex];

            switch (e.key.toLowerCase()) {
                case "j":
                case "arrowdown":
                    e.preventDefault();
                    setFocusedIndex((i) => Math.min(filteredPairs.length - 1, i + 1));
                    break;
                case "k":
                case "arrowup":
                    e.preventDefault();
                    setFocusedIndex((i) => Math.max(0, i - 1));
                    break;
                case "arrowleft":
                    e.preventDefault();
                    goToPage(-1);
                    break;
                case "arrowright":
                    e.preventDefault();
                    goToPage(1);
                    break;
                case "r":
                    if (pair) handleRevert(pair);
                    break;
                case "c":
                    if (pair) setCropTarget(pair);
                    break;
                case "w":
                    if (pair) openWatermarkModal(pair);
                    break;
                case "?":
                    setShowShortcutHelp((v) => !v);
                    break;
                case "escape":
                    setShowShortcutHelp(false);
                    break;
                default:
                    break;
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredPairs, focusedIndex, cropTarget, watermarkTarget]);

    // Keep the focused card scrolled into view as focus moves via keyboard.
    useEffect(() => {
        cardRefs.current[focusedIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [focusedIndex]);

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">
                    Shortcuts: <kbd className="px-1 border rounded">J</kbd>/
                    <kbd className="px-1 border rounded">K</kbd> move ·{" "}
                    <kbd className="px-1 border rounded">R</kbd> revert ·{" "}
                    <kbd className="px-1 border rounded">C</kbd> crop ·{" "}
                    <kbd className="px-1 border rounded">W</kbd> remove watermark ·{" "}
                    <kbd className="px-1 border rounded">←</kbd>/
                    <kbd className="px-1 border rounded">→</kbd> page ·{" "}
                    <kbd className="px-1 border rounded">?</kbd> help
                </p>
            </div>

            <div className="flex flex-wrap gap-3 mb-6 items-end">
                <div>
                    <label className="block text-xs font-medium mb-1">Search filename (this page)</label>
                    <input
                        className="border rounded px-3 py-1.5 text-sm w-64"
                        placeholder="e.g. cell-diagram.png"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium mb-1">Subfolder (server filter)</label>
                    <div className="flex gap-2">
                        <input
                            className="border rounded px-3 py-1.5 text-sm w-64"
                            placeholder="e.g. biology/cells/"
                            value={subfolderInput}
                            onChange={(e) => setSubfolderInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applySubfolderFilter()}
                        />
                        <Button size="sm" variant="secondary" onClick={applySubfolderFilter} disabled={isPending}>
                            Apply
                        </Button>
                    </div>
                </div>
            </div>

            {filteredPairs.length === 0 && (
                <p className="text-sm text-muted-foreground">No matching pairs found.</p>
            )}

            <div className="grid grid-cols-1 gap-6">
                {filteredPairs.map((pair, index) => {
                    const rState = revertState[pair.relativePath] ?? "idle";
                    const cState = cropState[pair.relativePath] ?? "idle";
                    const wState = watermarkState[pair.relativePath] ?? "idle";
                    const bust = cacheBust[pair.relativePath];
                    const editedSrc = bust ? `${pair.editedUrl}&_=${bust}` : pair.editedUrl;

                    return (
                        <div
                            key={pair.relativePath}
                            ref={(el) => {
                                cardRefs.current[index] = el;
                            }}
                            onClick={() => setFocusedIndex(index)}
                            className={`border rounded-lg p-4 transition-shadow ${
                                index === focusedIndex ? "ring-2 ring-primary" : ""
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-medium truncate">{pair.relativePath}</div>
                                <div className="flex gap-2">
                                    {rState === "done" && <Badge variant="secondary">Reverted</Badge>}
                                    {rState === "error" && <Badge variant="destructive">Revert failed</Badge>}
                                    {cState === "done" && <Badge variant="secondary">Cropped</Badge>}
                                    {cState === "error" && <Badge variant="destructive">Crop failed</Badge>}
                                    {wState === "done" && <Badge variant="secondary">Watermark removed</Badge>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Original (backup)</div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={pair.backupUrl}
                                        alt={`${pair.fileName} original`}
                                        className="w-full h-64 object-contain bg-muted rounded"
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Current (edited)</div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={editedSrc}
                                        alt={`${pair.fileName} current`}
                                        className="w-full h-64 object-contain bg-muted rounded"
                                    />
                                </div>
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={cState === "working"}
                                    onClick={() => setCropTarget(pair)}
                                >
                                    Crop
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openWatermarkModal(pair)}
                                >
                                    Remove Watermark
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={rState === "working"}
                                    onClick={() => handleRevert(pair)}
                                >
                                    {rState === "working" ? "Reverting..." : "Revert to original"}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {cropTarget && (
                <CropModal
                    imageUrl={
                        cacheBust[cropTarget.relativePath]
                            ? `${cropTarget.editedUrl}&_=${cacheBust[cropTarget.relativePath]}`
                            : cropTarget.editedUrl
                    }
                    fileName={cropTarget.fileName}
                    saving={(cropState[cropTarget.relativePath] ?? "idle") === "working"}
                    onCancel={() => setCropTarget(null)}
                    onSave={(blob, mimeType) => handleCropSave(cropTarget, blob, mimeType)}
                />
            )}

            {watermarkTarget && (
                <WatermarkModal
                    originalUrl={proxied(
                        cacheBust[watermarkTarget.relativePath]
                            ? `${watermarkTarget.editedUrl}&_=${cacheBust[watermarkTarget.relativePath]}`
                            : watermarkTarget.editedUrl
                    )}
                    fileName={watermarkTarget.fileName}
                    preview={watermarkPreview}
                    loading={watermarkLoading}
                    saving={watermarkSaving}
                    error={watermarkError}
                    description={watermarkDescription}
                    onDescriptionChange={setWatermarkDescription}
                    onRegenerate={() => requestWatermarkPreview(watermarkTarget)}
                    onKeep={handleWatermarkKeep}
                    onCancel={() => {
                        setWatermarkTarget(null);
                        setWatermarkPreview(null);
                        setWatermarkError(null);
                    }}
                />
            )}
            {showShortcutHelp && (
                <div
                    className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
                    onClick={() => setShowShortcutHelp(false)}
                >
                    <div
                        className="bg-background rounded-lg p-6 max-w-md w-full"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h2 className="text-lg font-semibold mb-4">Keyboard shortcuts</h2>
                        <ul className="space-y-2 text-sm">
                            <li><kbd className="px-1.5 border rounded">J</kbd> / <kbd className="px-1.5 border rounded">↓</kbd> — next image</li>
                            <li><kbd className="px-1.5 border rounded">K</kbd> / <kbd className="px-1.5 border rounded">↑</kbd> — previous image</li>
                            <li><kbd className="px-1.5 border rounded">R</kbd> — revert focused image to original</li>
                            <li><kbd className="px-1.5 border rounded">C</kbd> — open crop tool on focused image</li>
                            <li><kbd className="px-1.5 border rounded">W</kbd> — remove watermark on focused image</li>
                            <li><kbd className="px-1.5 border rounded">←</kbd> / <kbd className="px-1.5 border rounded">→</kbd> — previous / next page</li>
                            <li><kbd className="px-1.5 border rounded">Esc</kbd> — close a modal</li>
                            <li><kbd className="px-1.5 border rounded">Enter</kbd> — confirm within a modal (Save crop / Keep)</li>
                            <li><kbd className="px-1.5 border rounded">G</kbd> — regenerate (in the watermark modal)</li>
                            <li><kbd className="px-1.5 border rounded">?</kbd> — toggle this help</li>
                        </ul>
                        <Button size="sm" variant="secondary" className="mt-4" onClick={() => setShowShortcutHelp(false)}>
                            Close
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}