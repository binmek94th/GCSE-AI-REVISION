'use client'
import { useState } from 'react';
import { CheckCircle, ArrowLeft, ArrowRight, Clock, Target, GraduationCap, BookOpen } from 'lucide-react';
import { EXAM_DATA } from "@/app/onboarding/exam_data";
import Quiz from "@/app/onboarding/Question";
import { QuizResultSuggestion, SubjectSelection } from "@/app/onboarding/Schema";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "@firebase/firestore";
import { QuizSuggestionsDisplay } from "@/app/onboarding/StudyPlanSuggestion";
import {A_Level_EXAM_DATA} from "@/app/onboarding/a-levelExamData";

// Shared shape across GCSE (tiered) and A-Level (untiered) datasets.
type ExamEntry = {
    exam_board: string;
    subject: string;
    level?: string;
    tier?: string;
    note?: string;
};

const ALL_EXAM_DATA: ExamEntry[] = [...EXAM_DATA, ...A_Level_EXAM_DATA];

function OnBoarding() {
    const [currentStep, setCurrentStep] = useState(1);
    const [level, setLevel] = useState<string>(''); // '' until the user picks GCSE / A-Level
    const [selectedSubjects, setSelectedSubjects] = useState<SubjectSelection>({
        examBoard: 'AQA',
        subjects: []
    });
    const [plan, setPlan] = useState<QuizResultSuggestion | null>(null);
    const [showSelectionModal, setShowSelectionModal] = useState(false);
    const [currentSubject, setCurrentSubject] = useState<string>('');
    const [selectedTier, setSelectedTier] = useState<string>('');
    const [selectedTargetGrade, setSelectedTargetGrade] = useState<string>('7');
    const [disableNext, setDisableNext] = useState(false);
    const [showPlan, setShowPlan] = useState(false);
    const [globalExamBoard, setGlobalExamBoard] = useState<string>('AQA');
    const [preferences, setPreferences] = useState({
        hoursPerWeek: '10-15',
        examBoard: "AQA",
        level: "GCSE"
    });

    // Grade scale depends on the level chosen.
    const gradeOptions = level === 'A-Level'
        ? ["A*", "A", "B", "C", "D", "E"]
        : ["9", "8", "7", "6", "5", "4"];
    const defaultGrade = level === 'A-Level' ? 'A' : '7';

    const hoursOptions = ["1-5", "5-10", "10-15", "15-20", "20+"];

    // Everything below is derived from the dataset for the *currently selected* level.
    const activeData = ALL_EXAM_DATA.filter(item => item.level === level);

    // Exam boards are no longer hardcoded — they come straight from the data for this level.
    const examBoards = Array.from(new Set(activeData.map(item => item.exam_board))).sort();

    const getSubjectsForExamBoard = (examBoard: string) =>
        Array.from(new Set(
            activeData
                .filter(item => item.exam_board === examBoard)
                .map(item => item.subject)
        )).sort();

    const uniqueSubjects = getSubjectsForExamBoard(globalExamBoard);

    // A-Level has no tiers, so this returns [] for those subjects.
    const getTiersForSubjectAndBoard = (subject: string, examBoard: string) =>
        Array.from(new Set(
            activeData
                .filter(item => item.subject === subject && item.exam_board === examBoard)
                .map(item => item.tier)
                .filter((t): t is string => Boolean(t))
        ));

    // Pick a sensible exam board for a given level (keep current if it still exists).
    const firstBoardForLevel = (lvl: string) => {
        const boards = Array.from(new Set(
            ALL_EXAM_DATA.filter(item => item.level === lvl).map(item => item.exam_board)
        )).sort();
        return boards.includes(globalExamBoard) ? globalExamBoard : (boards[0] ?? 'AQA');
    };

    const handleLevelSelect = (lvl: string) => {
        const board = firstBoardForLevel(lvl);
        setLevel(lvl);
        setGlobalExamBoard(board);
        // Reset any selection state so we never carry stale subjects across levels.
        setSelectedSubjects({ examBoard: board, subjects: [] });
        setPreferences(p => ({ ...p, examBoard: board, level: lvl }));
        setSelectedTargetGrade(lvl === 'A-Level' ? 'A' : '7');
        setCurrentStep(1);
        setShowSelectionModal(false);
        setCurrentSubject('');
    };

    const handleChangeLevel = () => {
        setLevel('');
        setSelectedSubjects({ examBoard: globalExamBoard, subjects: [] });
        setShowSelectionModal(false);
        setCurrentSubject('');
        setCurrentStep(1);
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
            setSelectedTier(tiers[0] ?? ''); // '' when the subject is untiered (A-Level)
            setSelectedTargetGrade(defaultGrade);
            setShowSelectionModal(true);
        }
    };

    const handleConfirmSelection = () => {
        setSelectedSubjects({
            examBoard: globalExamBoard,
            subjects: [
                ...selectedSubjects.subjects,
                { name: currentSubject, tier: selectedTier, targetGrade: selectedTargetGrade }
            ]
        });
        setShowSelectionModal(false);
    };

    const handleExamBoardChange = (board: string) => {
        setGlobalExamBoard(board);
        setSelectedSubjects({ examBoard: board, subjects: [] });
        setPreferences(p => ({ ...p, examBoard: board }));
        setShowSelectionModal(false);
        setCurrentSubject('');
    };

    const handleSubmission = async () => {
        try {
            const user = auth.currentUser;
            if (user) {
                await setDoc(doc(db, "users", user.uid), {
                    level,
                    examBoard: selectedSubjects.examBoard,
                    subjects: selectedSubjects.subjects,
                    preferences,
                    onboardingComplete: true,
                    updatedAt: new Date(),
                }, { merge: true });
            }
            setShowPlan(true);
        } catch (error) {
            console.error("Error saving onboarding data:", error);
        }
    };

    const handleNext = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
        else handleSubmission();
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const canProceed = () => {
        if (currentStep === 1) return selectedSubjects.subjects.length > 0;
        return true;
    };

    const stepLabels = ['Choose subjects', 'Quick assessment', 'Study preferences'];

    const levelOptions = [
        {
            value: 'GCSE',
            title: 'GCSE',
            subtitle: 'Years 9–11 · Grades 9–1',
            Icon: BookOpen,
        },
        {
            value: 'A-Level',
            title: 'A-Level',
            subtitle: 'Years 12–13 · Grades A*–E',
            Icon: GraduationCap,
        },
    ];

    return (
        /* Force light mode on the entire onboarding page */
        <div className="min-h-screen" style={{
            backgroundColor: '#F8FAFC',
            colorScheme: 'light'
        }}>
            {!level ? (
                /* Step 0 — Level selection */
                <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">
                    <div style={{ marginBottom: 28 }}>
                        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                            What are you studying for?
                        </h1>
                        <p style={{ fontSize: 14, color: '#475569' }}>
                            Pick your level to see the right subjects and grade targets.
                        </p>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 14
                    }}>
                        {levelOptions.map(({ value, title, subtitle, Icon }) => (
                            <button
                                key={value}
                                onClick={() => handleLevelSelect(value)}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 14,
                                    padding: '24px 22px',
                                    borderRadius: 12,
                                    border: '1px solid #E2E8F0',
                                    backgroundColor: '#FFFFFF',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#0EA5E9';
                                    e.currentTarget.style.boxShadow = '0 1px 8px rgba(14,165,233,0.12)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <span style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 10,
                                    backgroundColor: '#F0F9FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon style={{ width: 22, height: 22, color: '#0EA5E9' }} />
                                </span>
                                <span>
                                    <span style={{ display: 'block', fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 2 }}>
                                        {title}
                                    </span>
                                    <span style={{ display: 'block', fontSize: 13, color: '#475569' }}>
                                        {subtitle}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : plan && showPlan ? (
                <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">
                    <QuizSuggestionsDisplay data={plan} />
                </div>
            ) : (
                <div className="max-w-3xl mx-auto px-4 py-10 sm:px-6">

                    {/* Progress header */}
                    <div className="mb-8">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <p style={{ fontSize: 13, color: '#475569' }}>
                                Step {currentStep} of 3 · Takes less than 2 minutes
                            </p>
                            <button
                                onClick={handleChangeLevel}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: '#0EA5E9',
                                    padding: 0
                                }}
                            >
                                {level}
                                <span style={{ color: '#94A3B8', fontWeight: 400 }}>· Change</span>
                            </button>
                        </div>
                        <div style={{
                            height: 4,
                            backgroundColor: '#E2E8F0',
                            borderRadius: 99,
                            overflow: 'hidden',
                            marginBottom: 10
                        }}>
                            <div style={{
                                height: '100%',
                                width: `${(currentStep / 3) * 100}%`,
                                backgroundColor: '#0EA5E9',
                                borderRadius: 99,
                                transition: 'width 0.4s ease'
                            }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            {stepLabels.map((label, i) => (
                                <span key={label} style={{
                                    fontSize: 12,
                                    fontWeight: i + 1 === currentStep ? 600 : 400,
                                    color: i + 1 === currentStep ? '#0EA5E9' : '#94A3B8'
                                }}>
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Step 1 — Subject selection */}
                    {currentStep === 1 && (
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '1.75rem'
                        }}>
                            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>
                                Which subjects are you revising?
                            </h2>
                            <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                                Select your subjects and we&#39;ll personalise your study plan.
                            </p>

                            {/* Exam board chips */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>Exam board</span>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {examBoards.map(board => (
                                        <button
                                            key={board}
                                            onClick={() => handleExamBoardChange(board)}
                                            style={{
                                                padding: '5px 14px',
                                                borderRadius: 99,
                                                border: globalExamBoard === board ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                                backgroundColor: globalExamBoard === board ? '#0EA5E9' : '#FFFFFF',
                                                color: globalExamBoard === board ? '#FFFFFF' : '#0F172A',
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {board}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Subject grid */}
                            {uniqueSubjects.length === 0 ? (
                                <div style={{
                                    border: '1px dashed #E2E8F0',
                                    borderRadius: 8,
                                    padding: '24px 16px',
                                    textAlign: 'center',
                                    fontSize: 13,
                                    color: '#94A3B8'
                                }}>
                                    No {level} subjects available for {globalExamBoard} yet. Try another exam board.
                                </div>
                            ) : (
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                    gap: 10
                                }}>
                                    {uniqueSubjects.map((subject) => {
                                        const isSelected = selectedSubjects.subjects.find(s => s.name === subject);
                                        const isConfiguring = currentSubject === subject && showSelectionModal;
                                        const tiers = getTiersForSubjectAndBoard(subject, globalExamBoard);

                                        return (
                                            <div key={subject}>
                                                <button
                                                    onClick={() => handleSubjectClick(subject)}
                                                    style={{
                                                        width: '100%',
                                                        padding: '14px 16px',
                                                        borderRadius: 8,
                                                        border: isSelected
                                                            ? '1.5px solid #0EA5E9'
                                                            : '1px solid #E2E8F0',
                                                        backgroundColor: isSelected ? '#F0F9FF' : '#FFFFFF',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s',
                                                        position: 'relative'
                                                    }}
                                                >
                                                    <span style={{
                                                        display: 'block',
                                                        fontSize: 14,
                                                        fontWeight: 500,
                                                        color: '#0F172A',
                                                        marginBottom: isSelected ? 2 : 0
                                                    }}>
                                                        {subject}
                                                    </span>
                                                    {isSelected && (
                                                        <span style={{ fontSize: 12, color: '#0EA5E9' }}>
                                                            Grade {isSelected.targetGrade}{isSelected.tier ? ` · ${isSelected.tier}` : ''}
                                                        </span>
                                                    )}
                                                    {isSelected && (
                                                        <span style={{
                                                            position: 'absolute',
                                                            top: 10,
                                                            right: 10,
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: '50%',
                                                            backgroundColor: '#0EA5E9',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <CheckCircle style={{ width: 12, height: 12, color: '#FFFFFF' }} />
                                                        </span>
                                                    )}
                                                </button>

                                                {/* Inline configuration panel */}
                                                {isConfiguring && (
                                                    <div style={{
                                                        marginTop: 6,
                                                        border: '1.5px solid #0EA5E9',
                                                        borderRadius: 8,
                                                        padding: 14,
                                                        backgroundColor: '#FFFFFF'
                                                    }}>
                                                        {/* Tier — only shown when the subject actually has tiers (GCSE) */}
                                                        {tiers.length > 0 && (
                                                            <div style={{ marginBottom: 12 }}>
                                                                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                                                    Tier
                                                                </p>
                                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                    {tiers.map(tier => (
                                                                        <button
                                                                            key={tier}
                                                                            onClick={() => setSelectedTier(tier)}
                                                                            style={{
                                                                                padding: '4px 12px',
                                                                                borderRadius: 6,
                                                                                border: selectedTier === tier ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                                                                backgroundColor: selectedTier === tier ? '#0EA5E9' : '#F8FAFC',
                                                                                color: selectedTier === tier ? '#FFFFFF' : '#0F172A',
                                                                                fontSize: 13,
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            {tier}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Target grade */}
                                                        <div style={{ marginBottom: 12 }}>
                                                            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                                                                Target grade
                                                            </p>
                                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                                {gradeOptions.map(grade => (
                                                                    <button
                                                                        key={grade}
                                                                        onClick={() => setSelectedTargetGrade(grade)}
                                                                        style={{
                                                                            minWidth: 36,
                                                                            height: 36,
                                                                            padding: '0 8px',
                                                                            borderRadius: 6,
                                                                            border: selectedTargetGrade === grade ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                                                            backgroundColor: selectedTargetGrade === grade ? '#0EA5E9' : '#F8FAFC',
                                                                            color: selectedTargetGrade === grade ? '#FFFFFF' : '#0F172A',
                                                                            fontSize: 13,
                                                                            fontWeight: 500,
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        {grade}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div style={{ display: 'flex', gap: 8 }}>
                                                            <button
                                                                onClick={() => { setShowSelectionModal(false); setCurrentSubject(''); }}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '7px 0',
                                                                    borderRadius: 6,
                                                                    border: '1px solid #E2E8F0',
                                                                    backgroundColor: '#F8FAFC',
                                                                    color: '#475569',
                                                                    fontSize: 13,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                onClick={handleConfirmSelection}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '7px 0',
                                                                    borderRadius: 6,
                                                                    border: 'none',
                                                                    backgroundColor: '#0EA5E9',
                                                                    color: '#FFFFFF',
                                                                    fontSize: 13,
                                                                    fontWeight: 500,
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                Confirm
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Selection tray */}
                            <div style={{
                                marginTop: 20,
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: 8,
                                padding: '12px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10
                            }}>
                                <span style={{
                                    backgroundColor: '#0EA5E9',
                                    color: '#FFFFFF',
                                    fontSize: 12,
                                    fontWeight: 600,
                                    borderRadius: 99,
                                    padding: '2px 10px',
                                    flexShrink: 0
                                }}>
                                    {selectedSubjects.subjects.length}
                                </span>
                                <span style={{ fontSize: 13, color: '#475569' }}>
                                    {selectedSubjects.subjects.length === 0
                                        ? 'No subjects selected yet'
                                        : selectedSubjects.subjects.map(s => `${s.name} (Grade ${s.targetGrade})`).join(' · ')}
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Step 2 — Quiz */}
                    {currentStep === 2 && (
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '1.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Target style={{ width: 18, height: 18, color: '#0EA5E9' }} />
                                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>
                                    Quick knowledge check
                                </h2>
                            </div>
                            <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                                Answer questions for each selected subject to help us understand your current level.
                            </p>
                            <Quiz
                                setPlan={setPlan}
                                setNextDisabled={setDisableNext}
                                selectedSubjects={selectedSubjects}
                                level={level}
                            />
                        </div>
                    )}

                    {/* Step 3 — Preferences */}
                    {currentStep === 3 && (
                        <div style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '1.75rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                <Clock style={{ width: 18, height: 18, color: '#0EA5E9' }} />
                                <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A' }}>
                                    Study preferences
                                </h2>
                            </div>
                            <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                                Tell us how much time you have each week.
                            </p>

                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                                    Hours per week
                                </label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {hoursOptions.map(h => (
                                        <button
                                            key={h}
                                            onClick={() => setPreferences(p => ({ ...p, hoursPerWeek: h }))}
                                            style={{
                                                padding: '6px 16px',
                                                borderRadius: 99,
                                                border: preferences.hoursPerWeek === h ? '1.5px solid #0EA5E9' : '1px solid #E2E8F0',
                                                backgroundColor: preferences.hoursPerWeek === h ? '#0EA5E9' : '#FFFFFF',
                                                color: preferences.hoursPerWeek === h ? '#FFFFFF' : '#0F172A',
                                                fontSize: 13,
                                                fontWeight: 500,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s'
                                            }}
                                        >
                                            {h} hrs
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary */}
                            <div style={{
                                backgroundColor: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: 8,
                                padding: '14px 16px'
                            }}>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
                                    Your plan summary
                                </p>
                                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
                                    <p style={{ fontWeight: 500, color: '#0F172A', marginBottom: 2 }}>Level</p>
                                    <p style={{ marginLeft: 8 }}>· {level}</p>
                                    <p style={{ fontWeight: 500, color: '#0F172A', marginTop: 8, marginBottom: 2 }}>Subjects</p>
                                    {selectedSubjects.subjects.map((s, i) => (
                                        <p key={i} style={{ marginLeft: 8 }}>· {s.name} — {s.tier ? `${s.tier}, ` : ''}target grade {s.targetGrade}</p>
                                    ))}
                                    <p style={{ fontWeight: 500, color: '#0F172A', marginTop: 8, marginBottom: 2 }}>Weekly study time</p>
                                    <p style={{ marginLeft: 8 }}>{preferences.hoursPerWeek} hours</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                        <button
                            onClick={handleBack}
                            disabled={currentStep === 1}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 20px',
                                borderRadius: 8,
                                border: '1px solid #E2E8F0',
                                backgroundColor: '#FFFFFF',
                                color: '#0F172A',
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
                                opacity: currentStep === 1 ? 0.4 : 1,
                                transition: 'all 0.15s'
                            }}
                        >
                            <ArrowLeft style={{ width: 16, height: 16 }} />
                            Back
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={!canProceed() || disableNext}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '9px 22px',
                                borderRadius: 8,
                                border: 'none',
                                backgroundColor: '#0EA5E9',
                                color: '#FFFFFF',
                                fontSize: 14,
                                fontWeight: 500,
                                cursor: (!canProceed() || disableNext) ? 'not-allowed' : 'pointer',
                                opacity: (!canProceed() || disableNext) ? 0.4 : 1,
                                transition: 'all 0.15s'
                            }}
                        >
                            {currentStep === 3 ? 'Show my plan' : 'Continue'}
                            <ArrowRight style={{ width: 16, height: 16 }} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default OnBoarding;