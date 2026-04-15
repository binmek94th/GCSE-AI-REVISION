'use client'
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { CheckCircle, XCircle, ChevronRight, Trophy, Clock, AlertCircle } from 'lucide-react';
import { useDashboard } from "@/contexts/DashboardContext";

interface Choice {
    option: string;   // "A", "B", "C", "D"
    text: string;
    isCorrect: boolean;
    why?: string;
}

interface Question {
    id: string;
    question: string;
    options: string[];
    explanation?: string;
    marks?: number;
    topic?: string;
    imageUrl?: string | null;
    imageDescription?: string | null;
    hasImage?: boolean;
    [key: string]: any;
}

interface MockTestComponentProps {
    questions: Question[];
    subject: string;
    onComplete: (score: number, correctCount: number, totalCount: number) => void;
    onExit: () => void;
}

// Derive the correct answer key from choices
function getCorrectKey(question: Question): string {
    return question.choices?.find(c => c.isCorrect)?.option ?? '';
}

// Get display text for a given option key
function getOptionText(question: Question, key: string): string {
    return question.choices?.find(c => c.option === key)?.text ?? key;
}

export function MockTestComponent({ questions, subject, onComplete, onExit }: MockTestComponentProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [answers, setAnswers] = useState<Record<string, { selected: string; correct: boolean; selectedText: string }>>({});
    const [showResults, setShowResults] = useState(false);
    const [reviewMode, setReviewMode] = useState(false);
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
    const [startTime] = useState(Date.now());
    const [timeElapsed, setTimeElapsed] = useState(0);
    const [streakUpdated, setStreakUpdated] = useState(false);
    const { incrementStreak } = useDashboard();

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
    const answeredCount = Object.keys(answers).length;

    useEffect(() => {
        if (showResults || reviewMode) return;
        const timer = setInterval(() => {
            setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime, showResults, reviewMode]);

    const formatTime = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const handleAnswerSelect = (answerKey: string) => {
        if (!reviewMode) setSelectedAnswer(answerKey);
    };

    const handleSaveAnswer = () => {
        if (!selectedAnswer) return;

        if (!streakUpdated) {
            incrementStreak();
            setStreakUpdated(true);
        }

        const correctKey = getCorrectKey(currentQuestion);
        const isCorrect = selectedAnswer === correctKey;
        const selectedText = getOptionText(currentQuestion, selectedAnswer);

        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: {
                selected: selectedAnswer,
                selectedText,
                correct: isCorrect,
            }
        }));

        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
        }
    };

    const handleToggleFlag = () => {
        setFlaggedQuestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(currentQuestionIndex)) newSet.delete(currentQuestionIndex);
            else newSet.add(currentQuestionIndex);
            return newSet;
        });
    };

    const handleNavigateToQuestion = (index: number) => {
        setCurrentQuestionIndex(index);
        setSelectedAnswer(answers[questions[index].id]?.selected || null);
    };

    const handleSubmitTest = async () => {
        const correctCount = Object.values(answers).filter(a => a.correct).length;
        const totalCount = questions.length;
        const score = Math.round((correctCount / totalCount) * 100);

        try {
            const user = await import('@/lib/firebase').then(m => m.auth.currentUser);
            if (user) {
                const idToken = await user.getIdToken();
                const results = questions.map(q => ({
                    questionId: q.id,
                    correct: answers[q.id]?.correct || false,
                    userAnswer: answers[q.id]?.selected || null,
                }));

                await fetch('/api/mock-test', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        subject,
                        results,
                        score,
                        correctCount,
                        totalCount,
                        timeTaken: timeElapsed,
                    }),
                });
            }
        } catch (error) {
            console.error('Error submitting mock test:', error);
        }

        setShowResults(true);
        onComplete(score, correctCount, totalCount);
    };

    const handleReviewAnswers = () => {
        setReviewMode(true);
        setCurrentQuestionIndex(0);
        setShowResults(false);
    };

    // ── Results Screen ─────────────────────────────────────────────────────────
    if (showResults && !reviewMode) {
        const correctCount = Object.values(answers).filter(a => a.correct).length;
        const totalCount = questions.length;
        const score = Math.round((correctCount / totalCount) * 100);

        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Mock Test Complete!
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center space-y-4">
                        <div className={`text-6xl font-bold ${
                            score >= 90 ? 'text-green-600' :
                                score >= 80 ? 'text-blue-600' :
                                    score >= 70 ? 'text-yellow-600' :
                                        'text-orange-600'
                        }`}>
                            {score}%
                        </div>
                        <p className="text-xl text-gray-700">
                            You got {correctCount} out of {totalCount} questions correct!
                        </p>
                        <div className="flex items-center justify-center gap-2 text-gray-600">
                            <Clock className="w-5 h-5" />
                            <span>Time taken: {formatTime(timeElapsed)}</span>
                        </div>
                        <p className="text-gray-600">
                            {score >= 90 ? '🎉 Outstanding performance!' :
                                score >= 80 ? '👏 Excellent work!' :
                                    score >= 70 ? '👍 Good job!' :
                                        score >= 60 ? '💪 Keep practicing!' :
                                            '📚 Review the material and try again!'}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-sm text-gray-600">Correct</p>
                            <p className="text-2xl font-bold text-green-600">{correctCount}</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg">
                            <p className="text-sm text-gray-600">Incorrect</p>
                            <p className="text-2xl font-bold text-red-600">{totalCount - correctCount}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button onClick={handleReviewAnswers} variant="outline" className="flex-1">
                            Review Answers
                        </Button>
                        <Button onClick={onExit} className="flex-1 bg-purple-600 hover:bg-purple-700">
                            Back to Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ── Review Mode ────────────────────────────────────────────────────────────
    if (reviewMode) {
        const answer = answers[currentQuestion.id];
        const correctKey = getCorrectKey(currentQuestion);
        const choices = currentQuestion.choices ?? [];

        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Review Mode</CardTitle>
                            <Button onClick={onExit} variant="outline" size="sm">Exit Review</Button>
                        </div>
                    </CardHeader>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                                <div className="flex items-center gap-2">
                                    {answer?.correct ? (
                                        <span className="flex items-center gap-1 text-green-600 font-semibold">
                                            <CheckCircle className="w-5 h-5" /> Correct
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-red-600 font-semibold">
                                            <XCircle className="w-5 h-5" /> Incorrect
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-purple-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Question image */}
                        {currentQuestion.hasImage && currentQuestion.imageUrl && (
                            <img
                                src={currentQuestion.imageUrl}
                                alt={currentQuestion.imageDescription ?? 'Question image'}
                                className="rounded-lg border w-full object-contain max-h-64"
                            />
                        )}

                        <div className="p-4 bg-purple-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900">{currentQuestion.questionText}</h3>
                            {currentQuestion.marks && (
                                <p className="text-sm text-purple-600 mt-1">[{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}]</p>
                            )}
                        </div>

                        <div className="space-y-3">
                            {choices.map((choice) => {
                                const isCorrect = choice.option === correctKey;
                                const isUserAnswer = answer?.selected === choice.option;

                                return (
                                    <div
                                        key={choice.option}
                                        className={`w-full p-4 rounded-lg border-2 ${
                                            isCorrect
                                                ? 'bg-green-50 border-green-500'
                                                : isUserAnswer
                                                    ? 'bg-red-50 border-red-500'
                                                    : 'bg-white border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {choice.option}
                                                </span>
                                                <span className="font-medium text-gray-900">{choice.text}</span>
                                            </div>
                                            {isCorrect && (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                                    <span className="text-sm text-green-700 font-semibold">Correct Answer</span>
                                                </div>
                                            )}
                                            {isUserAnswer && !isCorrect && (
                                                <div className="flex items-center gap-2">
                                                    <XCircle className="w-5 h-5 text-red-600" />
                                                    <span className="text-sm text-red-700 font-semibold">Your Answer</span>
                                                </div>
                                            )}
                                        </div>
                                        {/* Show why for the correct or selected answer */}
                                        {(isCorrect || isUserAnswer) && choice.why && (
                                            <p className="text-sm text-gray-600 mt-2 ml-9">{choice.why}</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {currentQuestion.explanation && (
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                                <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                            </div>
                        )}

                        <div className="flex justify-between">
                            <Button
                                onClick={() => handleNavigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
                                disabled={currentQuestionIndex === 0}
                                variant="outline"
                            >
                                Previous
                            </Button>
                            <Button
                                onClick={() => handleNavigateToQuestion(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                                disabled={currentQuestionIndex === questions.length - 1}
                            >
                                Next
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Question Navigator</CardTitle></CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                            {questions.map((_, index) => {
                                const isAnswered = answers[questions[index].id];
                                const isCurrent = index === currentQuestionIndex;
                                const isCorrect = isAnswered?.correct;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleNavigateToQuestion(index)}
                                        className={`p-2 rounded-lg font-semibold transition-all ${
                                            isCurrent ? 'bg-purple-600 text-white' :
                                                isCorrect ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                                                    isAnswered ? 'bg-red-100 text-red-700 hover:bg-red-200' :
                                                        'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Test Taking Screen ─────────────────────────────────────────────────────
    const choices = currentQuestion.choices ?? [];

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>{subject} Mock Test</CardTitle>
                            <p className="text-sm text-gray-600 mt-1">
                                Question {currentQuestionIndex + 1} of {questions.length} • {answeredCount} answered
                            </p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-gray-700">
                                <Clock className="w-5 h-5" />
                                <span className="font-mono font-semibold">{formatTime(timeElapsed)}</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={onExit}>Exit Test</Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Question image */}
                    {currentQuestion.hasImage && currentQuestion.imageUrl && (
                        <img
                            src={currentQuestion.imageUrl}
                            alt={currentQuestion.imageDescription ?? 'Question image'}
                            className="rounded-lg border w-full object-contain max-h-64"
                        />
                    )}

                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 p-4 bg-purple-50 rounded-lg">
                            <h3 className="text-lg font-semibold text-gray-900">{currentQuestion.question}</h3>
                            {currentQuestion.marks && (
                                <p className="text-sm text-purple-600 mt-1">[{currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}]</p>
                            )}
                        </div>
                        <Button
                            variant={flaggedQuestions.has(currentQuestionIndex) ? "default" : "outline"}
                            size="sm"
                            onClick={handleToggleFlag}
                            className={flaggedQuestions.has(currentQuestionIndex) ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                        >
                            <AlertCircle className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="space-y-3">
                        {Object.entries(currentQuestion.options).map(([key, value]) => {
                            const isSelected = selectedAnswer === key;
                            const isPreviouslySelected = answers[currentQuestion.id]?.selected === key;

                            return (
                                <button
                                    key={key}
                                    onClick={() => handleAnswerSelect(key)}
                                    className={`w-full p-4 text-left rounded-lg border-2 transition-all cursor-pointer ${
                                        isSelected || isPreviouslySelected
                                            ? 'bg-purple-50 border-purple-500'
                                            : 'bg-white border-gray-200 hover:border-purple-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {key}
                </span>
                                        <span className="font-medium text-gray-900">{value}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex justify-between">
                        <Button
                            onClick={() => {
                                if (currentQuestionIndex > 0) {
                                    setCurrentQuestionIndex(prev => prev - 1);
                                    setSelectedAnswer(answers[questions[currentQuestionIndex - 1].id]?.selected || null);
                                }
                            }}
                            disabled={currentQuestionIndex === 0}
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <div className="flex gap-2">
                            {selectedAnswer && !answers[currentQuestion.id] && (
                                <Button onClick={handleSaveAnswer} className="bg-purple-600 hover:bg-purple-700">
                                    Save & Continue
                                </Button>
                            )}
                            {currentQuestionIndex < questions.length - 1 && (
                                <Button
                                    onClick={() => {
                                        setCurrentQuestionIndex(prev => prev + 1);
                                        setSelectedAnswer(answers[questions[currentQuestionIndex + 1].id]?.selected || null);
                                    }}
                                    variant="outline"
                                >
                                    Skip <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Question Navigator</CardTitle>
                        <Button
                            onClick={handleSubmitTest}
                            disabled={answeredCount < questions.length}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Submit Test ({answeredCount}/{questions.length})
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-purple-600 rounded"></div>
                                <span>Current</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
                                <span>Answered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-gray-100 border-2 border-gray-300 rounded"></div>
                                <span>Unanswered</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                                <span>Flagged</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                            {questions.map((_, index) => {
                                const isAnswered = answers[questions[index].id];
                                const isCurrent = index === currentQuestionIndex;
                                const isFlagged = flaggedQuestions.has(index);
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleNavigateToQuestion(index)}
                                        className={`p-2 rounded-lg font-semibold transition-all relative ${
                                            isCurrent ? 'bg-purple-600 text-white' :
                                                isAnswered ? 'bg-green-100 text-green-700 border-2 border-green-500 hover:bg-green-200' :
                                                    'bg-gray-100 text-gray-700 border-2 border-gray-300 hover:bg-gray-200'
                                        }`}
                                    >
                                        {index + 1}
                                        {isFlagged && (
                                            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}