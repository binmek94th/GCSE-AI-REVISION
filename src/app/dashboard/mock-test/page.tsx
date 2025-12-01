'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { FileText, Play, Loader2, RefreshCw, Trophy, Clock } from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { MockTestComponent } from './MockTest';
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

interface MockTest {
    id: string;
    subject: string;
    score: number;
    correctCount: number;
    totalCount: number;
    timeTaken: number;
    date: string;
}

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    [key: string]: any;
}

interface StudyPack {
    id: string;
}

interface MockTestsTabProps {
    initialPacks?: StudyPack[];
    studyPack: number;
}

// Available subjects for mock tests
const SUBJECTS = [
    { id: 'mathematics', name: 'Mathematics', color: 'blue' },
    { id: 'english', name: 'English', color: 'green' },
    { id: 'chemistry', name: 'Chemistry', color: 'purple' },
    { id: 'biology', name: 'Biology', color: 'emerald' },
    { id: 'physics', name: 'Physics', color: 'orange' },
    { id: 'computer_science', name: 'Computer Science', color: 'indigo' },
    { id: 'art_and_design', name: 'Art & Design', color: 'pink' },
];

const QUESTION_COUNTS = [
    { value: 10, label: '10 Questions (Quick)' },
    { value: 20, label: '20 Questions (Standard)' },
    { value: 30, label: '30 Questions (Extended)' },
    { value: 50, label: '50 Questions (Full Mock)' },
];

function MockTests({ initialPacks, studyPack }: MockTestsTabProps) {
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mockTestHistory, setMockTestHistory] = useState<MockTest[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string>('');
    const [questionCount, setQuestionCount] = useState<number>(20);
    const [user, setUser] = useState<any>(null);
    const [testQuestions, setTestQuestions] = useState<Question[] | null>(null);
    const [isTestActive, setIsTestActive] = useState(false);
    const [availablePacks, setAvailablePacks] = useState<StudyPack[]>(initialPacks || []);
    const router = useRouter();

    console.log(initialPacks)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    const fetchMockTestHistory = async () => {
        if (!user) return;

        setLoadingHistory(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/mock-test-history?limit=10', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setMockTestHistory(data.mockTests || []);
            }
        } catch (err) {
            console.error('Error fetching mock test history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        const fetchMockTestHistory = async () => {
            if (!user) return;

            setLoadingHistory(true);
            try {
                const idToken = await user.getIdToken();
                const response = await fetch('/api/mock-test-history?limit=10', {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setMockTestHistory(data.mockTests || []);
                }
            } catch (err) {
                console.error('Error fetching mock test history:', err);
            } finally {
                setLoadingHistory(false);
            }
        };

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
                }
            } catch (err) {
                console.error('Error fetching packs:', err);
            }
        };

        if (user) {
            fetchAvailablePacks();
            fetchMockTestHistory();
        }
    }, [ initialPacks, user]);

    const handleClick = () => {
        router.push(`/dashboard?tab=studypack`);
    };

    if (studyPack === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
                <p className="text-gray-600">No subjects found. Please add study packs to take mock tests.</p>
                <Button onClick={handleClick}>
                    Browse Study Packs
                </Button>
            </div>
        );
    }

    const startMockTest = async () => {
        if (!user) {
            setError('Please log in to start a mock test');
            return;
        }

        if (!selectedSubject) {
            setError('Please select a subject');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const idToken = await user.getIdToken();

            const response = await fetch(
                `/api/mock-test?subject=${selectedSubject}&questionCount=${questionCount}`,
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
            const { questions, metadata } = data;

            if (questions.length === 0) {
                setError('No questions available for this subject. Please try another subject or add study materials.');
                setLoading(false);
                return;
            }

            console.log('Mock test metadata:', metadata);
            setTestQuestions(questions);
            setIsTestActive(true);

        } catch (err) {
            console.error('Error starting mock test:', err);
            setError(err instanceof Error ? err.message : 'Failed to start mock test');
        } finally {
            setLoading(false);
        }
    };

    const handleTestComplete = () => {
        fetchMockTestHistory();
    };

    const handleTestExit = () => {
        setIsTestActive(false);
        setTestQuestions(null);
        setError(null);
        fetchMockTestHistory();
    };

    // Show test if active
    if (isTestActive && testQuestions) {
        const subjectName = SUBJECTS.find(s => s.id === selectedSubject)?.name || selectedSubject;
        return (
            <MockTestComponent
                questions={testQuestions}
                subject={subjectName}
                onComplete={handleTestComplete}
                onExit={handleTestExit}
            />
        );
    }

    const formatName = (id: string) => {
        return id
            .replace(/_/g, " ")
            .split(" ")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    };

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    };

    // Get available subjects based on user's packs
    const availableSubjects = SUBJECTS.filter(subject =>
        availablePacks.some(pack => pack.id.toLowerCase() === subject.id.toLowerCase())
    );

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mock Test Setup Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Start Mock Test
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-gray-600">
                        Take a comprehensive mock test to assess your knowledge and exam readiness.
                    </p>

                    {/* Subject Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Select Subject
                        </label>

                        <Select
                            value={selectedSubject}
                            onValueChange={setSelectedSubject}
                            disabled={loading || initialPacks.length === 0}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Choose a subject..." />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Subjects</SelectLabel>

                                    {initialPacks.map((subject) => (
                                        <SelectItem key={subject.id} value={subject.id}>
                                            {formatName(subject.id)}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Question Count Selection */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Test Length
                        </label>

                        <Select
                            value={String(questionCount)}
                            onValueChange={(val) => setQuestionCount(parseInt(val))}
                            disabled={loading}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select test length" />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Test Length</SelectLabel>

                                    {QUESTION_COUNTS.map((option) => (
                                        <SelectItem key={option.value} value={String(option.value)}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>


                    {/* Test Info */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Questions are intelligently selected based on your performance:
                        </p>
                        <ul className="text-sm text-blue-700 mt-2 space-y-1 ml-4 list-disc">
                            <li>Priority given to previously incorrect answers</li>
                            <li>Unstudied material included for comprehensive coverage</li>
                            <li>Timed test environment to simulate exam conditions</li>
                        </ul>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={startMockTest}
                        disabled={loading || !selectedSubject}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Preparing Test...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Start Mock Test
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Test History Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Recent Mock Tests</CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchMockTestHistory}
                        disabled={loadingHistory}
                    >
                        <RefreshCw className={`w-4 h-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                    </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                    {loadingHistory ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        </div>
                    ) : mockTestHistory.length > 0 ? (
                        <div className="space-y-3">
                            {mockTestHistory.map((test) => (
                                <div
                                    key={test.id}
                                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-gray-900 font-semibold">{formatName(test.subject)}</h4>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                    test.score >= 90 ? 'bg-green-100 text-green-700' :
                                                        test.score >= 80 ? 'bg-blue-100 text-blue-700' :
                                                            test.score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-orange-100 text-orange-700'
                                                }`}>
                                                    {test.score}%
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                                <span>{formatDate(test.date)}</span>
                                                <span>•</span>
                                                <span>{test.correctCount}/{test.totalCount} correct</span>
                                                {test.timeTaken && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatTime(test.timeTaken)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <Trophy className={`w-5 h-5 ${
                                            test.score >= 90 ? 'text-yellow-500' :
                                                test.score >= 80 ? 'text-blue-500' :
                                                    test.score >= 70 ? 'text-orange-500' :
                                                        'text-gray-400'
                                        }`} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">
                                No mock tests completed yet. Start your first mock test!
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Statistics Overview Card */}
            {mockTestHistory.length > 0 && (
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Performance Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Tests Completed</p>
                                <p className="text-2xl font-bold text-blue-600">{mockTestHistory.length}</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Average Score</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {Math.round(
                                        mockTestHistory.reduce((acc, test) => acc + test.score, 0) / mockTestHistory.length
                                    )}%
                                </p>
                            </div>
                            <div className="p-4 bg-purple-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Best Score</p>
                                <p className="text-2xl font-bold text-purple-600">
                                    {Math.max(...mockTestHistory.map(test => test.score))}%
                                </p>
                            </div>
                            <div className="p-4 bg-orange-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Total Questions</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {mockTestHistory.reduce((acc, test) => acc + test.totalCount, 0)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default MockTests