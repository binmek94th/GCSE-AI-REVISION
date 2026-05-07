'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Target, Award, Lightbulb, X } from 'lucide-react';
import { Badge } from "@/app/components/ui/badge";
import StudyPlan from "@/app/dashboard/plan/StudyPlan";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const NOTICE_KEY = 'weak_area_notice_dismissed';

interface Subject {
    name: string;
    progress: number;
    grade: string;
}

interface PlanTabProps {
    subjects: Subject[];
    studyPack: number;
}

function PlanTab({ subjects, studyPack }: PlanTabProps) {
    const router = useRouter();
    const [showNotice, setShowNotice] = useState(false);

    // Read dismissal state after mount (avoids SSR mismatch)
    useEffect(() => {
        const dismissed = localStorage.getItem(NOTICE_KEY);
        if (!dismissed) setShowNotice(true);
    }, []);

    const dismissNotice = () => {
        localStorage.setItem(NOTICE_KEY, 'true');
        setShowNotice(false);
    };

    const handleClick = () => {
        router.push(`/dashboard?tab=studypack`);
    };

    if (studyPack === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-600">No subjects found. Please add study packs to see your progress.</p>
                <Button onClick={handleClick}>Browse Study Packs</Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Dismissible weak-area notice */}
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

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Award className="w-5 h-5 text-purple-600" />
                            Progress Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {subjects.map((subject, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700">
                                        {subject.name
                                            .replace(/_/g, " ")
                                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                        {subject.grade}
                                    </Badge>
                                </div>
                                <Progress value={subject.progress} className="h-2" />
                                <p className="text-xs text-gray-500">{subject.progress}% complete</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default PlanTab;