'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/card";
import { Button } from "@/app/components/button";
import { Progress } from "@/app/components/progress";
import { Target, Award } from 'lucide-react';
import { Badge } from "@/app/components/badge";
import StudyPlan from "@/app/dashboard/plan/StudyPlan";
import {useRouter} from "next/navigation";

interface Subject {
    name: string;
    progress: number;
    grade: string;
}

interface PlanTabProps {
    subjects: Subject[];
    studyPack: number;
}

export function PlanTab({ subjects, studyPack }: PlanTabProps) {
    const router = useRouter()

    const handleClick = () => {
        router.push(`/studypack/${studyPack}`);
    }

    if (studyPack === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-600">No subjects found. Please add study packs to see your progress.</p>
                <Button onClick={handleClick}>
                    Browse Study Packs
                </Button>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Today&#39;s Study Plan
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <StudyPlan></StudyPlan>
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
                                  .replace(/_/g, " ") // replace underscores with spaces
                                  .replace(/\b\w/g, (c) => c.toUpperCase()) // capitalize first letter of each word
                              }
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
    );
}
