'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Brain, Play, Loader2, RefreshCw } from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { QuizComponent } from './QuizComponent';
import {formatDate} from "@/lib/formatDate";
import {useRouter} from "next/navigation";

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

export function QuizzesTab({ initialPacks, studyPack }: QuizzesTabProps) {
    const [loading, setLoading] = useState(false);
    const [loadingResults, setLoadingResults] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [recentQuizzes, setRecentQuizzes] = useState<Quiz[]>([]);
    const [availablePacks, setAvailablePacks] = useState<StudyPack[]>(initialPacks || []);
    const [selectedPackId, setSelectedPackId] = useState<string>('');
    const [user, setUser] = useState<any>(null);
    const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
    const [isQuizActive, setIsQuizActive] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    const fetchRecentQuizzes = async () => {
        if (!user) return;

        setLoadingResults(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/quiz-results?limit=5', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                },
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

    const handleClick = () => {
        router.push(`/dashboard?tab=studypack`);
    }
    useEffect(() => {
        const fetchAvailablePacks = async () => {
            if (!user || initialPacks) return;

            try {
                const idToken = await user.getIdToken();
                const response = await fetch('/api/user/packs', {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setAvailablePacks(data.packs || []);
                    if (data.packs && data.packs.length > 0) {
                        setSelectedPackId(data.packs[0].id);
                    }
                }
            } catch (err) {
                console.error('Error fetching packs:', err);
            }
        };

        const fetchRecentQuizzes = async () => {
            if (!user) return;

            setLoadingResults(true);
            try {
                const idToken = await user.getIdToken();
                const response = await fetch('/api/quiz-results?limit=5', {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
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

        if (user) {
            fetchAvailablePacks();
            fetchRecentQuizzes();
        }
    }, [initialPacks, user]);

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

    const startQuiz = async () => {
        if (!user) {
            setError('Please log in to start a quiz');
            return;
        }

        if (!selectedPackId) {
            setError('Please select a study pack');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const idToken = await user.getIdToken();

            const response = await fetch(
                `/api/quizzes?packId=${selectedPackId}&limit=10&page=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch questions');
            }

            const data = await response.json();
            const { questions } = data;

            if (questions.length === 0) {
                setError('No questions available. You may have completed all questions!');
                setLoading(false);
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

    const handleQuizComplete = () => {
        fetchRecentQuizzes();
    };

    const handleQuizExit = () => {
        setIsQuizActive(false);
        setQuizQuestions(null);
        setError(null);
        fetchRecentQuizzes();
    };

    // Show quiz if active
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
    const formatName = (id: string) => {
        return id
            .replace(/_/g, " ")
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
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

                    {/* Pack Selection Dropdown */}
                    <div className="space-y-2">
                        <label htmlFor="pack-select" className="text-sm font-medium text-gray-700">
                            Select Study Pack
                        </label>
                        <select
                            id="pack-select"
                            value={selectedPackId}
                            onChange={(e) => setSelectedPackId(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            disabled={loading || availablePacks.length === 0}
                        >
                            <option value="">Choose a pack...</option>
                            {availablePacks?.map((pack) => {
                                const formattedName = pack.id
                                    .replace(/_/g, " ")
                                    .split(" ")
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                    .join(" ");

                                return (
                                    <option key={pack.id} value={pack.id}>
                                        {formattedName}
                                    </option>
                                );
                            })}
                        </select>
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
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Loading Questions...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Start Quick Quiz
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Quiz Results</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchRecentQuizzes}
                        disabled={loadingResults}
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingResults ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loadingResults ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        </div>
                    ) : recentQuizzes.length > 0 ? (
                        recentQuizzes.map((quiz, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex-1">
                                    <h4 className="text-gray-900 font-medium">{formatName(quiz.packId)}</h4>
                                    <p className="text-sm text-gray-500">
                                        {formatDate(quiz.date)} • {quiz.correctCount}/{quiz.totalCount} correct
                                    </p>
                                </div>
                                <span className={`px-3 py-1 rounded-full font-semibold ${
                                    quiz.score >= 90 ? 'bg-green-100 text-green-700' :
                                        quiz.score >= 80 ? 'bg-blue-100 text-blue-700' :
                                            quiz.score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-orange-100 text-orange-700'
                                }`}>
                                    {quiz.score}%
                                </span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 text-center py-8">
                            No quiz results yet. Start your first quiz!
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}