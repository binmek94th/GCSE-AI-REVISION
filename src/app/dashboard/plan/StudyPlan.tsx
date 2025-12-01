'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {MarkdownContent} from "@/app/dashboard/study_materials/Markdown";
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle } from 'lucide-react';
import {ScrollArea} from "@radix-ui/react-scroll-area";
import { Button } from "@/app/components/ui/button";
import {useDashboard} from "@/contexts/DashboardContext";

interface Break {
    after: string;
    duration: string;
    type: string;
}

interface Session {
    difficulty: string;
    duration: string;
    focusArea: string;
    materialId: string;
    materialTitle: string;
    objectives: string[];
    packId: string;
    subject: string;
    timeSlot: string;
    completed?: boolean;
    material?: {
        id: string;
        title: string;
        content: string;
    };
}

interface Plan {
    breaks: Break[];
    dailyGoal: string;
    sessions: Session[];
    tips: string[];
    totalStudyTime: string;
}

interface Preferences {
    hoursPerWeek: string;
    targetGrade: string;
}

interface StudyPlan {
    id: string;
    createdAt: string;
    date: string;
    plan: Plan;
    preferences: Preferences;
    status: string;
}

export default function StudyPlan() {
    const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any>()
    const { incrementStreak } = useDashboard();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setAuthChecked(true);

            if (!user) {
                setError('Please sign in to view your study plan');
                setLoading(false);
                return;
            }

            try {
                const idToken = await user.getIdToken();

                const response = await fetch('/api/study-plan', {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch study plan');
                }

                const data = await response.json();
                setStudyPlan(data);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
                setStudyPlan(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    if (!authChecked || loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-lg text-gray-600">Loading your study plan...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Study Plan</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }


    const handleMarkAsDone = async () => {
        if (!selectedMaterial.id || !auth.currentUser) return
        try {
            const idToken = await auth.currentUser.getIdToken();
            setLoading(true);

            // Mark the study material as done
            await fetch("/api/study_materials", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    packId: selectedMaterial.study_pack_id,
                    materialId: selectedMaterial.id,
                    done: true
                }),
            });

            // Mark the session as completed in the study plan
            await fetch("/api/study-plan/mark-completed", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    materialId: selectedMaterial.id
                }),
            });

            setStudyPlan((prevPlan: any) => {
                if (!prevPlan) return prevPlan;

                return {
                    ...prevPlan,
                    plan: {
                        ...prevPlan.plan,
                        sessions: prevPlan.plan.sessions.map((session: any) => {
                            if (session.material?.id === selectedMaterial.id) {
                                return {
                                    ...session,
                                    completed: true
                                };
                            }
                            return session;
                        })
                    }
                };
            });

            setSelectedMaterial(null);
            incrementStreak();

        } catch (error) {
            console.error("Error marking material done:", error);
        }
        finally {
            setLoading(false);
        }
    }

    if (!studyPlan) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                    <div className="text-gray-400 text-5xl mb-4">📚</div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Study Plan Found</h2>
                    <p className="text-gray-600">No study plan is available for today.</p>
                </div>
            </div>
        );
    }


    return (
        <div className="min-h-screen bg-gray-50 py-4 px-4">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                        <h2 className="font-semibold text-blue-900 mb-1">Daily Goal</h2>
                        <p className="text-blue-800">{studyPlan.plan.dailyGoal}</p>
                    </div>

                </div>

                <div className="space-y-6">
                    {studyPlan.plan.sessions.map((session, index) => {
                        const isCompleted = session.completed === true;

                        return (
                            <div key={index} onClick={() => setSelectedMaterial(session.material)}>
                                <div className={`bg-white hover:cursor-pointer rounded-lg shadow-md p-6 relative ${isCompleted ? 'opacity-75 border-2 border-green-500' : ''}`}>
                                    {/* Completed Badge */}
                                    {isCompleted && (
                                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                            <CheckCircle className="w-4 h-4" />
                                            Completed
                                        </div>
                                    )}

                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className={`text-xl font-bold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                Session {index + 1}: {session.subject}
                                            </h3>
                                            <p className={`${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {session.materialTitle}
                                            </p>
                                        </div>
                                        <span className={`px-3 py-1 ${isCompleted ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-800'} rounded-full text-sm font-semibold`}>
                                            {session.timeSlot}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Duration</p>
                                            <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                                {session.duration}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Difficulty</p>
                                            <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                                {session.difficulty}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Focus Area</p>
                                            <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                                {session.focusArea.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <h4 className={`font-semibold mb-2 ${isCompleted ? 'text-gray-500' : 'text-gray-700'}`}>
                                            Objectives:
                                        </h4>
                                        <ul className="space-y-1">
                                            {session.objectives.map((objective, objIndex) => (
                                                <li key={objIndex} className="flex items-start">
                                                    <span className={`mr-2 ${isCompleted ? 'text-green-500' : 'text-blue-500'}`}>
                                                        {isCompleted ? '✓' : '•'}
                                                    </span>
                                                    <span className={`${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                                        {objective}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                </div>

                                <div className="flex items-center justify-center my-4">
                                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3 text-center">
                                        <p className="text-sm font-semibold text-yellow-800">
                                            ☕ Break (30 mins)
                                        </p>

                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <Dialog.Root open={!!selectedMaterial} onOpenChange={(open) => !open && setSelectedMaterial(null)}>
                <Dialog.Portal>
                    {/* Overlay */}
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />

                    {/* Dialog Content */}
                    <Dialog.Content
                        className="fixed top-[50%] left-[50%] w-full max-w-3xl h-[80vh] -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg focus:outline-none flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b p-4">
                            <h2 className="text-lg font-semibold">{selectedMaterial?.title || 'Material'}</h2>
                            <Dialog.Close asChild>
                                <button className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="w-5 h-5" />
                                </button>
                            </Dialog.Close>
                        </div>

                        <ScrollArea className="flex-1 p-6 overflow-y-auto">
                            {selectedMaterial?.content ? (
                                <div>
                                    <MarkdownContent content={selectedMaterial.content} />
                                    <div onClick={handleMarkAsDone} className={"flex justify-end"}>
                                        <Button>Mark as Finished</Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-500 italic">No content available.</p>
                            )}
                        </ScrollArea>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

        </div>
    );
}