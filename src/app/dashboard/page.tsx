'use client'

import {Suspense, useEffect, useState} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/tabs";
import {Calendar, Package, Brain, MessageCircle, Trophy, LogOut, User, ChevronDown} from 'lucide-react';
import { PlanTab } from "@/app/dashboard/plan/page";
import { StudyPackTab } from "@/app/dashboard/studyPack/page";
import { QuizzesTab } from "@/app/dashboard/quizzes/page";
import { StudentAIChat } from "@/app/dashboard/chat/page";
import { useRouter, useSearchParams } from "next/navigation";
import { ProgressData } from "@/hooks/useProgress";
import {onAuthStateChanged, signOut} from "firebase/auth";
import { auth } from "@/lib/firebase";
import Spinner from "@/app/components/Spinner";
import { useMoodChecker } from "@/hooks/useMoodChecker";
import { MoodChecker } from "@/app/dashboard/MoodChecker";
import { useDashboard } from "@/contexts/DashboardContext";
import UserBadges from "@/app/dashboard/challenges/UserBadges";
import {Button} from "@/app/components/button";
import FriendsPage from "@/app/dashboard/friends/page";
import ProfilePage from "@/app/dashboard/profile/page";


function Dashboard() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('plan');
    const router = useRouter();
    const [idToken, setIdToken] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ProgressData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);

    const { dashboardData, loading: dashboardLoading } = useDashboard();
    const { shouldShow: showMoodChecker, loading: moodLoading, submitMood, closeMoodChecker } = useMoodChecker(idToken || null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/auth/login");
                return;
            }
            // TODO: uncomment this before deployment
            // if (!currentUser.emailVerified){
            //     router.push("/verify-email");
            //     return;
            // }

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

    useEffect(() => {
        if (dashboardData?.studyPacks.length === 0) {
            setActiveTab("studypack");
        }
    }, [dashboardData]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        const newUrl = `/dashboard?tab=${value}`;
        router.replace(newUrl);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push("auth/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    if (loading || moodLoading || dashboardLoading) {
        return <Spinner />;
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
                                    {dashboardData.streak.currentStreak > 2 &&
                                        <div className="text-xs text-gray-500">Keep it up!</div>
                                    }
                                </div>
                            </div>
                        )}

                        {/* Dropdown Menu */}
                        <div className="relative hover:cursor-pointer">
                            <Button
                                onClick={() => setShowDropdown(!showDropdown)}
                                variant="outline"
                                className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200 rounded-full px-4 py-2 transition-all"
                            >
                                <User className="w-5 h-5 text-gray-700" />
                                <ChevronDown className={`w-4 h-4 text-gray-700 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                            </Button>

                            {showDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            handleTabChange('profile');
                                        }}
                                        className="w-full hover:cursor-pointer text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700"
                                    >
                                        <User className="w-4 h-4" />
                                        <span>Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowDropdown(false);
                                            handleLogout();
                                        }}
                                        className="w-full hover:cursor-pointer text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Logout</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                        Error loading progress: {error}
                    </div>
                )}
                {!showMoodChecker &&
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                        <TabsList
                            className="
                                flex w-full flex-wrap
                                h-auto !flex-shrink-0 items-start
                                bg-white rounded-xl shadow-sm border border-gray-200
                              "
                        >
                            <TabsTrigger
                                value="plan"
                                className="data-[state=active]:bg-gradient-to-r hover:cursor-pointer data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                            >
                                <Calendar className="w-4 h-4" /> My Plan
                            </TabsTrigger>
                            <TabsTrigger
                                value="studypack"
                                className="data-[state=active]:bg-gradient-to-r hover:cursor-pointer data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                            >
                                <Package className="w-4 h-4" /> Study Pack
                            </TabsTrigger>
                            <TabsTrigger
                                value="quizzes"
                                className="data-[state=active]:bg-gradient-to-r hover:cursor-pointer data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                            >
                                <Brain className="w-4 h-4" /> Quizzes
                            </TabsTrigger>
                            <TabsTrigger
                                value="tutor"
                                className="data-[state=active]:bg-gradient-to-r hover:cursor-pointer data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                            >
                                <MessageCircle className="w-4 h-4" /> AI Tutor
                            </TabsTrigger>
                            <TabsTrigger
                                value="challenges"
                                className="data-[state=active]:bg-gradient-to-r hover:cursor-pointer data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                            >
                                <Trophy className="w-4 h-4" /> Challenges
                            </TabsTrigger>
                            <TabsTrigger
                                value="friends"
                                className="data-[state=active]:bg-gradient-to-r hover:cursor-pointer data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                            >
                                <Trophy className="w-4 h-4" /> Friends
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="plan">
                            <PlanTab subjects={subjects} studyPack={dashboardData?.studyPacks.length || 0}/>
                        </TabsContent>

                        <TabsContent value="studypack">
                            <StudyPackTab />
                        </TabsContent>

                        <TabsContent value="quizzes">
                            <QuizzesTab studyPack={dashboardData?.studyPacks.length || 0}/>
                        </TabsContent>

                        <TabsContent value="tutor">
                            <div className={'w-[80%] mx-auto'}>
                                <StudentAIChat />
                            </div>
                        </TabsContent>

                        <TabsContent value="challenges">
                            <UserBadges></UserBadges>
                        </TabsContent>

                        <TabsContent value="friends">
                            <FriendsPage></FriendsPage>
                        </TabsContent>

                        <TabsContent value="profile">
                            <ProfilePage />
                        </TabsContent>
                    </Tabs>
                }
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
            <Dashboard />
        </Suspense>
    );
}