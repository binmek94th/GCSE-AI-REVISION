'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { BookOpen, Plus, Check, Loader2, UserMinus } from 'lucide-react';
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
    exam_board: string;
    tier: string;
    progress: number;
    enrolled: boolean;
    practiceQuestions: string;
    chapters: number;
    pastPapers: string;
    videoLessons: string;
}

function TierBadge({ tier }: { tier: string }) {
    if (!tier || tier === 'Untiered') return null;
    const styles: Record<string, string> = {
        'Higher Tier':     'bg-blue-50 text-blue-700 border-blue-200',
        'Foundation Tier': 'bg-orange-50 text-orange-700 border-orange-200',
        'NEA':             'bg-purple-50 text-purple-700 border-purple-200',
    };
    const cls = styles[tier] ?? 'bg-gray-50 text-gray-600 border-gray-200';
    return (
        <span className={`text-xs font-normal px-2 py-0.5 rounded-full border ${cls}`}>
            {tier}
        </span>
    );
}

function StudyPackTab() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const [enrollingIds, setEnrollingIds] = useState<Set<string>>(new Set());
    const [unenrollingIds, setUnenrollingIds] = useState<Set<string>>(new Set());
    const router = useRouter();
    const [packId, setPackId] = useState<string | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        const paramPackId = searchParams.get("packId");
        if (paramPackId) setPackId(paramPackId);
    }, [searchParams]);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) { router.push("/auth/login"); return; }
            try {
                const idToken = await currentUser.getIdToken();
                const res = await fetch("/api/study-packs", {
                    method: "GET",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                });
                const data = await res.json();
                if (res.ok) setSubjects(data);
                else console.error(data.error);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [router]);

    if (loading) return <Spinner />;

    const handleEnroll = async (subject: Subject) => {
        if (subject.enrolled || enrollingIds.has(subject.id)) return;
        setEnrollingIds(prev => new Set(prev).add(subject.id));
        try {
            const user = auth.currentUser;
            if (!user) return;
            const idToken = await user.getIdToken();
            const res = await fetch('/api/enroll-subject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({
                    subject: subject.subject,
                    examBoard: subject.exam_board ?? subject.examBoard,
                    subjectId: subject.id,
                }),
            });
            if (res.ok) setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, enrolled: true } : s));
            else console.error('Enroll failed:', await res.json());
        } catch (err) {
            console.error('Failed to enroll subject:', err);
        } finally {
            setEnrollingIds(prev => { const next = new Set(prev); next.delete(subject.id); return next; });
        }
    };

    const handleUnenroll = async (subject: Subject) => {
        if (!subject.enrolled || unenrollingIds.has(subject.id)) return;
        setUnenrollingIds(prev => new Set(prev).add(subject.id));
        try {
            const user = auth.currentUser;
            if (!user) return;
            const idToken = await user.getIdToken();
            const res = await fetch('/api/unenroll-subject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ subjectId: subject.id }),
            });
            if (res.ok) setSubjects(prev => prev.map(s => s.id === subject.id ? { ...s, enrolled: false } : s));
            else console.error('Unenroll failed:', await res.json());
        } catch (err) {
            console.error('Failed to unenroll subject:', err);
        } finally {
            setUnenrollingIds(prev => { const next = new Set(prev); next.delete(subject.id); return next; });
        }
    };

    const selectPack = (subject: Subject) => {
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
            {subjects.map((subject, index) => {
                const isEnrolling = enrollingIds.has(subject.id);
                const isUnenrolling = unenrollingIds.has(subject.id);
                const board = subject.exam_board ?? subject.examBoard;

                return (
                    <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                        <CardHeader>
                            <CardTitle className="flex items-start justify-between gap-2">
                                <span className="leading-tight">{subject.subject}</span>
                                {subject.enrolled && (
                                    <span className="shrink-0 text-xs font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                        Enrolled
                                    </span>
                                )}
                            </CardTitle>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                {board && (
                                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        {board}
                                    </span>
                                )}
                                <TierBadge tier={subject.tier} />
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span>Study Notes</span><span>{subject.chapters}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Practice Questions</span><span>{subject.practiceQuestions}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Past Papers</span><span>{subject.pastPapers}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-1">
                                {subject.enrolled ? (
                                    /* Enrolled state: "Added" badge + unenroll icon button side by side */
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            disabled
                                            size="sm"
                                            variant="outline"
                                            className="flex items-center gap-1.5 text-green-600 border-green-200 bg-green-50 cursor-default"
                                        >
                                            <Check className="w-3.5 h-3.5" />
                                            Added
                                        </Button>
                                        <Button
                                            onClick={() => handleUnenroll(subject)}
                                            disabled={isUnenrolling}
                                            size="sm"
                                            variant="outline"
                                            title="Remove from plan"
                                            className="flex items-center gap-1.5 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                                        >
                                            {isUnenrolling
                                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                : <UserMinus className="w-3.5 h-3.5" />
                                            }
                                        </Button>
                                    </div>
                                ) : (
                                    <Button
                                        onClick={() => handleEnroll(subject)}
                                        disabled={isEnrolling}
                                        size="sm"
                                        variant="outline"
                                        className="flex items-center gap-1.5"
                                    >
                                        {isEnrolling ? (
                                            <><Loader2 className="w-3.5 h-3.5 animate-spin" />Adding…</>
                                        ) : (
                                            <><Plus className="w-3.5 h-3.5" />Add to Plan</>
                                        )}
                                    </Button>
                                )}

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
                );
            })}
        </div>
    );
}

export default StudyPackTab;