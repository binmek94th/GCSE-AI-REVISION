'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Brain, Play, Loader2, RefreshCw, Package } from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { QuizComponent } from './QuizComponent';
import { formatDate } from "@/lib/formatDate";
import { useRouter } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/app/components/ui/select";
import RetryIncorrectButton from "@/app/dashboard/incorrect-question/page";

interface Quiz {
    packId: string;
    subject: string;
    score: number;
    correctCount: number;
    totalCount: number;
    date: string;
}

interface StudyPack {
    id: string;
    subject?: string;
}

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    [key: string]: any;
}

interface QuizzesTabProps {
    initialPacks?: StudyPack[];
    studyPack: number;
}

const formatPackLabel = (pack: StudyPack): string => {
    const raw = pack.subject ?? pack.id;
    return raw
        .replace(/_/g, ' ')
        .split(' ')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

function QuizzesTab({ initialPacks, studyPack }: QuizzesTabProps) {
    const [loading, setLoading] = useState(false);
    const [loadingResults, setLoadingResults] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
    const [availablePacks, setAvailablePacks] = useState<StudyPack[]>(initialPacks || []);
    // ✅ Tracks whether the /api/user/packs fetch has completed, so we only
    // show the "no packs" empty state once we actually know the list is
    // empty — not during the brief window before the fetch resolves.
    const [packsFetched, setPacksFetched] = useState<boolean>(!!initialPacks);
    const [selectedPackId, setSelectedPackId] = useState<string>('');
    const [user, setUser] = useState<any>(null);
    const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
    const [isQuizActive, setIsQuizActive] = useState(false);
    const router = useRouter();

    const [isRetryQuizActive, setIsRetryQuizActive] = useState(false);
    const [retryQuizQuestions, setRetryQuizQuestions] = useState<Question[] | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    const fetchRecentQuizzes = async (currentUser = user) => {
        if (!currentUser) return;
        setLoadingResults(true);
        try {
            const idToken = await currentUser.getIdToken();
            const response = await fetch('/api/quiz-results?limit=5', {
                headers: { 'Authorization': `Bearer ${idToken}` },
            });
            if (response.ok) {
                const data = await response.json();
                setRecentQuizzes(data.quizResults || []);
            }
        } catch (err) {
            console.error('Error fetching quiz results:', err);
        } finally {
            setLoadingResults(false);
        }
    };

    const handleClick = () => router.push(`/dashboard?tab=studypack`);

    useEffect(() => {
        const fetchAvailablePacks = async () => {
            if (!user || initialPacks) return;
            try {
                const idToken = await user.getIdToken();
                const response = await fetch('/api/user/packs', {
                    headers: { 'Authorization': `Bearer ${idToken}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setAvailablePacks(data.packs || []);
                    if (data.packs?.length > 0) setSelectedPackId(data.packs[0].id);
                }
            } catch (err) {
                console.error('Error fetching packs:', err);
            } finally {
                setPacksFetched(true);
            }
        };

        if (user) {
            fetchAvailablePacks();
            fetchRecentQuizzes(user);
        }
    }, [user, initialPacks]);

    if (studyPack === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-600">No subjects found. Please add study packs to see your progress.</p>
                <Button onClick={handleClick}>Browse Study Packs</Button>
            </div>
        );
    }

    // ✅ Handles the case where the pack fetch succeeded but came back
    // empty (e.g. {"packs":[],"level":"A-Level","examBoard":"Cambridge(CIE)"})
    // — the user hasn't enrolled in any subjects matching their level/exam
    // board yet, so prompt them to enroll instead of showing an empty select.
    if (packsFetched && availablePacks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4 py-12 text-center">
                <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Package className="w-7 h-7 text-purple-600" />
                </div>
                <div className="space-y-1">
                    <p className="text-gray-900 font-medium">No subjects enrolled yet</p>
                    <p className="text-gray-600 text-sm max-w-sm">
                        You haven&apos;t enrolled in any subjects for your current level and exam board. Browse study
                        packs to get started.
                    </p>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700 cursor-pointer" onClick={handleClick}>
                    Browse Study Packs
                </Button>
            </div>
        );
    }

    const startQuiz = async () => {
        if (!user) { setError('Please log in to start a quiz'); return; }
        if (!selectedPackId) { setError('Please select a study pack'); return; }

        setLoading(true);
        setError(null);

        try {
            const idToken = await user.getIdToken();
            const response = await fetch(
                `/api/quizzes?packId=${selectedPackId}&limit=10&page=1`,
                { headers: { 'Authorization': `Bearer ${idToken}` } }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch questions');
            }

            const { questions } = await response.json();

            if (questions.length === 0) {
                setError('No questions available. You may have completed all questions!');
                return;
            }

            setQuizQuestions(questions);
            setIsQuizActive(true);
        } catch (err) {
            console.error('Error starting quiz:', err);
            setError(err instanceof Error ? err.message : 'Failed to start quiz');
        } finally {
            setLoading(false);
        }
    };

    // onComplete receives (score, correctCount, totalCount) from QuizComponent
    // We just need to refresh results — ignore the params
    const handleQuizComplete = () => {
        fetchRecentQuizzes();
    };

    const handleQuizExit = () => {
        setIsQuizActive(false);
        setQuizQuestions(null);
        setError(null);
        fetchRecentQuizzes();
    };

    const handleRetryQuizStart = (questions: Question[]) => {
        setRetryQuizQuestions(questions);
        setIsRetryQuizActive(true);
    };

    const handleRetryQuizExit = () => {
        setIsRetryQuizActive(false);
        setRetryQuizQuestions(null);
        fetchRecentQuizzes();
    };

    if (isQuizActive && quizQuestions) {
        return (
            <QuizComponent
                questions={quizQuestions}
                packId={selectedPackId}
                onComplete={handleQuizComplete}
                onExit={handleQuizExit}
            />
        );
    }

    if (isRetryQuizActive && retryQuizQuestions) {
        return (
            <QuizComponent
                questions={retryQuizQuestions}
                packId={selectedPackId}
                onComplete={handleRetryQuizExit}
                onExit={handleRetryQuizExit}
            />
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        Quick Quiz
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600">
                        Test your knowledge with questions tailored to your learning level.
                    </p>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Select Study Pack</label>
                        <Select
                            value={selectedPackId}
                            onValueChange={setSelectedPackId}
                            disabled={loading || availablePacks.length === 0}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a pack..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Study Packs</SelectLabel>
                                    {availablePacks.map((pack) => (
                                        <SelectItem key={pack.id} value={pack.id}>
                                            {formatPackLabel(pack)}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <Button
                        className="w-full bg-purple-600 hover:bg-purple-700 hover:cursor-pointer"
                        onClick={startQuiz}
                        disabled={loading || !selectedPackId}
                    >
                        {loading ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading Questions...</>
                        ) : (
                            <><Play className="w-4 h-4 mr-2" />Start Quick Quiz</>
                        )}
                    </Button>

                    <RetryIncorrectButton
                        packId={selectedPackId}
                        onQuizComplete={fetchRecentQuizzes}
                        onQuizStart={handleRetryQuizStart}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Quiz Results</CardTitle>
                    <Button
                        className={"cursor-pointer"}
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchRecentQuizzes()}
                        disabled={loadingResults}
                    >
                        <RefreshCw className={`w-4 h-4 cursor-pointer ${loadingResults ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loadingResults ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        </div>
                    ) : recentQuizzes.length > 0 ? (
                        recentQuizzes.map((quiz, index) => {
                            const matchedPack = availablePacks.find(p => p.id === quiz.packId);
                            const displayName = matchedPack
                                ? formatPackLabel(matchedPack)
                                : formatPackLabel({ id: quiz.packId, subject: quiz.subject });

                            return (
                                <div
                                    key={index}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex-1">
                                        <h4 className="text-gray-900 font-medium">{displayName}</h4>
                                        <p className="text-sm text-gray-500">
                                            {quiz.date ? formatDate(quiz.date) : 'No date'} · {quiz.correctCount}/{quiz.totalCount} correct
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full font-semibold text-sm ${
                                        quiz.score >= 90 ? 'bg-green-100 text-green-700' :
                                            quiz.score >= 80 ? 'bg-blue-100 text-blue-700' :
                                                quiz.score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-orange-100 text-orange-700'
                                    }`}>
                                        {quiz.score}%
                                    </span>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center text-center py-8 gap-4">
                            <p className="text-gray-500">No quiz results yet. Start your first quiz!</p>
                            <Button
                                className="bg-purple-600 hover:bg-purple-700 cursor-pointer"
                                onClick={startQuiz}
                                disabled={loading || !selectedPackId}
                            >
                                {loading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Loading Questions...</>
                                ) : (
                                    <><Play className="w-4 h-4 mr-2" />Start Quick Quiz</>
                                )}
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default QuizzesTab;