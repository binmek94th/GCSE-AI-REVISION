'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {MarkdownContent} from "@/app/dashboard/study_materials/Markdown";
import * as Dialog from '@radix-ui/react-dialog';
import { X, CheckCircle, ClipboardCheck } from 'lucide-react';
import {ScrollArea} from "@radix-ui/react-scroll-area";
import { Button } from "@/app/components/ui/button";
import {useDashboard} from "@/contexts/DashboardContext";
import {QuizComponent} from "@/app/dashboard/quizzes/QuizComponent";
import {toast} from "sonner";
import ContextualAiChat from "@/app/components/ContextualAiChat";
import {useRouter, useSearchParams} from "next/navigation";
import Spinner from "@/app/components/ui/Spinner";

interface Break {
    after: string;
    duration: string;
    type: string;
}

interface Question {
    id: string;
    question: string;
    options: Record<string, string> | string[];
    correctAnswer: string;
    explanation?: string;
    subject: string;
    materialId: string;
    materialTitle: string;
    difficulty: string;
}

interface Assessment {
    totalQuestions: number;
    questions: Question[];
    bySubject: Record<string, string[]>;
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
    assessment: Assessment;
    preferences: Preferences;
    status: string;
}

export default function StudyPlan() {
    const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [selectedMaterial, setSelectedMaterial] = useState<any>()
    const [showAssessment, setShowAssessment] = useState<string | null>(null); // Changed to store subject name
    const [completedAssessments, setCompletedAssessments] = useState<Set<string>>(new Set()); // Track completed assessments
    const { incrementStreak } = useDashboard();
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        const materialId = searchParams.get("materialId");
        if (materialId && studyPlan) {
            const session = studyPlan.plan.sessions.find(s => s.material?.id === materialId);
            if (session) {
                setSelectedMaterial(session.material);
            }
        }
    }, [searchParams, studyPlan]);

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
                    <Spinner size={"lg"}></Spinner>
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
            toast.success("Marked material as done!");
            unSelectMaterial()
        } catch (error) {
            console.error("Error marking material done:", error);
            toast.error("Failed to mark material as done. Please try again.");
        }
        finally {
        }
    }

    const handleAssessmentComplete = (score: number, correctCount: number, totalCount: number) => {
        console.log('Assessment completed:', { score, correctCount, totalCount });
        if (showAssessment) {
            setCompletedAssessments(prev => new Set([...prev, showAssessment]));
        }
    };

    const handleAssessmentExit = () => {
        setShowAssessment(null);
    };

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

    const hasAssessment = studyPlan.assessment && studyPlan.assessment.questions.length > 0;

    // Show Assessment Quiz if triggered
    if (showAssessment && hasAssessment) {
        const subjectQuestions = studyPlan.assessment.questions.filter(
            q => q.subject === showAssessment
        );

        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <Button
                            variant="outline"
                            onClick={() => setShowAssessment(null)}
                            className="mb-4"
                        >
                            ← Back to Study Plan
                        </Button>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{showAssessment} Assessment Quiz</h1>
                        <p className="text-gray-600">
                            Test your knowledge with {subjectQuestions.length} questions from your {showAssessment} study materials
                        </p>
                    </div>
                    <QuizComponent
                        questions={subjectQuestions}
                        packId={`${showAssessment}-assessment`}
                        onComplete={handleAssessmentComplete}
                        onExit={handleAssessmentExit}
                    />
                </div>
            </div>
        );
    }

    const selectMaterial = (material: any) => {
        setSelectedMaterial(material);

        const params = new URLSearchParams(searchParams.toString());
        params.set("materialId", material.id);

        router.push(`?${params.toString()}`);
    };

    const unSelectMaterial = () => {
        setSelectedMaterial(null);

        const params = new URLSearchParams(searchParams.toString());
        params.delete("materialId");
        router.push(`?${params.toString()}`);
    }

    const getDuration = (duration: string): number => {
        const match = duration.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
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
                    {(() => {
                        // Group sessions by subject
                        const groupedSessions = studyPlan.plan.sessions.reduce((acc: Record<string, Session[]>, session) => {
                            if (!acc[session.subject]) {
                                acc[session.subject] = [];
                            }
                            acc[session.subject].push(session);
                            return acc;
                        }, {});

                        // Convert duration string to minutes
                        const parseDuration = (duration: string): number => {
                            const match = duration.match(/(\d+)/);
                            return match ? parseInt(match[1]) : 0;
                        };

                        // Create an array of grouped sessions with cumulative time
                        const sessionGroups: Array<{ subject: string; sessions: Session[]; cumulativeTime: number }> = [];
                        let cumulativeMinutes = 0;

                        Object.entries(groupedSessions).forEach(([subject, sessions]) => {
                            const groupDuration = sessions.reduce((sum, session) => sum + parseDuration(session.duration), 0);
                            cumulativeMinutes += groupDuration;
                            sessionGroups.push({
                                subject,
                                sessions,
                                cumulativeTime: cumulativeMinutes
                            });
                        });

                        return sessionGroups.map((group, groupIndex) => {
                            const allCompleted = group.sessions.every(s => s.completed === true);
                            const totalDuration = group.sessions.reduce((sum, s) => sum + parseDuration(s.duration), 0);
                            const hasSubjectAssessment = hasAssessment && studyPlan.assessment.bySubject[group.subject];
                            const assessmentCompleted = completedAssessments.has(group.subject);

                            // Determine if we need a break after this group (every 45 minutes)
                            const needsBreak = groupIndex < sessionGroups.length - 1 &&
                                Math.floor(group.cumulativeTime / 45) > Math.floor((group.cumulativeTime - totalDuration) / 45);

                            return (
                                <div key={group.subject}>
                                    <div className={`bg-white rounded-lg shadow-md p-6 relative ${allCompleted ? 'opacity-75 border-2 border-green-500' : ''}`}>
                                        {/* Completed Badge */}
                                        {allCompleted && (
                                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                                                <CheckCircle className="w-4 h-4" />
                                                Completed
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className={`text-xl font-bold ${allCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                    {group.subject}
                                                </h3>
                                                <p className={`text-sm ${allCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {group.sessions.length} material{group.sessions.length > 1 ? 's' : ''}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 ${allCompleted ? 'bg-gray-100 text-gray-600' : 'bg-purple-100 text-purple-800'} rounded-full text-sm font-semibold`}>
                                                {totalDuration} mins
                                            </span>
                                        </div>

                                        {/* Materials List */}
                                        <div className="space-y-4">
                                            {group.sessions.map((session, sessionIndex) => {
                                                const isCompleted = session.completed === true;

                                                return (
                                                    <div
                                                        key={sessionIndex}
                                                        onClick={() => selectMaterial(session.material)}
                                                        className={`border rounded-lg p-4 hover:cursor-pointer hover:border-blue-400 transition-colors ${isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}
                                                    >
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div className="flex-1">
                                                                <h4 className={`font-semibold ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                                    {session.materialTitle}
                                                                </h4>
                                                                <p className={`text-sm ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                    {session.timeSlot}
                                                                </p>
                                                            </div>
                                                            {isCompleted && (
                                                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                                                            )}
                                                        </div>

                                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                                                            <div>
                                                                <p className="text-xs text-gray-500 uppercase">Duration</p>
                                                                <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                    {getDuration(session.duration)} min
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 uppercase">Difficulty</p>
                                                                <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                    {session.difficulty}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-500 uppercase">Focus</p>
                                                                <p className={`text-sm font-semibold ${isCompleted ? 'text-gray-500' : 'text-gray-900'}`}>
                                                                    {session.focusArea.replace('_', ' ')}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <h5 className={`text-xs font-semibold mb-1 uppercase ${isCompleted ? 'text-gray-500' : 'text-gray-700'}`}>
                                                                Objectives:
                                                            </h5>
                                                            <ul className="space-y-1">
                                                                {session.objectives.map((objective, objIndex) => (
                                                                    <li key={objIndex} className="flex items-start">
                                                                        <span className={`mr-2 text-xs ${isCompleted ? 'text-green-500' : 'text-blue-500'}`}>
                                                                            {isCompleted ? '✓' : '•'}
                                                                        </span>
                                                                        <span className={`text-sm ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                                                            {objective}
                                                                        </span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Subject Assessment Button */}
                                        {allCompleted && hasSubjectAssessment && !assessmentCompleted && (
                                            <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <ClipboardCheck className="w-6 h-6 text-purple-600" />
                                                            <h4 className="text-lg font-bold text-gray-900">
                                                                Ready for {group.subject} Assessment?
                                                            </h4>
                                                        </div>
                                                        <p className="text-sm text-gray-600">
                                                            Test your knowledge with {studyPlan.assessment.bySubject[group.subject].length} questions
                                                        </p>
                                                    </div>
                                                    <Button
                                                        onClick={() => setShowAssessment(group.subject)}
                                                        className="bg-purple-600 hover:bg-purple-700 text-white"
                                                    >
                                                        <ClipboardCheck className="w-4 h-4 mr-2" />
                                                        Start Quiz
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Assessment Completed Badge */}
                                        {assessmentCompleted && (
                                            <div className="mt-6 bg-green-50 rounded-lg p-4 border-2 border-green-200">
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                                    <div>
                                                        <p className="font-semibold text-green-900">Assessment Completed!</p>
                                                        <p className="text-sm text-green-700">You&#39;ve finished the {group.subject} quiz</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Break indicator - only after 45 minutes of cumulative study */}
                                    {needsBreak && (
                                        <div className="flex items-center justify-center my-4">
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-6 py-3 text-center">
                                                <p className="text-sm font-semibold text-yellow-800">
                                                    ☕ Break (15 mins) - You&#39;ve studied for {group.cumulativeTime} minutes
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>
            <Dialog.Root open={!!selectedMaterial} onOpenChange={unSelectMaterial}>
                <Dialog.Portal>
                    {/* Overlay */}
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fadeIn" />

                    {/* Dialog Content */}
                    <Dialog.Content
                        className="fixed top-[50%] left-[50%] w-screen max-w-3xl h-[90vh] !max-w-none !w-[70vw] -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg focus:outline-none flex flex-col"
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
                                    <div onClick={handleMarkAsDone} className={"flex justify-end mt-6"}>
                                        <Button>Mark as Finished</Button>
                                    </div>
                                    <ContextualAiChat
                                        subject={selectedMaterial?.subject}
                                        materialTitle={selectedMaterial?.title}
                                        packId={selectedMaterial?.packId}
                                        materialId={selectedMaterial?.id}>
                                    </ContextualAiChat>
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