'use client'
import { useState, useEffect } from 'react';
import { Button } from "@/app/components/ui/button";
import { RefreshCw, Loader2 } from 'lucide-react';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface Question {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation?: string;
    userAnswer?: string;
    answeredAt?: any;
    [key: string]: any;
}

interface RetryIncorrectButtonProps {
    packId: string;
    onQuizComplete?: () => void;
    onQuizStart: (questions: Question[]) => void;
}

export function RetryIncorrectButton({ packId, onQuizComplete, onQuizStart }: RetryIncorrectButtonProps) {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [incorrectCount, setIncorrectCount] = useState<number>(0);
    const [loadingCount, setLoadingCount] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    // Fetch count of incorrect questions
    const fetchIncorrectCount = async () => {
        if (!user || !packId) return;

        setLoadingCount(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch(
                `/api/incorrect-questions?packId=${packId}&limit=999`,
                {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                }
            );

            if (response.ok) {
                const data = await response.json();
                setIncorrectCount(data.total || 0);
            }
        } catch (err) {
            console.error('Error fetching incorrect count:', err);
        } finally {
            setLoadingCount(false);
        }
    };

    useEffect(() => {
        if (user && packId) {
            fetchIncorrectCount();
        }
    }, [user, packId]);

    const startRetryQuiz = async () => {
        if (!user) {
            return;
        }

        if (!packId) {
            return;
        }

        setLoading(true);

        try {
            const idToken = await user.getIdToken();

            const response = await fetch(
                `/api/incorrect-questions?packId=${packId}&limit=10`,
                {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch incorrect questions');
            }

            const data = await response.json();
            const { questions } = data;

            if (questions.length === 0) {
                setLoading(false);
                return;
            }

            // Pass questions to parent component
            onQuizStart(questions);

        } catch (err) {
            console.error('Error starting retry quiz:', err);
        } finally {
            setLoading(false);
        }
    };

    // Don't show button if no incorrect questions
    if (incorrectCount === 0 && !loadingCount) {
        return null;
    }

    return (
        <Button
            className="w-full bg-orange-600 hover:bg-orange-700"
            onClick={startRetryQuiz}
            disabled={loading || loadingCount || incorrectCount === 0}
        >
            {loading ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading Questions...
                </>
            ) : loadingCount ? (
                <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                </>
            ) : (
                <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry Failed Questions ({incorrectCount})
                </>
            )}
        </Button>
    );
}