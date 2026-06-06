'use client'
import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import Spinner from '@/app/components/ui/Spinner';
import {
    AlertCircle, CheckCircle2, XCircle, BookOpen,
    ChevronDown, ChevronUp, RotateCcw, ArrowRight,
    ArrowLeft, Trophy
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MistakeQuestion {
    id: string;
    subjectId: string;
    subject: string;
    question: string;
    options: Record<string, string>;
    correctAnswer: string;
    explanation: string;
    userAnswer: string;
    answeredAt: string | null;
}

type Screen = 'home' | 'setup' | 'quiz' | 'results';

// ─── Small helpers ────────────────────────────────────────────────────────────

function OptionRow({ optionKey, text, isCorrect, isUserWrong }: {
    optionKey: string; text: string; isCorrect: boolean; isUserWrong: boolean;
}) {
    let bg = 'bg-gray-50 border-gray-200 text-gray-700';
    if (isCorrect) bg = 'bg-green-50 border-green-300 text-green-800';
    if (isUserWrong) bg = 'bg-red-50 border-red-300 text-red-800';
    return (
        <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md border text-sm ${bg}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                ${isCorrect ? 'bg-green-500 text-white' : isUserWrong ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {optionKey}
            </span>
            <span className="flex-1">{text}</span>
            {isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
            {isUserWrong && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
        </div>
    );
}

// Collapsible review card (used on home screen)
function ReviewCard({ q }: { q: MistakeQuestion }) {
    const [open, setOpen] = useState(false);
    const entries = Object.entries(q.options).sort((a, b) => a[0].localeCompare(b[0]));
    return (
        <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <button onClick={() => setOpen(v => !v)}
                    className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{q.question}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{q.subject}</span>
                        <span className="text-xs text-red-500">You answered: <strong>{q.userAnswer}</strong></span>
                        <span className="text-xs text-green-600">Correct: <strong>{q.correctAnswer}</strong></span>
                    </div>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />}
            </button>
            {open && (
                <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
                    <div className="space-y-2">
                        {entries.map(([key, value]) => (
                            <OptionRow key={key} optionKey={key} text={value}
                                       isCorrect={key === q.correctAnswer}
                                       isUserWrong={key === q.userAnswer && key !== q.correctAnswer} />
                        ))}
                    </div>
                    {q.explanation && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                            <p className="font-semibold mb-1">Explanation</p>
                            <p className="leading-relaxed">{q.explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ─── Setup screen ─────────────────────────────────────────────────────────────

function SetupScreen({
                         allQuestions,
                         onStart,
                         onBack,
                     }: {
    allQuestions: MistakeQuestion[];
    onStart: (questions: MistakeQuestion[]) => void;
    onBack: () => void;
}) {
    const subjects = ['All', ...Array.from(new Set(allQuestions.map(q => q.subject))).sort()];
    const counts = [10, 20, 30];

    const [selectedSubject, setSelectedSubject] = useState('All');
    const [selectedCount, setSelectedCount] = useState(10);

    const pool = selectedSubject === 'All'
        ? allQuestions
        : allQuestions.filter(q => q.subject === selectedSubject);

    const available = pool.length;

    const handleStart = () => {
        // Shuffle and cap at selected count
        const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, selectedCount);
        onStart(shuffled);
    };

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">Set up your retake</h2>
                <p className="text-sm text-gray-500">Choose which subject to focus on and how many questions to practice.</p>
            </div>

            {/* Subject */}
            <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Subject</p>
                <div className="flex flex-wrap gap-2">
                    {subjects.map(s => (
                        <button key={s} onClick={() => setSelectedSubject(s)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                                ${selectedSubject === s
                                    ? 'bg-red-500 text-white border-red-500'
                                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                            {s}
                            <span className={`ml-1.5 text-xs ${selectedSubject === s ? 'text-red-100' : 'text-gray-400'}`}>
                                ({s === 'All' ? allQuestions.length : allQuestions.filter(q => q.subject === s).length})
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Count */}
            <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Number of questions</p>
                <div className="flex gap-2">
                    {counts.map(c => {
                        const disabled = available < c;
                        return (
                            <button key={c}
                                    onClick={() => !disabled && setSelectedCount(c)}
                                    disabled={disabled}
                                    className={`w-16 h-16 rounded-xl border text-sm font-semibold transition-all
                                    ${selectedCount === c && !disabled
                                        ? 'bg-red-500 text-white border-red-500 shadow-md'
                                        : disabled
                                            ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'}`}>
                                {c}
                            </button>
                        );
                    })}
                </div>
                <p className="text-xs text-gray-400 mt-2">{available} question{available !== 1 ? 's' : ''} available for this selection</p>
            </div>

            <button
                onClick={handleStart}
                disabled={available === 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Start retake
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Quiz screen ──────────────────────────────────────────────────────────────

function QuizScreen({
                        questions,
                        onFinish,
                        onExit,
                    }: {
    questions: MistakeQuestion[];
    onFinish: (answers: Record<string, string>) => void;
    onExit: () => void;
}) {
    const [currentIdx, setCurrentIdx] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    const q = questions[currentIdx];
    const entries = Object.entries(q.options).sort((a, b) => a[0].localeCompare(b[0]));
    const selected = answers[q.id];
    const isLast = currentIdx === questions.length - 1;

    const handleSelect = (key: string) => {
        if (selected) return; // locked after answering
        setAnswers(prev => ({ ...prev, [q.id]: key }));
    };

    const handleNext = () => {
        if (isLast) onFinish(answers);
        else setCurrentIdx(i => i + 1);
    };

    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
        <div className="max-w-xl mx-auto space-y-5">
            {/* Progress bar + exit */}
            <div>
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-400">Question {currentIdx + 1} of {questions.length}</span>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{q.subject}</span>
                        <button
                            onClick={onExit}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors font-medium flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Exit
                        </button>
                    </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full transition-all duration-300"
                         style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Question */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <p className="text-sm font-medium text-gray-900 leading-relaxed mb-5">{q.question}</p>

                <div className="space-y-2">
                    {entries.map(([key, value]) => {
                        const isSelected = selected === key;
                        const isCorrect = key === q.correctAnswer;
                        const isWrong = isSelected && !isCorrect;

                        let style = 'bg-gray-50 border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-100';
                        if (selected) {
                            if (isCorrect) style = 'bg-green-50 border-green-300 text-green-800';
                            else if (isWrong) style = 'bg-red-50 border-red-300 text-red-800';
                            else style = 'bg-gray-50 border-gray-200 text-gray-400';
                        }

                        return (
                            <button key={key} onClick={() => handleSelect(key)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all ${style} ${!selected ? 'cursor-pointer' : 'cursor-default'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0
                                    ${selected && isCorrect ? 'bg-green-500 text-white'
                                    : selected && isWrong ? 'bg-red-400 text-white'
                                        : 'bg-gray-200 text-gray-600'}`}>
                                    {key}
                                </span>
                                <span className="flex-1">{value}</span>
                                {selected && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                                {selected && isWrong && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                            </button>
                        );
                    })}
                </div>

                {/* Explanation shown after answering */}
                {selected && q.explanation && (
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800">
                        <p className="font-semibold mb-0.5">Explanation</p>
                        <p className="leading-relaxed">{q.explanation}</p>
                    </div>
                )}
            </div>

            <button
                onClick={handleNext}
                disabled={!selected}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                {isLast ? 'See results' : 'Next question'}
                <ArrowRight className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({
                           questions,
                           answers,
                           onRetry,
                           onHome,
                       }: {
    questions: MistakeQuestion[];
    answers: Record<string, string>;
    onRetry: () => void;
    onHome: () => void;
}) {
    const correct = questions.filter(q => answers[q.id] === q.correctAnswer).length;
    const pct = Math.round((correct / questions.length) * 100);

    return (
        <div className="max-w-lg mx-auto space-y-6 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center">
                <Trophy className="w-9 h-9 text-red-400" />
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-900">{pct}%</h2>
                <p className="text-gray-500 text-sm mt-1">{correct} of {questions.length} correct</p>
            </div>

            {/* Per-question summary */}
            <div className="text-left space-y-2">
                {questions.map((q, i) => {
                    const userAns = answers[q.id];
                    const ok = userAns === q.correctAnswer;
                    return (
                        <div key={q.id} className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm
                            ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                            {ok
                                ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                            <div className="flex-1 min-w-0">
                                <p className={`font-medium truncate ${ok ? 'text-green-800' : 'text-red-800'}`}>
                                    Q{i + 1}: {q.question.slice(0, 70)}{q.question.length > 70 ? '…' : ''}
                                </p>
                                {!ok && (
                                    <p className="text-xs text-red-600 mt-0.5">
                                        Your answer: <strong>{userAns}</strong> · Correct: <strong>{q.correctAnswer}</strong>
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-3">
                <button onClick={onHome}
                        className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                    Back to bank
                </button>
                <button onClick={onRetry}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors">
                    <RotateCcw className="w-4 h-4" /> Retry
                </button>
            </div>
        </div>
    );
}

// ─── Home screen ──────────────────────────────────────────────────────────────

function HomeScreen({
                        questions,
                        onStartSetup,
                    }: {
    questions: MistakeQuestion[];
    onStartSetup: () => void;
}) {
    const [listOpen, setListOpen] = useState(false);
    const [activeSubject, setActiveSubject] = useState('All');

    const subjects = ['All', ...Array.from(new Set(questions.map(q => q.subject))).sort()];
    const filtered = activeSubject === 'All' ? questions : questions.filter(q => q.subject === activeSubject);

    const formatSubject = (subject: string) =>
        subject
            .replace(/_/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase());

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Mistake Bank</h2>
                        <p className="text-sm text-gray-500">{questions.length} question{questions.length !== 1 ? 's' : ''} to review</p>
                    </div>
                </div>

                {/* Retake CTA */}
                <button
                    onClick={onStartSetup}
                    className="flex items-center cursor-pointer gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors shadow-sm">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retake
                </button>
            </div>

            {/* Collapsible question list */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                    onClick={() => setListOpen(v => !v)}
                    className="w-full cursor-pointer flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700">
                    <span>View all questions</span>
                    {listOpen
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {listOpen && (
                    <div className="p-4 space-y-3 border-t border-gray-100">
                        {/* Subject filter tabs (only if > 1 subject) */}
                        {subjects.length > 2 && (
                            <div className="flex gap-0 border-b border-gray-200 overflow-x-auto -mx-4 px-4 mb-3">
                                {subjects.map(s => (
                                    <button key={s} onClick={() => setActiveSubject(s)}
                                            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors -mb-px
                                            ${activeSubject === s
                                                ? 'border-red-400 text-red-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                                        {formatSubject(s)}
                                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full
                                            ${activeSubject === s ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {s === 'All' ? questions.length : questions.filter(q => q.subject === s).length}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {filtered.map(q => <ReviewCard key={`${q.subjectId}-${q.id}`} q={q} />)}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function MistakeBankTab() {
    const [questions, setQuestions] = useState<MistakeQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [screen, setScreen] = useState<Screen>('home');
    const [quizQuestions, setQuizQuestions] = useState<MistakeQuestion[]>([]);
    const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
    const router = useRouter();

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            if (!user) { router.push('/auth/login'); return; }
            try {
                const idToken = await user.getIdToken();
                const res = await fetch('/api/mistake-bank', { headers: { Authorization: `Bearer ${idToken}` } });
                const data = await res.json();
                setQuestions(data.questions ?? []);
            } catch (err) {
                console.error('Failed to load mistake bank:', err);
            } finally {
                setLoading(false);
            }
        });
        return () => unsub();
    }, [router]);

    if (loading) return <Spinner />;

    if (questions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">No mistakes yet!</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                    Questions you answer incorrectly in quizzes and mock tests will appear here so you can review them.
                </p>
            </div>
        );
    }

    if (screen === 'home') {
        return (
            <HomeScreen
                questions={questions}
                onStartSetup={() => setScreen('setup')}
            />
        );
    }

    if (screen === 'setup') {
        return (
            <SetupScreen
                allQuestions={questions}
                onBack={() => setScreen('home')}
                onStart={(qs) => { setQuizQuestions(qs); setScreen('quiz'); }}
            />
        );
    }

    if (screen === 'quiz') {
        return (
            <QuizScreen
                questions={quizQuestions}
                onFinish={(ans) => { setQuizAnswers(ans); setScreen('results'); }}
                onExit={() => setScreen('home')}
            />
        );
    }

    if (screen === 'results') {
        return (
            <ResultsScreen
                questions={quizQuestions}
                answers={quizAnswers}
                onHome={() => setScreen('home')}
                onRetry={() => { setQuizAnswers({}); setScreen('quiz'); }}
            />
        );
    }

    return null;
}