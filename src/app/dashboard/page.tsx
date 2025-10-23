'use client'

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/tabs";
import { Calendar, Package, Brain, MessageCircle, Trophy } from 'lucide-react';
import { PlanTab } from "@/app/dashboard/plan/page";
import { StudyPackTab } from "@/app/dashboard/studyPack/page";
import { QuizzesTab } from "@/app/dashboard/quizzes/page";
import { StudentAIChat } from "@/app/dashboard/chat/page";
import { useRouter, useSearchParams } from "next/navigation";
import { ProgressData } from "@/hooks/useProgress";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Spinner from "@/app/components/Spinner";
import { useMoodChecker } from "@/hooks/useMoodChecker";
import { MoodChecker } from "@/app/dashboard/MoodChecker";
import { useDashboard } from "@/contexts/DashboardContext";
import UserBadges from "@/app/dashboard/challenges/UserBadges";


function Dashboard() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('plan');
    const router = useRouter();
    const [idToken, setIdToken] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ProgressData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { dashboardData, loading: dashboardLoading, incrementStreak } = useDashboard();
    const { shouldShow: showMoodChecker, loading: moodLoading, submitMood, closeMoodChecker } = useMoodChecker(idToken || null);


    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/auth/login");
                return;
            }

            const token = await currentUser.getIdToken();
            setIdToken(token);

            try {
                setLoading(true);
                const response = await fetch("/api/progress", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || "Failed to fetch progress");
                }

                const progressData = await response.json();
                setData(progressData);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
                setData(null);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const subjects = data?.subjects.map(subject => ({
        name: subject.subjectName,
        progress: subject.progress,
        grade: subject.grade,
        totalMaterials: subject.totalMaterials,
        finishedMaterials: subject.finishedMaterials
    })) || [];

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const newUrl = `/dashboard?tab=${value}`;
        router.replace(newUrl);
    };

    if (loading || moodLoading || dashboardLoading) {
        return <Spinner />;
    }

    if (dashboardData?.studyPacks.length === 0) {
        setActiveTab("studypack");
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            {showMoodChecker &&
                <MoodChecker
                    onClose={closeMoodChecker}
                    onSubmit={submitMood}
                />
            }
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl text-gray-900 mb-2">Welcome back, Alex! 👋</h1>
                        <p className="text-gray-600">Ready to ace your GCSEs? Let&#39;s continue your journey.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Use streak from dashboard context */}
                        {dashboardData && (
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                                <span className="text-2xl">🔥</span>
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {dashboardData.streak.currentStreak} Day Streak
                                    </div>
                                    <div className="text-xs text-gray-500">Keep it up!</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        Error loading progress: {error}
                    </div>
                )}
                {!showMoodChecker &&
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                        <TabsList className="grid w-full grid-cols-5 bg-white rounded-xl shadow-sm border border-gray-200">
                            <TabsTrigger value="plan">
                                <Calendar className="w-4 h-4" /> My Plan
                            </TabsTrigger>
                            <TabsTrigger value="studypack">
                                <Package className="w-4 h-4" /> Study Pack
                            </TabsTrigger>
                            <TabsTrigger value="quizzes">
                                <Brain className="w-4 h-4" /> Quizzes
                            </TabsTrigger>
                            <TabsTrigger value="tutor">
                                <MessageCircle className="w-4 h-4" /> AI Tutor
                            </TabsTrigger>
                            <TabsTrigger value="challenges">
                                <Trophy className="w-4 h-4" /> Challenges
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="plan">
                            <PlanTab subjects={subjects} studyPack={dashboardData?.studyPacks.length || 0}/>
                        </TabsContent>

                        <TabsContent value="studypack">
                            <StudyPackTab />
                        </TabsContent>

                        <TabsContent value="quizzes">
                            <QuizzesTab />
                        </TabsContent>

                        <TabsContent value="tutor">
                            <div className={'w-[80%] mx-auto'}>
                                <StudentAIChat />
                            </div>
                        </TabsContent>

                        <TabsContent value="challenges">
                            <UserBadges></UserBadges>
                        </TabsContent>
                    </Tabs>
                }
            </div>
        </div>
    );
}

export default Dashboard;