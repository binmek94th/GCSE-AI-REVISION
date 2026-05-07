'use client'
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { CheckCircle, XCircle, ChevronRight, Trophy, RotateCcw } from 'lucide-react';
import { useDashboard } from "@/contexts/DashboardContext";

interface Question {
    id: string;
    question: string;
    options: Record<string, string> | string[];
    correctAnswer: string;
    explanation?: string;
    [key: string]: any;
}

interface QuizComponentProps {
    questions: Question[];
    packId: string;
    // Signature simplified — callers (QuizzesTab) just need to refresh after completion
    onComplete: () => void;
    onExit: () => void;
}

export function QuizComponent({ questions, packId, onComplete, onExit }: QuizComponentProps) {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [answers, setAnswers] = useState<Record<string, { selected: string; correct: boolean; selectedText: string }>>({});
    const [showResults, setShowResults] = useState(false);
    const [streakUpdated, setStreakUpdated] = useState(false);
    const { incrementStreak } = useDashboard();

    const currentQuestion = questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    const handleAnswerSelect = (answerKey: string) => {
        if (!isAnswered) setSelectedAnswer(answerKey);
    };

    const getOptionText = (question: Question, key: string): string => {
        if (Array.isArray(question.options)) return key;
        return question.options[key] || key;
    };

    const handleSubmitAnswer = async () => {
        if (!selectedAnswer) return;

        if (!streakUpdated) {
            incrementStreak();
            setStreakUpdated(true);
        }

        const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
        const selectedText = getOptionText(currentQuestion, selectedAnswer);

        setIsAnswered(true);
        setAnswers(prev => ({
            ...prev,
            [currentQuestion.id]: { selected: selectedAnswer, selectedText, correct: isCorrect },
        }));

        try {
            const user = await import('@/lib/firebase').then(m => m.auth.currentUser);
            if (user) {
                const idToken = await user.getIdToken();
                await fetch('/api/quizzes', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${idToken}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        packId,
                        questionId: currentQuestion.id,
                        correct: isCorrect,
                        userAnswer: selectedAnswer,
                    }),
                });
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setIsAnswered(false);
        } else {
            setShowResults(true);
            onComplete(); // simply notify parent — no args needed
        }
    };

    const handleRestart = () => {
        setCurrentQuestionIndex(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setAnswers({});
        setShowResults(false);
    };

    // ── Results screen ────────────────────────────────────────────────────────
    if (showResults) {
        const correctCount = Object.values(answers).filter(a => a.correct).length;
        const totalCount = questions.length;
        const score = Math.round((correctCount / totalCount) * 100);

        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Quiz Complete!
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
                        <p className="text-gray-600">
                            {score >= 90 ? '🎉 Excellent work!' :
                                score >= 80 ? '👏 Great job!' :
                                    score >= 70 ? '👍 Good effort!' :
                                        '💪 Keep practicing!'}
                        </p>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        <h3 className="font-semibold text-gray-900">Review Your Answers</h3>
                        {questions.map((question, index) => {
                            const answer = answers[question.id];
                            const correctAnswerText = getOptionText(question, question.correctAnswer);
                            return (
                                <div
                                    key={question.id}
                                    className={`p-4 rounded-lg border-2 ${
                                        answer?.correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}
                                >
                                    <div className="flex items-start gap-2">
                                        {answer?.correct
                                            ? <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                            : <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 mb-1">
                                                Question {index + 1}: {question.question}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                Your answer: <span className="font-medium">{answer?.selected} - {answer?.selectedText}</span>
                                            </p>
                                            {!answer?.correct && (
                                                <p className="text-sm text-green-700 mt-1">
                                                    Correct answer: <span className="font-medium">{question.correctAnswer} - {correctAnswerText}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-3">
                        <Button onClick={handleRestart} variant="outline" className="flex-1">
                            <RotateCcw className="w-4 h-4 mr-2" />Retry Quiz
                        </Button>
                        <Button onClick={onExit} className="flex-1 bg-purple-600 hover:bg-purple-700">
                            Back to Dashboard
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // ── Question screen ───────────────────────────────────────────────────────
    return (
        <Card className="w-full">
            <CardHeader>
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                        <Button variant="ghost" size="sm" onClick={onExit}>Exit Quiz</Button>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900">{currentQuestion.question}</h3>
                </div>

                <div className="space-y-3">
                    {(() => {
                        const optionsArray = Array.isArray(currentQuestion.options)
                            ? currentQuestion.options.map((opt, idx) => ({ key: String.fromCharCode(65 + idx), value: opt }))
                            : Object.entries(currentQuestion.options).map(([key, value]) => ({ key, value }));

                        return optionsArray.map((option, index) => {
                            const isSelected = selectedAnswer === option.key;
                            const isCorrect = option.key === currentQuestion.correctAnswer;
                            const showCorrect = isAnswered && isCorrect;
                            const showWrong = isAnswered && isSelected && !isCorrect;

                            return (
                                <button
                                    key={index}
                                    onClick={() => handleAnswerSelect(option.key)}
                                    disabled={isAnswered}
                                    className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                                        showCorrect ? 'bg-green-50 border-green-500' :
                                            showWrong   ? 'bg-red-50 border-red-500' :
                                                isSelected  ? 'bg-purple-50 border-purple-500' :
                                                    'bg-white border-gray-200 hover:border-purple-300'
                                    } ${isAnswered ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-semibold text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                {option.key}
                                            </span>
                                            <span className="font-medium text-gray-900">{option.value}</span>
                                        </div>
                                        {showCorrect && <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />}
                                        {showWrong   && <XCircle    className="w-5 h-5 text-red-600   flex-shrink-0" />}
                                    </div>
                                </button>
                            );
                        });
                    })()}
                </div>

                {isAnswered && currentQuestion.explanation && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-semibold text-blue-900 mb-1">Explanation:</p>
                        <p className="text-sm text-blue-800">{currentQuestion.explanation}</p>
                    </div>
                )}

                <div className="flex justify-end">
                    {!isAnswered ? (
                        <Button
                            onClick={handleSubmitAnswer}
                            disabled={!selectedAnswer}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Submit Answer
                        </Button>
                    ) : (
                        <Button onClick={handleNextQuestion} className="bg-purple-600 hover:bg-purple-700">
                            {currentQuestionIndex < questions.length - 1 ? (
                                <>Next Question <ChevronRight className="w-4 h-4 ml-2" /></>
                            ) : (
                                <>View Results <Trophy className="w-4 h-4 ml-2" /></>
                            )}
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}