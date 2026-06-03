'use client'

import { Suspense, useEffect, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import {
    Calendar, Brain, TestTube, MessageCircle, LogOut, User, ChevronDown,
    Upload, BookOpen, AlertCircle, Package, Trophy, MoreHorizontal
} from 'lucide-react';
import PlanTab from "@/app/dashboard/plan/page";
import StudyPackTab from "@/app/dashboard/studyPack/page";
import QuizzesTab from "@/app/dashboard/quizzes/page";
import StudentAIChat from "@/app/dashboard/chat/page";
import { useRouter, useSearchParams } from "next/navigation";
import { ProgressData } from "@/hooks/useProgress";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import Spinner from "@/app/components/ui/Spinner";
import { MOOD_MESSAGES, useMoodChecker } from "@/hooks/useMoodChecker";
import { MoodChecker } from "@/app/dashboard/MoodChecker";
import { useDashboard } from "@/contexts/DashboardContext";
import UserBadges from "@/app/dashboard/challenges/UserBadges";
import { Button } from "@/app/components/ui/button";
import FriendsPage from "@/app/dashboard/friends/page";
import ProfilePage from "@/app/dashboard/profile/page";
import MockTests from "@/app/dashboard/mock-exam/page";
import { doc, getDoc } from "@firebase/firestore";
import { GatedFeature } from "@/app/components/GatedFeature";
import { toast } from "sonner";
import UploadTab from "@/app/dashboard/upload/UploadTab";
import GeneratedMaterialsListPage from "@/app/dashboard/generated_material/page";
import MistakeBankTab from "@/app/dashboard/mistake-bank/MistakeBank";

// Tabs always visible on desktop; on mobile only "plan" shows in the bar —
// everything else collapses into the More dropdown.
const MORE_TABS = ['studypack', 'my-materials', 'challenges', 'friends', 'profile'];
const MORE_ITEMS = [
    { value: 'studypack',    icon: Package,  label: 'Study Packs' },
    { value: 'my-materials', icon: BookOpen, label: 'My Materials' },
    { value: 'challenges',   icon: Trophy,   label: 'Challenges' },
    { value: 'friends',      icon: Trophy,   label: 'Friends' },
    { value: 'profile',      icon: User,     label: 'Profile' },
];

// On mobile these tabs collapse into "More"; on desktop they appear in the bar.
const MOBILE_MORE_TABS = ['quizzes', 'mocktests', 'mistakes', 'tutor', 'upload', ...MORE_TABS];
const MOBILE_MORE_ITEMS = [
    { value: 'quizzes',      icon: Brain,          label: 'Quizzes' },
    { value: 'mocktests',    icon: TestTube,        label: 'Mocks' },
    { value: 'mistakes',     icon: AlertCircle,     label: 'Retry Failed' },
    { value: 'tutor',        icon: MessageCircle,   label: 'Tutor' },
    { value: 'upload',       icon: Upload,          label: 'Upload' },
    ...MORE_ITEMS,
];

const TAB_CLASS =
    "flex-1 flex items-center justify-center gap-1.5 text-sm data-[state=active]:bg-gradient-to-r hover:cursor-pointer " +
    "data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 " +
    "data-[state=active]:text-white data-[state=active]:shadow-md transition-all";

function Dashboard() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('plan');
    const router = useRouter();
    const [idToken, setIdToken] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<ProgressData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [showMoreDropdown, setShowMoreDropdown] = useState(false);
    const moreRef = useRef<HTMLDivElement>(null);

    const { dashboardData, loading: dashboardLoading } = useDashboard();
    const { shouldShow: showMoodChecker, loading: moodLoading, submitMood, closeMoodChecker } = useMoodChecker(idToken || null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
                setShowMoreDropdown(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSubmitMood = async (mood: string) => {
        try {
            const submittedMood = await submitMood(mood);
            const { emoji, message } = MOOD_MESSAGES[submittedMood ?? ''] ?? {
                emoji: "✅",
                message: "Mood saved! Your study plan has been adjusted for today.",
            };
            toast(
                <div className="flex flex-col gap-1">
                    <p className="font-semibold text-sm text-gray-900">{emoji} Your study plan&#39;s been updated!</p>
                    <p className="text-sm text-gray-700 leading-snug">{message}</p>
                </div>,
                { duration: 5000 }
            );
        } catch {
            toast.error('Failed to submit mood');
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            console.log(currentUser);
            if (!currentUser) { router.push("/auth/login"); return; }
            if (!currentUser.emailVerified) { router.push("/verify-email"); return; }

            const userRef = doc(db, "users", currentUser.uid);
            const userSnap = await getDoc(userRef);
            if (!(userSnap.data() as any).onboardingComplete) {
                router.push("/onboarding");
            }

            const token = await currentUser.getIdToken();
            setIdToken(token);

            try {
                setLoading(true);
                const response = await fetch("/api/progress", {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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
        finishedMaterials: subject.finishedMaterials,
    })) || [];

    useEffect(() => {
        const tabParam = searchParams.get("tab");
        if (tabParam) setActiveTab(tabParam);
    }, [searchParams]);

    useEffect(() => {
        if (dashboardData?.studyPacks.length === 0) setActiveTab("studypack");
    }, [dashboardData]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setShowMoreDropdown(false);
        router.replace(`/dashboard?tab=${value}`);
    };

    const handleLogout = async () => {
        try { await signOut(auth); router.push("auth/login"); }
        catch (err) { console.error("Logout failed:", err); }
    };

    if (loading || moodLoading || dashboardLoading) return <Spinner />;

    // Desktop: only the old MORE_TABS are "more-active"
    // Mobile:  all MOBILE_MORE_TABS are "more-active"
    const isDesktopMoreActive = MORE_TABS.includes(activeTab);
    const isMobileMoreActive  = MOBILE_MORE_TABS.includes(activeTab);

    const desktopActiveMoreLabel = MORE_ITEMS.find(i => i.value === activeTab)?.label;
    const mobileActiveMoreLabel  = MOBILE_MORE_ITEMS.find(i => i.value === activeTab)?.label;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            {showMoodChecker && <MoodChecker onClose={closeMoodChecker} onSubmit={handleSubmitMood} />}

            <div className="max-w-7xl mx-auto">
                {/* ── Top bar ── */}
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl text-gray-900 mb-2">Welcome back! 👋</h1>
                        <p className="text-gray-600">Ready to ace your GCSEs? Let&#39;s continue your journey.</p>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {dashboardData?.examBoard && (
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Exam Board</span>
                                <span className="text-sm font-bold text-indigo-600">{dashboardData.examBoard}</span>
                            </div>
                        )}

                        {dashboardData && (
                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
                                <span className="text-2xl">🔥</span>
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{dashboardData.streak.currentStreak} Day Streak</div>
                                    {dashboardData.streak.currentStreak > 2 && <div className="text-xs text-gray-500">Keep it up!</div>}
                                </div>
                            </div>
                        )}

                        <div className="relative">
                            <Button
                                onClick={() => setShowProfileDropdown(v => !v)}
                                variant="outline"
                                className="flex items-center gap-2 bg-white hover:bg-gray-50 border-gray-200 rounded-full px-4 py-2 transition-all"
                            >
                                <User className="w-5 h-5 text-gray-700" />
                                <ChevronDown className={`w-4 h-4 text-gray-700 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                            </Button>
                            {showProfileDropdown && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                                    <button onClick={() => { setShowProfileDropdown(false); handleTabChange('profile'); }}
                                            className="w-full text-left px-4 py-2 hover:bg-gray-50 transition-colors flex items-center gap-2 text-gray-700 text-sm">
                                        <User className="w-4 h-4" /><span>Profile</span>
                                    </button>
                                    <button onClick={() => { setShowProfileDropdown(false); handleLogout(); }}
                                            className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 text-sm">
                                        <LogOut className="w-4 h-4" /><span>Logout</span>
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

                {!showMoodChecker && (
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">

                        {/*
                            Nav bar — outer div must NOT clip overflow so the
                            absolutely-positioned More dropdown isn't cut off.
                        */}
                        <div className="flex items-center gap-1 bg-white rounded-xl shadow-sm border border-gray-200 px-2 py-1">

                            {/* Scrollable tab strip */}
                            <div className="flex-1 overflow-x-auto [overflow-y:visible] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                                <TabsList className="flex h-auto bg-transparent p-0 gap-0 w-full items-center">

                                    {/* Plan — always visible on all screen sizes */}
                                    <TabsTrigger value="plan" className={TAB_CLASS}>
                                        <Calendar className="w-4 h-4" />
                                        <span>Plan</span>
                                    </TabsTrigger>

                                    {/* ── Desktop-only tabs (hidden on mobile) ── */}
                                    <span className="hidden sm:block w-px h-5 bg-gray-200 self-center mx-1.5" />
                                    <span className="hidden sm:flex text-xs text-gray-400 font-medium self-center pr-1 select-none">Practice</span>

                                    <TabsTrigger value="quizzes" className={`${TAB_CLASS} hidden sm:flex`}>
                                        <Brain className="w-4 h-4" /> Quizzes
                                    </TabsTrigger>

                                    <TabsTrigger value="mocktests" className={`${TAB_CLASS} hidden sm:flex`}>
                                        <TestTube className="w-4 h-4" /> Mocks
                                    </TabsTrigger>

                                    <TabsTrigger value="mistakes" className={`${TAB_CLASS} hidden sm:flex`}>
                                        <AlertCircle className="w-4 h-4" /> Retry Failed
                                    </TabsTrigger>

                                    <span className="hidden sm:block w-px h-5 bg-gray-200 self-center mx-1.5" />

                                    <TabsTrigger value="tutor" className={`${TAB_CLASS} hidden sm:flex`}>
                                        <MessageCircle className="w-4 h-4" /> Tutor
                                    </TabsTrigger>

                                    <span className="hidden sm:block w-px h-5 bg-gray-200 self-center mx-1.5" />

                                    <TabsTrigger value="upload" className={`${TAB_CLASS} hidden sm:flex`}>
                                        <Upload className="w-4 h-4" /> Upload
                                    </TabsTrigger>

                                </TabsList>
                            </div>

                            <span className="w-px h-5 bg-gray-200 shrink-0 mx-1" />

                            {/* ── More dropdown ──
                                On desktop: shows the old MORE_TABS (studypack, my-materials, etc.)
                                On mobile:  shows ALL collapsed tabs via MOBILE_MORE_ITEMS
                            */}
                            <div className="relative shrink-0" ref={moreRef}>
                                <button
                                    onClick={() => setShowMoreDropdown(v => !v)}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                                        ${
                                        // active styles: mobile uses broader set, desktop uses narrower set
                                        (isMobileMoreActive)  // isMobileMoreActive is a superset so covers both
                                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                    {/* Label: show active tab name when a collapsed tab is active */}
                                    <span>
                                        {isMobileMoreActive
                                            ? (mobileActiveMoreLabel ?? desktopActiveMoreLabel ?? 'More')
                                            : 'More'}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMoreDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {showMoreDropdown && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-50">
                                        {/*
                                            Mobile: render ALL MOBILE_MORE_ITEMS
                                            Desktop: render only MORE_ITEMS
                                            We achieve this with sm: visibility classes on two separate lists.
                                        */}

                                        {/* Mobile list */}
                                        <div className="sm:hidden">
                                            {MOBILE_MORE_ITEMS.map(({ value, icon: Icon, label }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => handleTabChange(value)}
                                                    className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors
                                                        ${activeTab === value
                                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                                        : 'text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <Icon className="w-4 h-4 shrink-0" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Desktop list */}
                                        <div className="hidden sm:block">
                                            {MORE_ITEMS.map(({ value, icon: Icon, label }) => (
                                                <button
                                                    key={value}
                                                    onClick={() => handleTabChange(value)}
                                                    className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 text-sm transition-colors
                                                        ${activeTab === value
                                                        ? 'bg-blue-50 text-blue-700 font-semibold'
                                                        : 'text-gray-700 hover:bg-gray-50'}`}
                                                >
                                                    <Icon className="w-4 h-4 shrink-0" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Tab content (unchanged) ── */}
                        <TabsContent value="plan">
                            <GatedFeature featureName="Study Plans">
                                <PlanTab subjects={subjects} studyPack={dashboardData?.studyPacks.length || 0} />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="studypack">
                            <GatedFeature featureName="Study packs">
                                <StudyPackTab />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="quizzes">
                            <GatedFeature featureName="Quizzes">
                                <QuizzesTab studyPack={dashboardData?.studyPacks.length || 0} />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="tutor">
                            <GatedFeature featureName="Tutors">
                                <div className="w-[80%] mx-auto">
                                    <StudentAIChat />
                                </div>
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="mocktests">
                            <GatedFeature featureName="Mock Tests">
                                <div className="w-full mx-auto">
                                    <MockTests initialPacks={dashboardData?.studyPacks} studyPack={dashboardData?.studyPacks.length} />
                                </div>
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="upload">
                            <GatedFeature featureName="Upload Material">
                                <UploadTab />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="my-materials">
                            <GatedFeature featureName="My Materials">
                                <GeneratedMaterialsListPage />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="mistakes">
                            <GatedFeature featureName="Mistake Bank">
                                <MistakeBankTab />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="challenges">
                            <GatedFeature featureName="Challenges">
                                <UserBadges />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="friends">
                            <GatedFeature featureName="Friends">
                                <FriendsPage />
                            </GatedFeature>
                        </TabsContent>

                        <TabsContent value="profile">
                            <ProfilePage />
                        </TabsContent>
                    </Tabs>
                )}
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