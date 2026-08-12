"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getAuth } from "firebase/auth";
import { firebase } from "@/lib/firebase"; // adjust to your existing client init path
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import CropModal from "./CropModal";
import WatermarkModal from "./WatermarkModal";
import type { ImageSource } from "@/lib/imageReview";

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
                                            source,
                                        }: {
    initialPairs: ImagePair[];
    initialSubfolder: string;
    source: ImageSource;
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

    // Optimistic-update plumbing: when a pair's edited image changes locally
    // (crop, revert, watermark keep) we show the new image immediately —
    // before the server confirms — by pointing that pair's display source at
    // a local override (an object URL for a just-cropped/watermarked blob,
    // or the backup's own URL for a revert). If the background save fails,
    // the override is cleared and the card falls back to the last known-good
    // remote image. objectUrlsRef tracks which override values are blob:
    // URLs we created, so we can revoke them and avoid leaking memory.
    const [editedOverride, setEditedOverride] = useState<Record<string, string>>({});
    const objectUrlsRef = useRef<Set<string>>(new Set());

    function setOverride(rel: string, src: string, isObjectUrl: boolean) {
        setEditedOverride((o) => {
            const prev = o[rel];
            if (prev && objectUrlsRef.current.has(prev)) {
                URL.revokeObjectURL(prev);
                objectUrlsRef.current.delete(prev);
            }
            if (isObjectUrl) objectUrlsRef.current.add(src);
            return { ...o, [rel]: src };
        });
    }

    function clearOverride(rel: string) {
        setEditedOverride((o) => {
            const prev = o[rel];
            if (prev && objectUrlsRef.current.has(prev)) {
                URL.revokeObjectURL(prev);
                objectUrlsRef.current.delete(prev);
            }
            if (!(rel in o)) return o;
            const next = { ...o };
            delete next[rel];
            return next;
        });
    }

    // Tracks which pairs have a save in flight, purely to stop a second
    // action firing against the same file before the first one lands — the
    // UI itself doesn't wait on this, it's just a safety rail against races.
    const [pendingPaths, setPendingPaths] = useState<Set<string>>(new Set());
    function markPending(rel: string) {
        setPendingPaths((p) => new Set(p).add(rel));
    }
    function clearPending(rel: string) {
        setPendingPaths((p) => {
            if (!p.has(rel)) return p;
            const next = new Set(p);
            next.delete(rel);
            return next;
        });
    }

    // Revoke any outstanding object URLs on unmount.
    useEffect(() => {
        return () => {
            objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            objectUrlsRef.current.clear();
        };
    }, []);

    // Delete flow: a confirmation step gates the actual API call, since this
    // removes both the edited AND backup copies — unlike revert, there's no
    // way to undo it afterward. The removal from the grid itself, though, is
    // still optimistic — it happens the moment you confirm, not after the
    // server responds.
    const [deleteTarget, setDeleteTarget] = useState<ImagePair | null>(null);
    const [removedPaths, setRemovedPaths] = useState<Set<string>>(new Set());

    // Watermark removal review state
    const [watermarkTarget, setWatermarkTarget] = useState<ImagePair | null>(null);
    const [watermarkPreview, setWatermarkPreview] = useState<WatermarkPreview | null>(null);
    const [watermarkLoading, setWatermarkLoading] = useState(false);
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
        const notDeleted = initialPairs.filter((p) => !removedPaths.has(p.relativePath));
        if (!search.trim()) return notDeleted;
        const q = search.toLowerCase();
        return notDeleted.filter((p) => p.relativePath.toLowerCase().includes(q));
    }, [initialPairs, search, removedPaths]);

    // A new page of pairs loaded (or source switched) — reset all per-pair UI
    // state tied to the previous set, revoking any blob URLs we created for
    // optimistic previews first so we don't leak memory.
    useEffect(() => {
        setEditedOverride((prevOverrides) => {
            Object.values(prevOverrides).forEach((url) => {
                if (objectUrlsRef.current.has(url)) {
                    URL.revokeObjectURL(url);
                    objectUrlsRef.current.delete(url);
                }
            });
            return {};
        });
        setFocusedIndex(0);
        setSearch("");
        setRemovedPaths(new Set());
        setRevertState({});
        setCropState({});
        setWatermarkState({});
        setCacheBust({});
        setPendingPaths(new Set());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialPairs]);

    function applySubfolderFilter() {
        const params = new URLSearchParams(searchParams.toString());
        params.set("source", source);
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

    // NOTE: relativePath is only unique *within* a source's edited/backup
    // prefix pair. Now that there are multiple sources (GCSE, A-Level), the
    // action routes below need the full storage paths (or the source key) to
    // know which prefix pair a given relativePath belongs to — sending
    // relativePath alone is ambiguous. editedPath/backupPath are sent
    // alongside it so the routes can operate on exact storage paths directly.

    // Every handler below follows the same shape: apply the visible change
    // immediately (badge + image), fire the request in the background, and
    // only touch the UI again if it actually fails — in which case we roll
    // back the optimistic change and surface an error toast.

    async function handleRevert(pair: ImagePair) {
        const rel = pair.relativePath;
        if (pendingPaths.has(rel)) return;

        // Optimistic: after a revert, the edited file's bytes become
        // identical to the backup's — so showing backupUrl in its place is
        // not a temporary stand-in, it's simply correct, and never goes
        // stale since the backup itself doesn't change. No rollback-on-
        // success needed, only on failure.
        setOverride(rel, pair.backupUrl, false);
        setRevertState((s) => ({ ...s, [rel]: "done" }));
        markPending(rel);

        try {
            const idToken = await getIdToken();
            const res = await fetch("/api/admin/image-review/revert", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    source,
                    relativePath: rel,
                    editedPath: pair.editedPath,
                    backupPath: pair.backupPath,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            toast.success(`Reverted ${pair.fileName}`);
        } catch (err: any) {
            clearOverride(rel);
            setRevertState((s) => ({ ...s, [rel]: "error" }));
            toast.error(err?.message || "Revert failed");
        } finally {
            clearPending(rel);
        }
    }

    async function handleCropSave(pair: ImagePair, blob: Blob, mimeType: string) {
        const rel = pair.relativePath;
        if (pendingPaths.has(rel)) return;

        // Optimistic: we already have the cropped bytes locally, so display
        // them immediately via an object URL and close the modal right away
        // rather than waiting on the upload.
        const objectUrl = URL.createObjectURL(blob);
        setOverride(rel, objectUrl, true);
        setCropState((s) => ({ ...s, [rel]: "done" }));
        setCropTarget(null);
        markPending(rel);

        try {
            const idToken = await getIdToken();
            const imageBase64 = await blobToBase64(blob);
            const res = await fetch("/api/admin/image-review/crop", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    source,
                    relativePath: rel,
                    editedPath: pair.editedPath,
                    backupPath: pair.backupPath,
                    imageBase64,
                    contentType: mimeType,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            setCacheBust((c) => ({ ...c, [rel]: Date.now() }));
            toast.success(`Saved crop for ${pair.fileName}`);
        } catch (err: any) {
            clearOverride(rel);
            setCropState((s) => ({ ...s, [rel]: "error" }));
            toast.error(err?.message || "Crop save failed");
        } finally {
            clearPending(rel);
        }
    }

    async function requestWatermarkPreview(pair: ImagePair) {
        // Not optimistic — this is the Gemini call itself, there's no local
        // result to show ahead of time.
        setWatermarkLoading(true);
        setWatermarkError(null);
        try {
            const idToken = await getIdToken();
            const res = await fetch("/api/admin/image-review/remove-watermark", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    source,
                    relativePath: pair.relativePath,
                    editedPath: pair.editedPath,
                    backupPath: pair.backupPath,
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
        const rel = watermarkTarget.relativePath;
        if (pendingPaths.has(rel)) return;

        const pair = watermarkTarget;
        const dataUrl = `data:${watermarkPreview.contentType};base64,${watermarkPreview.imageBase64}`;

        // Optimistic: we already have the previewed result, so show it and
        // close the modal immediately rather than waiting on the save.
        setOverride(rel, dataUrl, false);
        setWatermarkState((s) => ({ ...s, [rel]: "done" }));
        setWatermarkTarget(null);
        setWatermarkPreview(null);
        markPending(rel);

        try {
            const idToken = await getIdToken();
            const res = await fetch("/api/admin/image-review/crop", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    source,
                    relativePath: rel,
                    editedPath: pair.editedPath,
                    backupPath: pair.backupPath,
                    imageBase64: watermarkPreview.imageBase64,
                    contentType: watermarkPreview.contentType,
                    editType: "watermark_removal",
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            setCacheBust((c) => ({ ...c, [rel]: Date.now() }));
            toast.success(`Watermark removed for ${pair.fileName}`);
        } catch (err: any) {
            clearOverride(rel);
            setWatermarkState((s) => ({ ...s, [rel]: "error" }));
            toast.error(err?.message || "Save failed");
        } finally {
            clearPending(rel);
        }
    }

    async function handleDeleteConfirm() {
        if (!deleteTarget) return;
        const rel = deleteTarget.relativePath;
        if (pendingPaths.has(rel)) return;

        const pair = deleteTarget;

        // Optimistic: drop it from the visible grid immediately and close
        // the confirm dialog right away.
        setRemovedPaths((prev) => new Set(prev).add(rel));
        setDeleteTarget(null);
        markPending(rel);

        try {
            const idToken = await getIdToken();
            const res = await fetch("/api/admin/image-review/delete", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    source,
                    relativePath: rel,
                    editedPath: pair.editedPath,
                    backupPath: pair.backupPath,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }
            toast.success(`Deleted ${pair.fileName}`);
        } catch (err: any) {
            // Roll back — bring the card back into the grid.
            setRemovedPaths((prev) => {
                const next = new Set(prev);
                next.delete(rel);
                return next;
            });
            toast.error(err?.message || "Delete failed");
        } finally {
            clearPending(rel);
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
        params.set("source", source);
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

            if (deleteTarget) {
                // The delete confirmation dialog owns Escape/Enter while open.
                if (e.key === "Escape") {
                    e.preventDefault();
                    setDeleteTarget(null);
                } else if (e.key === "Enter") {
                    e.preventDefault();
                    handleDeleteConfirm();
                }
                return;
            }

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
                case "d":
                    if (pair) setDeleteTarget(pair);
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
    }, [filteredPairs, focusedIndex, cropTarget, watermarkTarget, deleteTarget, pendingPaths]);

    // Keep the focused card scrolled into view as focus moves via keyboard.
    useEffect(() => {
        cardRefs.current[focusedIndex]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, [focusedIndex]);

    // Resolves the URL to display for a pair's "Current (edited)" panel: a
    // local optimistic override if one exists (already same-origin, used
    // as-is), otherwise the remote image routed through the same-origin
    // proxy. Routing the grid's own display through the same proxied URL
    // that CropModal/WatermarkModal use means the browser already has these
    // exact bytes cached by the time you open Crop or Remove Watermark on an
    // image you can already see — no second fetch, no visible reload.
    function resolveEditedSrc(pair: ImagePair): string {
        const override = editedOverride[pair.relativePath];
        if (override) return override; // blob:/data: — already local, no proxy needed
        const bust = cacheBust[pair.relativePath];
        const remote = bust ? `${pair.editedUrl}&_=${bust}` : pair.editedUrl;
        return proxied(remote);
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-muted-foreground">
                    Shortcuts: <kbd className="px-1 border rounded">J</kbd>/
                    <kbd className="px-1 border rounded">K</kbd> move ·{" "}
                    <kbd className="px-1 border rounded">R</kbd> revert ·{" "}
                    <kbd className="px-1 border rounded">C</kbd> crop ·{" "}
                    <kbd className="px-1 border rounded">W</kbd> remove watermark ·{" "}
                    <kbd className="px-1 border rounded">D</kbd> delete ·{" "}
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
                    const editedSrc = resolveEditedSrc(pair);
                    // While any save is in flight for this pair, buttons are
                    // disabled — not because the UI is waiting on it (the
                    // badge/image already updated), but to avoid a second
                    // overlapping write racing the first on the same file.
                    const isSyncing = pendingPaths.has(pair.relativePath);

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
                                    {wState === "error" && <Badge variant="destructive">Watermark save failed</Badge>}
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
                                    disabled={isSyncing}
                                    onClick={() => setCropTarget(pair)}
                                >
                                    Crop
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isSyncing}
                                    onClick={() => openWatermarkModal(pair)}
                                >
                                    Remove Watermark
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isSyncing}
                                    onClick={() => handleRevert(pair)}
                                >
                                    Revert to original
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={isSyncing}
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => setDeleteTarget(pair)}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {cropTarget && (
                <CropModal
                    imageUrl={resolveEditedSrc(cropTarget)}
                    fileName={cropTarget.fileName}
                    saving={false}
                    onCancel={() => setCropTarget(null)}
                    onSave={(blob, mimeType) => handleCropSave(cropTarget, blob, mimeType)}
                />
            )}

            {watermarkTarget && (
                <WatermarkModal
                    originalUrl={resolveEditedSrc(watermarkTarget)}
                    fileName={watermarkTarget.fileName}
                    preview={watermarkPreview}
                    loading={watermarkLoading}
                    saving={false}
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
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-background rounded-lg p-6 max-w-md w-full">
                        <h2 className="text-lg font-semibold mb-2">Delete permanently?</h2>
                        <p className="text-sm text-muted-foreground mb-1">
                            This removes both the edited and backup copies of{" "}
                            <span className="font-medium text-foreground">{deleteTarget.fileName}</span> from
                            Storage.
                        </p>
                        <p className="text-sm text-destructive mb-5">
                            This cannot be undone — unlike revert, there will be no backup left to restore from.
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleDeleteConfirm}>
                                Delete permanently
                            </Button>
                        </div>
                    </div>
                </div>
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
                            <li><kbd className="px-1.5 border rounded">D</kbd> — delete focused image (asks to confirm)</li>
                            <li><kbd className="px-1.5 border rounded">←</kbd> / <kbd className="px-1.5 border rounded">→</kbd> — previous / next page</li>
                            <li><kbd className="px-1.5 border rounded">Esc</kbd> — close a modal</li>
                            <li><kbd className="px-1.5 border rounded">Enter</kbd> — confirm within a modal (Save crop / Keep / Delete)</li>
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