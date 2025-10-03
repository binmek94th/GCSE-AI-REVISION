'use client'
import { useState } from 'react';
import { CheckCircle, ArrowLeft, ArrowRight, Clock, Target } from 'lucide-react';
import { EXAM_DATA } from "@/app/onboarding/exam_data";
import Quiz from "@/app/onboarding/Question";
import { SubjectSelection } from "@/app/onboarding/Schema";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "../components/select";
import {useRouter} from "next/navigation";
import {auth, db} from "@/lib/firebase";
import {doc, setDoc} from "@firebase/firestore";


function Button({ children, variant = 'default', className = '', disabled = false, onClick }: any) {
    const baseClass = "px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    const variantClass = variant === 'outline'
        ? 'border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700'
        : variant === 'ghost'
            ? 'hover:bg-gray-100 text-gray-700'
            : 'bg-blue-600 hover:bg-blue-700 text-white';

    return (
        <button className={`${baseClass} ${variantClass} ${className}`} disabled={disabled} onClick={onClick}>
            {children}
        </button>
    );
}

function OnBoarding() {
    const [currentStep, setCurrentStep] = useState(1);
    const router = useRouter();
    const [selectedSubjects, setSelectedSubjects] = useState<SubjectSelection>({
        examBoard: 'AQA',
        subjects: []
    });

    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<string>('');
    const [selectedTier, setSelectedTier] = useState<string>('');
    const [disableNext, setDisableNext] = useState(false);

    const [globalExamBoard, setGlobalExamBoard] = useState<string>('AQA');
    const [preferences, setPreferences] = useState({
        targetGrade: '7',
        hoursPerWeek: '10-15'
    });

    const gradeOptions = ["9", "8", "7", "6", "5", "4"];
    const hoursOptions = ["1-5", "5-10", "10-15", "15-20", "20+"];
    const examBoards = ["AQA", "Edexcel", "OCR"];

    const getSubjectsForExamBoard = (examBoard: string) => {
        return Array.from(new Set(
            EXAM_DATA.filter(item => item.exam_board === examBoard).map(item => item.subject)
        )).sort();
    };

    const uniqueSubjects = getSubjectsForExamBoard(globalExamBoard);

    const getTiersForSubjectAndBoard = (subject: string, examBoard: string) => {
        return EXAM_DATA
            .filter(item => item.subject === subject && item.exam_board === examBoard)
            .map(item => item.tier);
    };

    const handleSubjectClick = (subject: string) => {
        const alreadySelected = selectedSubjects.subjects.find(s => s.name === subject);

        if (alreadySelected) {
            setSelectedSubjects({
                ...selectedSubjects,
                subjects: selectedSubjects.subjects.filter(s => s.name !== subject)
            });
            if (currentSubject === subject) {
                setShowSelectionModal(false);
                setCurrentSubject('');
            }
        } else {
            setCurrentSubject(subject);
            const tiers = getTiersForSubjectAndBoard(subject, globalExamBoard);
            setSelectedTier(tiers[0]);
            setShowSelectionModal(true);
        }
    };

    const handleConfirmSelection = () => {
        setSelectedSubjects({
            examBoard: globalExamBoard,
            subjects: [
                ...selectedSubjects.subjects,
                {
                    name: currentSubject,
                    tier: selectedTier
                }
            ]
        });
        setShowSelectionModal(false);
    };

    const handleExamBoardChange = (board: string) => {
        setGlobalExamBoard(board);
        setSelectedSubjects({
            examBoard: board,
            subjects: []
        });
        setShowSelectionModal(false);
        setCurrentSubject('');
    };

    const handleSubmission = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                router.push('/auth/login')
                return;
            }

            const onboardingData = {
                examBoard: selectedSubjects.examBoard,
                subjects: selectedSubjects.subjects,
                preferences,
                onboardingComplete: true,
                updatedAt: new Date(),
            };

            await setDoc(doc(db, "users", user.uid), onboardingData, { merge: true });

            // await setDoc(doc(db, "users", user.uid, "path", "profile"), onboardingData);

            console.log("✅ Onboarding saved for user:", user.uid);
        } catch (error) {
            console.error("🔥 Error saving onboarding data:", error);
        }
    };

    const handleNext = () => {
        if (currentStep < 3) {
            setCurrentStep(currentStep + 1);
        } else handleSubmission();
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const canProceed = () => {
        switch (currentStep) {
            case 1:
                return selectedSubjects.subjects.length > 0;
            default:
                return true;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex-1">
                            <p className="text-gray-600 text-lg">Step {currentStep} of 3 • Takes less than 2 minutes</p>
                        </div>
                    </div>

                    <div className="relative">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-600 to-green-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${(currentStep / 3) * 100}%` }}
                            />
                        </div>
                        <div className="flex justify-between mt-3">
                            <span className={`text-sm ${currentStep >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                                Choose Subjects
                            </span>
                            <span className={`text-sm ${currentStep >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                                Quick Assessment
                            </span>
                            <span className={`text-sm ${currentStep >= 3 ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                                Study Preferences
                            </span>
                        </div>
                    </div>
                </div>

                {currentStep === 1 && (
                    <div className="border border-gray-200 bg-white rounded-2xl shadow-xl">
                        <div className="p-8 pb-6">
                            {/* Exam board selector */}
                            <div className="mt-6">
                                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                                    Select Exam Board
                                </label>
                                <Select
                                    value={globalExamBoard}
                                    onValueChange={handleExamBoardChange}
                                >
                                    <SelectTrigger className="w-full md:w-64">
                                        <SelectValue placeholder="Select Exam Board" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Exam Board</SelectLabel>
                                            {examBoards.map((board) => (
                                                <SelectItem key={board} value={board}>
                                                    {board}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-8 pt-0">
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {uniqueSubjects.map((subject) => {
                                    const isSelected = selectedSubjects.subjects.find(s => s.name === subject);
                                    const isConfiguring = currentSubject === subject && showSelectionModal;

                                    return (
                                        <div key={subject} className="relative">
                                            <button
                                                onClick={() => handleSubjectClick(subject)}
                                                className={`w-full p-6 rounded-2xl border-2 text-left transition-all duration-200 hover:scale-[1.02] ${
                                                    isSelected
                                                        ? 'border-blue-600 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-lg'
                                                        : 'border-gray-200 bg-white text-gray-900 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <span className="font-semibold text-lg block">{subject}</span>
                                                        {isSelected && (
                                                            <div className="mt-2 text-xs space-y-1">
                                                                <p className="text-blue-700"><strong>Tier:</strong> {isSelected.tier}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                                                            <CheckCircle className="w-4 h-4 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </button>

                                            {/* Inline Selection Panel */}
                                            {isConfiguring && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-blue-600 rounded-xl shadow-xl p-4 z-10">
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-700 mb-2 block">
                                                                Tier
                                                            </label>
                                                            <div className="flex flex-wrap gap-2">
                                                                {getTiersForSubjectAndBoard(subject, globalExamBoard).map(tier => (
                                                                    <button
                                                                        key={tier}
                                                                        onClick={() => setSelectedTier(tier)}
                                                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                                                                            selectedTier === tier
                                                                                ? 'bg-blue-600 text-white shadow-md'
                                                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                                        }`}
                                                                    >
                                                                        {tier}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        <div className="flex gap-2 pt-2">
                                                            <button
                                                                onClick={() => {
                                                                    setShowSelectionModal(false);
                                                                    setCurrentSubject('');
                                                                }}
                                                                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleConfirmSelection}
                                                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md"
                                                            >
                                                                Confirm
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-8 p-6 bg-gradient-to-r from-gray-100 to-blue-50 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center">
                                        <CheckCircle className="w-5 h-5 text-blue-700" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            Selected: {selectedSubjects.subjects.length} subject{selectedSubjects.subjects.length !== 1 ? 's' : ''}
                                        </p>
                                        <p className="text-gray-600 text-sm">
                                            {selectedSubjects.subjects.map(s => s.name).join(', ') || 'None selected'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 2 && (
                    <div className="border border-gray-200 bg-white rounded-2xl shadow-xl">
                        <div className="p-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Target className="w-6 h-6 text-blue-600" />
                                <h2 className="text-2xl font-bold">Quick Knowledge Check</h2>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Answer questions for each selected subject to help us understand your current level.
                            </p>
                            <div className="space-y-6">
                                <div className="p-4">
                                    <Quiz setNextDisabled={setDisableNext} selectedSubjects={selectedSubjects} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {currentStep === 3 && (
                    <div className="border border-gray-200 bg-white rounded-2xl shadow-xl">
                        <div className="p-8">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className="w-6 h-6 text-blue-600" />
                                <h2 className="text-2xl font-bold">Your Study Preferences</h2>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Tell us about your goals and available time.
                            </p>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Target Grade */}
                                <div>
                                    <label className="text-sm font-medium text-gray-900 mb-2 block">
                                        Target Grade
                                    </label>
                                    <Select
                                        value={preferences.targetGrade}
                                        onValueChange={(val) =>
                                            setPreferences({ ...preferences, targetGrade: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Grade" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Grade</SelectLabel>
                                                {gradeOptions.map((grade) => (
                                                    <SelectItem key={grade} value={grade}>
                                                        Grade {grade}
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-gray-900 mb-2 block">
                                        Study Time Per Week
                                    </label>
                                    <Select
                                        value={preferences.hoursPerWeek}
                                        onValueChange={(val) =>
                                            setPreferences({ ...preferences, hoursPerWeek: val })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Hours" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectLabel>Hours</SelectLabel>
                                                {hoursOptions.map((hours) => (
                                                    <SelectItem key={hours} value={hours}>
                                                        {hours} hours
                                                    </SelectItem>
                                                ))}
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
                                <div className="text-sm text-gray-700 space-y-2">
                                    <div>
                                        <strong>Subjects:</strong>
                                        {selectedSubjects.subjects.map((sel, i) => (
                                            <div key={i} className="ml-4 mt-1">
                                                • {sel.name} - {sel.tier})
                                            </div>
                                        ))}
                                    </div>
                                    <p>
                                        <strong>Target:</strong> Grade {preferences.targetGrade}
                                    </p>
                                    <p>
                                        <strong>Weekly Study:</strong> {preferences.hoursPerWeek} hours
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                <div className="flex justify-between mt-12">
                    <Button
                        variant="outline"
                        onClick={handleBack}
                        disabled={currentStep === 1}
                        className="px-8 py-3 rounded-xl"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 inline" />
                        Back
                    </Button>

                    <Button
                        onClick={handleNext}
                        disabled={!canProceed() || disableNext}
                        className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 px-8 py-3 rounded-xl shadow-lg"
                    >
                        {currentStep === 3 ? 'Generate My Plan' : 'Continue'}
                        <ArrowRight className="w-4 h-4 ml-2 inline" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default OnBoarding;