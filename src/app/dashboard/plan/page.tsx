'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Target, Award, Lightbulb, X, Brain } from 'lucide-react';
import { Badge } from "@/app/components/ui/badge";
import StudyPlan from "@/app/dashboard/plan/StudyPlan";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";

const NOTICE_KEY = 'weak_area_notice_dismissed';

interface Subject {
    name: string;
    progress: number;
    grade: string;
}

interface SubjectQuizStat {
    total: number;
    correct: number;
    accuracy: number;
}

interface PlanTabProps {
    subjects: Subject[];
    studyPack: number;
}

function PlanTab({ subjects, studyPack }: PlanTabProps) {
    const router = useRouter();
    const [showNotice, setShowNotice] = useState(false);
    const [quizStats, setQuizStats] = useState<Record<string, SubjectQuizStat>>({});

    useEffect(() => {
        const dismissed = localStorage.getItem(NOTICE_KEY);
        if (!dismissed) setShowNotice(true);
    }, []);

    // Fetch quiz accuracy per subject from /api/profile
    useEffect(() => {
        const fetchQuizStats = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/profile', {
                    headers: { Authorization: `Bearer ${idToken}` },
                });
                if (!res.ok) return;
                const data = await res.json();
                setQuizStats(data?.stats?.subjectProgress ?? {});
            } catch (err) {
                console.error('Failed to fetch quiz stats:', err);
            }
        };
        fetchQuizStats();
    }, []);

    const dismissNotice = () => {
        localStorage.setItem(NOTICE_KEY, 'true');
        setShowNotice(false);
    };

    if (studyPack === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-600">No subjects found. Please add study packs to see your progress.</p>
                <Button onClick={() => router.push('/dashboard?tab=studypack')}>Browse Study Packs</Button>
            </div>
        );
    }

    /**
     * Find quiz stats for a subject by doing a case-insensitive substring match.
     * The profile uses keys like "biology", the subject name might be "Biology".
     */
    const findQuizStat = (subjectName: string): SubjectQuizStat | null => {
        const key = subjectName.toLowerCase().replace(/\s+/g, '_');
        // Exact match first
        if (quizStats[key]) return quizStats[key];
        // Partial match fallback
        const match = Object.entries(quizStats).find(([k]) =>
            k.includes(key) || key.includes(k)
        );
        return match ? match[1] : null;
    };

    return (
        <div className="space-y-4">
            {showNotice && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <p className="text-sm text-amber-800 flex-1">
                        Your plan includes materials covering topics where you answered questions incorrectly — so you can strengthen those areas first.
                    </p>
                    <button
                        onClick={dismissNotice}
                        aria-label="Dismiss notice"
                        className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Study plan */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Target className="w-5 h-5 text-blue-600" />
                            Today&#39;s Study Plan
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <StudyPlan />
                    </CardContent>
                </Card>

                {/* Progress overview */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-600" />
                            Progress Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        {subjects.map((subject, index) => {
                            const displayName = subject.name
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, c => c.toUpperCase());

                            const quiz = findQuizStat(subject.name);

                            return (
                                <div key={index} className="space-y-2">
                                    {/* Subject name + grade */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">{displayName}</span>
                                        <Badge variant="outline" className="text-xs">{subject.grade}</Badge>
                                    </div>

                                    {/* Material completion bar */}
                                    <div className="space-y-1">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-400">Materials</span>
                                            <span className="text-xs text-gray-500">{subject.progress}%</span>
                                        </div>
                                        <Progress value={subject.progress} className="h-1.5" />
                                    </div>

                                    {/* Quiz accuracy bar — only shown if data exists */}
                                    {quiz && quiz.total > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Brain className="w-3 h-3" /> Quiz accuracy
                                                </span>
                                                <span className={`text-xs font-medium ${
                                                    quiz.accuracy >= 70 ? 'text-green-600' :
                                                        quiz.accuracy >= 50 ? 'text-yellow-600' :
                                                            'text-red-500'
                                                }`}>
                                                    {quiz.accuracy}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${
                                                        quiz.accuracy >= 70 ? 'bg-green-500' :
                                                            quiz.accuracy >= 50 ? 'bg-yellow-400' :
                                                                'bg-red-400'
                                                    }`}
                                                    style={{ width: `${quiz.accuracy}%` }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                {quiz.correct}/{quiz.total} questions correct
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default PlanTab;