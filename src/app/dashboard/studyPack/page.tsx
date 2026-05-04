'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Spinner from "@/app/components/ui/Spinner";
import StudyMaterialTab from "@/app/dashboard/study_materials/StudyMaterialTab";

interface Subject {
    id: string;
    subject: string;
    examBoard: string;
    progress: number;
    enrolled: boolean;
    practiceQuestions: string;
    chapters: number;
    pastPapers: string;
    videoLessons: string;
}

function StudyPackTab() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [packId, setPackId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const paramPackId = searchParams.get("packId");
        if (paramPackId) setPackId(paramPackId);
    }, [searchParams]);

    useEffect(() => {
        const enrollIfNeeded = async () => {
            if (!packId) return;

            const subject = subjects.find(s => s.id === packId);
            if (!subject || subject.enrolled) return;

            try {
                const user = auth.currentUser;
                if (!user) return;

                const idToken = await user.getIdToken();

                await fetch('/api/enroll-subject', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        subject: subject.subject,
                        examBoard: subject.examBoard,
                        subjectId: subject.id,
                    }),
                });
                setSubjects(prev =>
                    prev.map(s =>
                        s.id === subject.id ? { ...s, enrolled: true } : s
                    )
                );

            } catch (err) {
                console.error('Auto enroll failed:', err);
            }
        };

        enrollIfNeeded();
    }, [packId, subjects]);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/auth/login");
                return;
            }

            try {
                const idToken = await currentUser.getIdToken();
                const res = await fetch("/api/study-packs", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                const data = await res.json();

                if (res.ok) {
                    setSubjects(data);
                } else {
                    console.error(data.error);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) return <Spinner />;

    const selectPack = async (subject: Subject) => {
        try {
            const user = auth.currentUser;
            if (user) {
                const idToken = await user.getIdToken();
                await fetch('/api/enroll-subject', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        subject: subject.subject,
                        examBoard: subject.examBoard,
                        subjectId: subject.id,
                    }),
                });
                if (!subject.enrolled) {
                    setSubjects(prev =>
                        prev.map(s => s.id === subject.id ? { ...s, enrolled: true } : s)
                    );
                }
            }
        } catch (err) {
            console.error('Failed to open subject:', err);
        }

        setPackId(subject.id);
        const params = new URLSearchParams(searchParams.toString());
        params.set("packId", subject.id);
        router.push(`?${params.toString()}`);
    };

    const unSelectPack = () => {
        setPackId(null);
        const params = new URLSearchParams(searchParams.toString());
        params.delete("packId");
        router.push(`?${params.toString()}`);
    };

    if (packId) {
        return <StudyMaterialTab unSelectPack={unSelectPack} packId={packId} />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>{subject.subject}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Study Notes</span><span>{subject.chapters}</span></div>
                            <div className="flex justify-between"><span>Practice Questions</span><span>{subject.practiceQuestions}</span></div>
                            <div className="flex justify-between"><span>Past Papers</span><span>{subject.pastPapers}</span></div>
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={() => selectPack(subject)}
                                size="sm"
                                className="flex items-center gap-1.5 bg-green-500 text-white hover:bg-green-600"
                            >
                                <BookOpen className="w-3.5 h-3.5" />
                                Open
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default StudyPackTab;