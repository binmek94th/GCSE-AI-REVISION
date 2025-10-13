'use client'

import {useEffect, useState} from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/tabs";
import { Calendar, Package, Brain, MessageCircle, Trophy, Flame } from 'lucide-react';
import { Badge } from "@/app/components/badge";

import { PlanTab } from "@/app/dashboard/plan/page";
import { StudyPackTab } from "@/app/dashboard/studyPack/page";
import { QuizzesTab } from "@/app/dashboard/quizzes/page";
import {StudentAIChat} from "@/app/dashboard/chat/page";
import {useRouter, useSearchParams} from "next/navigation";



const ChallengesTab = () => (
    <div className="p-4 text-gray-600">Challenges Tab Placeholder</div>
);

function Dashboard() {
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('plan');
    const router = useRouter();

    const subjects = [
        { name: 'Mathematics', progress: 75, grade: 'A*', color: 'bg-blue-500' },
        { name: 'English Language', progress: 60, grade: 'A', color: 'bg-emerald-500' },
        { name: 'Chemistry', progress: 45, grade: 'B', color: 'bg-purple-500' },
        { name: 'Biology', progress: 80, grade: 'A*', color: 'bg-orange-500' },
        { name: 'Physics', progress: 55, grade: 'B', color: 'bg-indigo-500' },
    ];

    const recentQuizzes = [
        { subject: 'Math - Algebra', score: 92, date: '2 hours ago' },
        { subject: 'English - Poetry', score: 87, date: '1 day ago' },
        { subject: 'Chemistry - Acids', score: 78, date: '2 days ago' },
    ];

    const onNavigate = (tab: string) => {
        setActiveTab(tab);
    };

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl text-gray-900 mb-2">Welcome back, Alex! 👋</h1>
                        <p className="text-gray-600">Ready to ace your GCSEs? Let&#39;s continue your journey.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full">
                            <Flame className="w-4 h-4" />
                            <span>7-day streak!</span>
                        </div>
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            Level 12
                        </Badge>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-5 bg-white rounded-xl shadow-sm border border-gray-200">
                        <TabsTrigger value="plan"> <Calendar className="w-4 h-4" /> My Plan </TabsTrigger>
                        <TabsTrigger value="studypack"> <Package className="w-4 h-4" /> Study Pack </TabsTrigger>
                        <TabsTrigger value="quizzes"> <Brain className="w-4 h-4" /> Quizzes </TabsTrigger>
                        <TabsTrigger value="tutor"> <MessageCircle className="w-4 h-4" /> AI Tutor </TabsTrigger>
                        <TabsTrigger value="challenges"> <Trophy className="w-4 h-4" /> Challenges </TabsTrigger>
                    </TabsList>

                    <TabsContent value="plan">
                        <PlanTab subjects={subjects} />
                    </TabsContent>

                    <TabsContent value="studypack">
                        <StudyPackTab/>
                    </TabsContent>

                    <TabsContent value="quizzes">
                        <QuizzesTab recentQuizzes={recentQuizzes} onNavigate={() => onNavigate('quizzes')} />
                    </TabsContent>

                    <TabsContent value="tutor">
                        <div className={'w-[80%] mx-auto'}>
                            <StudentAIChat />
                        </div>
                    </TabsContent>

                    <TabsContent value="challenges">
                        <ChallengesTab />
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

export default Dashboard;
