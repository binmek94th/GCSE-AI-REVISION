"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { getAuth } from "firebase/auth";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { toast } from "sonner";
import {firebase} from "@/lib/firebase";

interface ImagePair {
    relativePath: string;
    fileName: string;
    editedPath: string;
    backupPath: string;
    editedUrl: string;
    backupUrl: string;
}

type RevertState = "idle" | "reverting" | "reverted" | "error";

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
    const [revertState, setRevertState] = useState<Record<string, RevertState>>({});
    const [cacheBust, setCacheBust] = useState<Record<string, number>>({});
    const [isPending, startTransition] = useTransition();

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
        startTransition(() => {
            router.push(`${pathname}?${params.toString()}`);
        });
    }

    async function handleRevert(pair: ImagePair) {
        setRevertState((s) => ({ ...s, [pair.relativePath]: "reverting" }));
        try {
            const user = getAuth(firebase).currentUser;
            if (!user) throw new Error("Not signed in");
            const idToken = await user.getIdToken();

            const res = await fetch("/api/admin/image-review/revert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ relativePath: pair.relativePath }),
            });

            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body?.error || `Request failed (${res.status})`);
            }

            setRevertState((s) => ({ ...s, [pair.relativePath]: "reverted" }));
            setCacheBust((c) => ({ ...c, [pair.relativePath]: Date.now() }));
            toast.success(`Reverted ${pair.fileName}`);
        } catch (err: any) {
            setRevertState((s) => ({ ...s, [pair.relativePath]: "error" }));
            toast.error(err?.message || "Revert failed");
        }
    }

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-6 items-end">
                <div>
                    <label className="block text-xs font-medium mb-1">Search filename</label>
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
                {filteredPairs.map((pair) => {
                    const state = revertState[pair.relativePath] ?? "idle";
                    const bust = cacheBust[pair.relativePath];
                    const editedSrc = bust ? `${pair.editedUrl}&_=${bust}` : pair.editedUrl;

                    return (
                        <div key={pair.relativePath} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-sm font-medium truncate">{pair.relativePath}</div>
                                {state === "reverted" && <Badge variant="secondary">Reverted</Badge>}
                                {state === "error" && <Badge variant="destructive">Revert failed</Badge>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Original (backup)
                                    </div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={pair.backupUrl}
                                        alt={`${pair.fileName} original`}
                                        className="w-full h-64 object-contain bg-muted rounded"
                                    />
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">
                                        Current (edited)
                                    </div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={editedSrc}
                                        alt={`${pair.fileName} current`}
                                        className="w-full h-64 object-contain bg-muted rounded"
                                    />
                                </div>
                            </div>

                            <div className="mt-3 flex justify-end">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={state === "reverting"}
                                    onClick={() => handleRevert(pair)}
                                >
                                    {state === "reverting" ? "Reverting..." : "Revert to original"}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}