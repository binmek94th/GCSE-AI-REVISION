'use client'
import { useState, useEffect } from 'react';
import {FileText, Loader2, AlertCircle, BookOpen, ArrowLeft, ChevronRight, ChevronLeft} from 'lucide-react';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {auth} from "@/lib/firebase";
import {MarkdownContent} from "@/app/dashboard/study_materials/Markdown";
import {useDashboard} from "@/contexts/DashboardContext";
import ContextualAiChat from "@/app/components/ContextualAiChat";

interface Material {
    id: string;
    title: string;
    content: string;
    subject: string;
    done: boolean;
}

interface Props {
    packId: string;
    setPackId: (id: string | null) => void;
}

export default function StudyMaterialTab({ packId, setPackId }: Props) {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<null | string>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const { incrementStreak } = useDashboard();


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

    const handleDone = async (materialId: string) => {
        if (!auth.currentUser) return;
        const idToken = await auth.currentUser.getIdToken();
        const currentIndex = materials.findIndex((m) => m.id === materialId);
        setMaterials(prevState =>
            prevState.map(m =>
                m.id === materialId ? { ...m, done: true } : m
            )
        );


        if (currentIndex !== -1 && currentIndex + 1 < materials.length) {
            setSelectedMaterial(materials[currentIndex + 1]);
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

        } catch (error) {
            console.error("Error marking material done:", error);
        }
        incrementStreak()
    };


    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="flex h-screen">
                <div className="w-80 rounded-2xl bg-white border-r border-gray-200 overflow-y-auto shadow-sm">
                    <div className="p-6 border-b flex justify-between border-gray-200 bg-gradient-to-r from-indigo-500 to-purple-500">
                        <div className="flex items-center gap-3 text-white">
                            <BookOpen className="w-6 h-6" />
                            <h2 className="text-xl font-semibold">{materials[0]?.subject || 'Study Pack'}</h2>
                        </div>
                        <button
                            className="cursor-pointer text-white flex items-center gap-2 px-3 py-1 rounded-lg hover:bg-indigo-700 hover:shadow-md transition-all duration-200"
                            onClick={() => setPackId(null)}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    </div>

                    {materials.length === 0 ? (
                        <div className="p-6 text-center">
                            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 text-sm">No materials available</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-2">
                            {materials.map((material) => (
                                <button
                                    key={material.id}
                                    onClick={() => setSelectedMaterial(material)}
                                    className={`w-full text-left p-4 rounded-lg transition-all duration-200 flex items-start gap-3 ${
                                        selectedMaterial?.id === material.id
                                            ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md"
                                            : "bg-gray-50 text-gray-900 hover:bg-gray-100 hover:shadow-sm"
                                    }`}
                                >
                                    <div className="flex-shrink-0 mt-1">
                                        {material.done ? (
                                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white">
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    className="w-3 h-3"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                    strokeWidth={3}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        ) : (
                                            <div
                                                className={`w-5 h-5 rounded-full border-2 ${
                                                    selectedMaterial?.id === material.id
                                                        ? "border-white"
                                                        : "border-gray-400"
                                                }`}
                                            />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-sm block line-clamp-2">
                                            {material.title}
                                        </span>
                                        <span
                                            className={`text-xs mt-1 block ${
                                                selectedMaterial?.id === material.id
                                                    ? "text-indigo-100"
                                                    : "text-gray-500"
                                            }`}
                                        >
                                            {material.subject}
                                        </span>
                                    </div>
                                </button>
                            ))}

                            <div className="flex justify-between items-center p-4 border-t border-gray-200">
                                <button
                                    onClick={handlePrevPage}
                                    disabled={page === 1}
                                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
                                >
                                    <ChevronLeft className="w-4 h-4" /> Prev
                                </button>
                                <span className="text-sm text-gray-600">Page {page}</span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={!hasMore}
                                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-50 transition"
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
                                    onClick={() => handleDone(selectedMaterial.id)}
                                    disabled={selectedMaterial.done}
                                    className={`px-4 py-2 text-white text-sm font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 flex items-center gap-2 ${
                                        selectedMaterial.done
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-4 h-4"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
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
        </div>
    );
}