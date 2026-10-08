"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Loader2, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

interface LinkedTutor {
    tutorId: string;
    name: string;
    source: "referral_link" | "code";
}

export default function MyTutorsCard() {
    const [tutors, setTutors] = useState<LinkedTutor[] | null>(null);
    const [code, setCode] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<string | null>(null);

    const authHeader = async () => {
        const idToken = await auth.currentUser?.getIdToken();
        return { Authorization: `Bearer ${idToken}` };
    };

    const loadTutors = async () => {
        try {
            const res = await fetch("/api/user/tutors", { headers: await authHeader() });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setTutors(data.tutors ?? []);
        } catch {
            setTutors([]);
        }
    };

    useEffect(() => {
        loadTutors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAdd = async () => {
        const trimmed = code.trim();
        if (!trimmed) {
            setError("Enter the code your tutor gave you");
            return;
        }
        setAdding(true);
        setError(null);
        try {
            const res = await fetch("/api/user/tutors", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(await authHeader()) },
                body: JSON.stringify({ code: trimmed }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? "Something went wrong. Please try again.");
                return;
            }
            if (data.alreadyLinked) {
                toast.info(`${data.tutor.name} is already your tutor`);
            } else {
                toast.success(`${data.tutor.name} can now see your progress`);
            }
            setCode("");
            await loadTutors();
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setAdding(false);
        }
    };

    const handleRemove = async (tutor: LinkedTutor) => {
        if (!confirm(`Stop sharing your progress with ${tutor.name}?`)) return;
        setRemovingId(tutor.tutorId);
        try {
            const res = await fetch(`/api/user/tutors?tutorId=${encodeURIComponent(tutor.tutorId)}`, {
                method: "DELETE",
                headers: await authHeader(),
            });
            if (!res.ok) throw new Error();
            toast.success(`Stopped sharing with ${tutor.name}`);
            setTutors((prev) => (prev ?? []).filter((t) => t.tutorId !== tutor.tutorId));
        } catch {
            toast.error("Couldn't remove tutor. Please try again.");
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">My Tutor</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
                Have a tutor on StudyCedo? Enter the code they gave you and they&#39;ll be able to see your study, weekly and quiz progress.
                You can stop sharing at any time.
            </p>

            {tutors === null ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                </div>
            ) : (
                tutors.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {tutors.map((t) => (
                            <div
                                key={t.tutorId}
                                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                            >
                                <div>
                                    <div className="text-sm font-medium text-gray-900">{t.name}</div>
                                    <div className="text-xs text-gray-500">
                                        {t.source === "referral_link" ? "Added through their sign-up link" : "Added with their tutor code"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleRemove(t)}
                                    disabled={removingId === t.tutorId}
                                    className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 cursor-pointer disabled:opacity-50"
                                >
                                    {removingId === t.tutorId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}

            <div className="flex flex-col sm:flex-row gap-2">
                <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                    }}
                    placeholder="Tutor code, e.g. sarah-jenkins-4f2a"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                    onClick={handleAdd}
                    disabled={adding}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center"
                >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add tutor"}
                </button>
            </div>
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
    );
}
