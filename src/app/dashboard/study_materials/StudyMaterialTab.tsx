'use client'
import { useState, useEffect, useRef } from 'react';
import {FileText, Loader2, AlertCircle, BookOpen, ArrowLeft, ChevronRight, ChevronLeft, ChevronDown, CheckCircle} from 'lucide-react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {auth} from "@/lib/firebase";
import {MarkdownContent} from "@/app/components/Markdown";
import {useDashboard} from "@/contexts/DashboardContext";
import ContextualAiChat from "@/app/components/ContextualAiChat";
import {useRouter, useSearchParams} from "next/navigation";
import { toast } from "sonner";
import {MaterialQuizModal} from "@/app/dashboard/plan/MaterialQuizModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AssessmentQuestion {
    id: string;
    question: string;
    options: Record<string, string> | string[];
    correctAnswer: string;
    explanation?: string;
    subject: string;
    materialId: string;
    materialTitle: string;
    difficulty: number | string;
}

interface Material {
    id: string;
    title: string;
    content: string;
    subject: string;
    topic?: string;
    done: boolean;
    // ✅ Now populated by /api/study_materials with full question data
    // resolved from the correct level-specific collection.
    questions?: AssessmentQuestion[];
}

interface Props {
    packId: string;
    unSelectPack: () => void;
}

function groupByTopic(materials: Material[]): Record<string, Material[]> {
    return materials.reduce((acc, material) => {
        const key = material.topic || 'General';
        if (!acc[key]) acc[key] = [];
        acc[key].push(material);
        return acc;
    }, {} as Record<string, Material[]>);
}

export default function StudyMaterialTab({ packId, unSelectPack }: Props) {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<null | string>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [collapsedTopics, setCollapsedTopics] = useState<Record<string, boolean>>({});
    const { incrementStreak } = useDashboard();
    const searchParams = useSearchParams();
    const router = useRouter();

    // ── Quiz-before-done state (same pattern as StudyPlan.tsx) ─────────────────
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const pendingDoneMaterialIdRef = useRef<string | null>(null);

    useEffect(() => {
        const materialId = searchParams.get("materialId");
        if (materialId && materials) {
            const material = materials.find(s => s.id === materialId);
            if (material) {
                setSelectedMaterial(material);
            }
        }
    }, [searchParams, materials]);

    useEffect(() => {
        const fetchMaterials = async () => {
            setLoading(true);
            const auth = getAuth();

            const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
                if (!currentUser) {
                    setError("User not authenticated");
                    setLoading(false);
                    return;
                }

                try {
                    const idToken = await currentUser.getIdToken();

                    const response = await fetch(`/api/study_materials?packId=${packId}&page=${page}&limit=10`, {
                        headers: {
                            Authorization: `Bearer ${idToken}`,
                        },
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to fetch materials: ${response.statusText}`);
                    }

                    const data = await response.json();
                    const fetchedMaterials = data.materials || [];

                    setMaterials(fetchedMaterials);
                    setHasMore(fetchedMaterials.length === 10);
                } catch (err: any) {
                    console.error(err);
                    setError(err.message || "Something went wrong");
                } finally {
                    setLoading(false);
                }
            });

            return () => unsubscribe();
        };

        fetchMaterials();
    }, [page, packId]);

    const selectMaterial = (material: Material) => {
        setSelectedMaterial(material);
        const params = new URLSearchParams(searchParams.toString());
        params.set("materialId", material.id);
        router.push(`?${params.toString()}`);
    };

    const toggleTopic = (topic: string) => {
        setCollapsedTopics(prev => ({ ...prev, [topic]: !prev[topic] }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-600">Loading study materials...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2 text-center">Error Loading Materials</h2>
                    <p className="text-gray-600 text-center">{error}</p>
                </div>
            </div>
        );
    }

    const handlePrevPage = () => {
        if (page > 1) setPage(prev => prev - 1);
    };

    const handleNextPage = () => {
        if (hasMore) setPage(prev => prev + 1);
    };

    // ── Mark as done — now opens quiz first, same as StudyPlan.tsx ─────────────

    const handleMarkAsDoneClick = () => {
        if (!selectedMaterial) return;
        pendingDoneMaterialIdRef.current = selectedMaterial.id;
        setQuizModalOpen(true);
    };

    /**
     * Called by MaterialQuizModal when the student finishes (or skips) the
     * quiz. Performs the actual mark-as-done logic and advances to the
     * next incomplete material, same pattern as StudyPlan.tsx.
     */
    const handleQuizComplete = async (score: number, total: number) => {
        setQuizModalOpen(false);

        const materialId = pendingDoneMaterialIdRef.current;
        if (!materialId) return;
        pendingDoneMaterialIdRef.current = null;

        if (!auth.currentUser) return;
        const idToken = await auth.currentUser.getIdToken();

        const currentIndex = materials.findIndex((m) => m.id === materialId);

        // Optimistic update
        setMaterials(prevState =>
            prevState.map(m =>
                m.id === materialId ? { ...m, done: true } : m
            )
        );

        // Advance to next material in the current page, if any
        if (currentIndex !== -1 && currentIndex + 1 < materials.length) {
            const next = materials[currentIndex + 1];
            setSelectedMaterial(next);
            selectMaterial(next);
        }

        try {
            await fetch("/api/study_materials", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ packId, materialId, done: true }),
            });
        } catch (err) {
            console.error("Error marking material done:", err);
        }

        incrementStreak();

        if (total > 0) {
            const pct = Math.round((score / total) * 100);
            toast.success(`Marked as done! You scored ${score}/${total} (${pct}%) 🎯`);
        } else {
            toast.success("Marked as done!");
        }
    };

    const handleQuizCancel = () => {
        setQuizModalOpen(false);
        pendingDoneMaterialIdRef.current = null;
    };

    const unSelectMaterial = () => {
        setSelectedMaterial(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("materialId");
        router.push(`?${params.toString()}`);
    };

    const grouped = groupByTopic(materials);
    const topicKeys = Object.keys(grouped);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="flex h-screen">
                {/* Sidebar */}
                <div className="w-80 rounded-2xl bg-white border-r border-gray-200 overflow-y-auto shadow-sm flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b flex justify-between border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-500 flex-shrink-0">
                        <div className="flex items-center gap-3 text-white">
                            <BookOpen className="w-6 h-6" />
                            <h2 className="text-xl font-semibold">{materials[0]?.subject || 'Study Pack'}</h2>
                        </div>
                        <button
                            className="cursor-pointer text-white flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
                            onClick={() => {
                                const params = new URLSearchParams(searchParams.toString());
                                params.delete("materialId");
                                params.delete("packId");
                                router.push(`?${params.toString()}`);
                                setSelectedMaterial(null);
                                unSelectPack();
                            }}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    </div>

                    {/* Material list grouped by topic */}
                    {materials.length === 0 ? (
                        <div className="p-6 text-center">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 text-sm">No materials available</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-3 space-y-1">
                                {topicKeys.map((topic) => {
                                    const topicMaterials = grouped[topic];
                                    const isCollapsed = collapsedTopics[topic];
                                    const doneCount = topicMaterials.filter(m => m.done).length;
                                    const allDone = doneCount === topicMaterials.length;

                                    return (
                                        <div key={topic} className="rounded-lg overflow-hidden border border-gray-100">
                                            {/* Topic header */}
                                            <button
                                                onClick={() => toggleTopic(topic)}
                                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors duration-150 text-left"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {allDone ? (
                                                        <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                            </svg>
                                                        </div>
                                                    ) : (
                                                        <div className="w-4 h-4 rounded-full border-2 border-indigo-400 flex-shrink-0" />
                                                    )}
                                                    <span className="font-semibold text-sm text-gray-800 truncate">{topic}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                    <span className="text-xs text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                                                        {doneCount}/{topicMaterials.length}
                                                    </span>
                                                    <ChevronDown
                                                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`}
                                                    />
                                                </div>
                                            </button>

                                            {/* Materials under topic */}
                                            {!isCollapsed && (
                                                <div className="bg-white divide-y divide-gray-50">
                                                    {topicMaterials.map((material) => {
                                                        const questionCount = material.questions?.length ?? 0;
                                                        return (
                                                            <button
                                                                key={material.id}
                                                                onClick={() => selectMaterial(material)}
                                                                className={`w-full text-left px-4 py-3 transition-all duration-150 flex items-center gap-3 ${
                                                                    selectedMaterial?.id === material.id
                                                                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                                                                        : "hover:bg-indigo-50 text-gray-700"
                                                                }`}
                                                            >
                                                                <div className="flex-shrink-0">
                                                                    {material.done ? (
                                                                        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                                            </svg>
                                                                        </div>
                                                                    ) : (
                                                                        <div className={`w-4 h-4 rounded-full border-2 ${
                                                                            selectedMaterial?.id === material.id ? 'border-white' : 'border-gray-300'
                                                                        }`} />
                                                                    )}
                                                                </div>
                                                                <span className="flex-1 min-w-0">
                                                                    <span className="text-sm font-medium line-clamp-2 leading-snug block">
                                                                        {material.title}
                                                                    </span>
                                                                    {questionCount > 0 && !material.done && (
                                                                        <span className={`text-[10px] font-semibold mt-0.5 inline-block ${
                                                                            selectedMaterial?.id === material.id ? 'text-white/80' : 'text-blue-600'
                                                                        }`}>
                                                                            🧠 {questionCount} quiz Q{questionCount > 1 ? 's' : ''}
                                                                        </span>
                                                                    )}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-between items-center p-4 border-t border-gray-200">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={page === 1}
                                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition text-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Prev
                                </button>
                                <span className="text-sm text-gray-600">Page {page}</span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={!hasMore}
                                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition text-sm"
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-y-auto">
                    {selectedMaterial ? (
                        <div className="p-8 max-w-5xl mx-auto">
                            <div className="bg-white rounded-xl border border-gray-200 p-8 shadow-lg">
                                <MarkdownContent content={selectedMaterial.content} />
                            </div>
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleMarkAsDoneClick}
                                    disabled={selectedMaterial.done}
                                    className={`px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 ${
                                        selectedMaterial.done
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    {selectedMaterial.done ? 'Completed' : 'Mark as Done'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-10 h-10 text-indigo-600" />
                                </div>
                                <p className="text-gray-600 text-lg">Select a topic to start learning</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {selectedMaterial && (
                <ContextualAiChat
                    materialId={selectedMaterial.id}
                    materialTitle={selectedMaterial.title}
                    subject={selectedMaterial.subject}
                    packId={packId}
                    contentSelector=".study-content"
                />
            )}

            {/* ── Material quiz modal (shown before confirming mark-as-done) ── */}
            <MaterialQuizModal
                packId={packId}
                open={quizModalOpen}
                materialId={selectedMaterial?.id ?? ''}
                materialTitle={selectedMaterial?.title ?? ''}
                questions={selectedMaterial?.questions ?? []}
                onConfirmDone={handleQuizComplete}
                onCancel={handleQuizCancel}
            />
        </div>
    );
}