'use client'

import { useEffect, useState } from "react";
import { Mail, Calendar, Package, Clock, Award, TrendingUp, Edit2, X, Check, BookOpen, Target, CalendarClock, GraduationCap, Users } from "lucide-react";
import { auth } from "@/lib/firebase";
import Spinner from "@/app/components/ui/Spinner";
import {useRouter} from "next/navigation";
import SubscriptionPage from "@/app/dashboard/subscription/page";
import {Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import { toast } from "sonner";

interface ProfileData {
    email: string;
    displayName: string | null;
    createdAt: string;
    tokens: number;
    totalStudyHours: number;
    studyPacks: number;
    parentEmail?: string | null;
    stats: {
        quizzesCompleted: number;
        averageScore: number;
        totalQuestions: number;
        correctAnswers: number;
        subjectProgress: {
            [subject: string]: {
                total: number;
                correct: number;
                accuracy: number;
            };
        };
        aiInteractions: {
            total: number;
        };
    };
    preferences?: {
        examBoard: string;
        hoursPerWeek: string;
        targetGrade: string;
        level: string;
    };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ✅ Exam boards available per level. GCSE only offers the boards that
// actually have GCSE content; A-Level includes the full set.
const EXAM_BOARDS_BY_LEVEL: Record<string, { value: string; label: string }[]> = {
    "GCSE": [
        { value: "AQA", label: "AQA" },
        { value: "OCR", label: "OCR" },
        { value: "Edexcel", label: "Edexcel" },
        { value: "WJEC", label: "WJEC" },
    ],
    "A-Level": [
        { value: "AQA", label: "AQA" },
        { value: "OCR", label: "OCR" },
        { value: "Edexcel", label: "Edexcel" },
        { value: "WJEC", label: "WJEC" },
        { value: "CCEA", label: "CCEA" },
        { value: "Oxford AQA", label: "Oxford AQA" },
        { value: "Cambridge (CIE)", label: "Cambridge (CIE)" },
    ],
};

export default function ProfilePage() {
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter()
    const [user, setUser] = useState<any>(null);
    const [isEditingPreferences, setIsEditingPreferences] = useState(false);
    const [editedPreferences, setEditedPreferences] = useState({
        examBoard: "",
        hoursPerWeek: "",
        targetGrade: "",
        level: ""
    });
    const [savingPreferences, setSavingPreferences] = useState(false);

    // Parent email
    const [isEditingParentEmail, setIsEditingParentEmail] = useState(false);
    const [editedParentEmail, setEditedParentEmail] = useState("");
    const [savingParentEmail, setSavingParentEmail] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!currentUser) {
                router.push("/auth/login");
                return;
            }

            setUser(currentUser);

            try {
                const idToken = await currentUser.getIdToken();

                const response = await fetch("/api/profile", {
                    headers: {
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                if (!response.ok) throw new Error("Failed to fetch profile");

                const data = await response.json();
                setProfileData(data);

                // Initialize edited preferences with current values
                if (data.preferences) {
                    setEditedPreferences(data.preferences);
                }
                setEditedParentEmail(data.parentEmail ?? "");

            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleEditPreferences = () => {
        if (profileData?.preferences) {
            setEditedPreferences(profileData.preferences);
        }
        setIsEditingPreferences(true);
    };

    const handleCancelEdit = () => {
        setIsEditingPreferences(false);
        if (profileData?.preferences) {
            setEditedPreferences(profileData.preferences);
        }
    };

    const handleSavePreferences = async () => {
        if (!user) return;

        setSavingPreferences(true);
        try {
            const idToken = await user.getIdToken();

            const response = await fetch("/api/profile/preferences", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${idToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(editedPreferences),
            });

            if (!response.ok) throw new Error("Failed to update preferences");

            const updatedData = await response.json();

            // Update local state
            setProfileData(prev => prev ? {
                ...prev,
                preferences: editedPreferences
            } : null);

            setIsEditingPreferences(false);
            toast.success("Preferences updated");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save preferences");
        } finally {
            setSavingPreferences(false);
        }
    };

    const handleEditParentEmail = () => {
        setEditedParentEmail(profileData?.parentEmail ?? "");
        setIsEditingParentEmail(true);
    };

    const handleCancelParentEmail = () => {
        setIsEditingParentEmail(false);
        setEditedParentEmail(profileData?.parentEmail ?? "");
    };

    const handleSaveParentEmail = async () => {
        if (!user) return;

        const trimmed = editedParentEmail.trim();
        // Allow clearing; otherwise require a valid email.
        if (trimmed && !EMAIL_RE.test(trimmed)) {
            toast.error("Please enter a valid email address.");
            return;
        }

        setSavingParentEmail(true);
        try {
            const idToken = await user.getIdToken();

            const response = await fetch("/api/profile/parent-email", {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${idToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ parentEmail: trimmed || null }),
            });

            if (!response.ok) throw new Error("Failed to update parent email");

            setProfileData(prev => prev ? { ...prev, parentEmail: trimmed || null } : null);
            setIsEditingParentEmail(false);
            toast.success(trimmed ? "Parent email saved" : "Parent email removed");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save parent email");
        } finally {
            setSavingParentEmail(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return <Spinner />;
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-red-700">
                Error loading profile: {error}
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                No profile data available
            </div>
        );
    }

    // ✅ Exam board options for the currently selected level in the edit form.
    // Falls back to the full A-Level list if level isn't set yet, so the
    // dropdown isn't empty before a level is chosen.
    const availableExamBoards =
        EXAM_BOARDS_BY_LEVEL[editedPreferences.level] ?? EXAM_BOARDS_BY_LEVEL["A-Level"];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Simple Profile Header */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-3xl font-bold">
                        {(profileData.displayName || user?.email || "U")[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {profileData.displayName || "Student"}
                        </h2>
                        <p className="text-gray-600 text-sm mt-1 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {profileData.email}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                            <Calendar className="w-4 h-4" />
                            Joined {formatDate(profileData.createdAt)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                    <Clock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{Math.floor(profileData.totalStudyHours)}</div>
                    <div className="text-xs text-gray-600">Study Hours</div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                    <Package className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{profileData.studyPacks}</div>
                    <div className="text-xs text-gray-600">Study Packs</div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                    <Award className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{profileData.stats.quizzesCompleted}</div>
                    <div className="text-xs text-gray-600">Quizzes Done</div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-gray-900">{profileData.stats.averageScore.toFixed(0)}%</div>
                    <div className="text-xs text-gray-600">Avg Score</div>
                </div>
            </div>

            {/* Parent Email Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Parent Email</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Where we send weekly progress updates
                        </p>
                    </div>
                    {!isEditingParentEmail && (
                        <button
                            onClick={handleEditParentEmail}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit
                        </button>
                    )}
                </div>

                {isEditingParentEmail ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Parent / guardian email
                            </label>
                            <input
                                type="email"
                                value={editedParentEmail}
                                onChange={(e) => setEditedParentEmail(e.target.value)}
                                placeholder="parent@example.com"
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Leave blank to stop progress emails.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={handleSaveParentEmail}
                                disabled={savingParentEmail}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {savingParentEmail ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                            <button
                                onClick={handleCancelParentEmail}
                                disabled={savingParentEmail}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </button>
                        </div>
                    </div>
                ) : profileData.parentEmail ? (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                        <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                            <div className="text-xs text-gray-600 mb-1">Parent / guardian</div>
                            <div className="text-sm font-semibold text-gray-900 break-all">
                                {profileData.parentEmail}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-500">No parent email added yet.</p>
                        <button
                            onClick={handleEditParentEmail}
                            className="shrink-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            Add Email
                        </button>
                    </div>
                )}
            </div>

            {/* Study Preferences Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Study Preferences</h3>
                    {!isEditingPreferences && (
                        <button
                            onClick={handleEditPreferences}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <Edit2 className="w-4 h-4" />
                            Edit
                        </button>
                    )}
                </div>

                {profileData.preferences ? (
                    isEditingPreferences ? (
                        <div className="space-y-4">
                            {/* Level */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Level
                                </label>
                                <Select
                                    value={editedPreferences.level}
                                    onValueChange={(value) =>
                                        setEditedPreferences((prev) => {
                                            // ✅ If the newly selected level doesn't offer the
                                            // currently chosen exam board, clear it so an
                                            // invalid combination can't be saved silently.
                                            const stillValid = EXAM_BOARDS_BY_LEVEL[value]?.some(
                                                (b) => b.value === prev.examBoard
                                            );
                                            return {
                                                ...prev,
                                                level: value,
                                                examBoard: stillValid ? prev.examBoard : "",
                                            };
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Levels</SelectLabel>
                                            <SelectItem value="GCSE">GCSE</SelectItem>
                                            <SelectItem value="A-Level">A-Level</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Exam Board */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Exam Board
                                </label>
                                <Select
                                    value={editedPreferences.examBoard}
                                    onValueChange={(value) =>
                                        setEditedPreferences((prev) => ({
                                            ...prev,
                                            examBoard: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select exam board" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Exam Boards</SelectLabel>
                                            {availableExamBoards.map((board) => (
                                                <SelectItem key={board.value} value={board.value}>
                                                    {board.label}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Hours Per Week */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Study Hours Per Week
                                </label>
                                <Select
                                    value={editedPreferences.hoursPerWeek}
                                    onValueChange={(value) =>
                                        setEditedPreferences((prev) => ({
                                            ...prev,
                                            hoursPerWeek: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select hours" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Weekly Hours</SelectLabel>
                                            <SelectItem value="0-5">0–5 hours</SelectItem>
                                            <SelectItem value="5-10">5–10 hours</SelectItem>
                                            <SelectItem value="10-15">10–15 hours</SelectItem>
                                            <SelectItem value="15-20">15–20 hours</SelectItem>
                                            <SelectItem value="20+">20+ hours</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Target Grade */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Target Grade
                                </label>
                                <Select
                                    value={editedPreferences.targetGrade}
                                    onValueChange={(value) =>
                                        setEditedPreferences((prev) => ({
                                            ...prev,
                                            targetGrade: value,
                                        }))
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select target grade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Grades</SelectLabel>
                                            <SelectItem value="4">Grade 4 (C)</SelectItem>
                                            <SelectItem value="5">Grade 5 (B)</SelectItem>
                                            <SelectItem value="6">Grade 6 (B)</SelectItem>
                                            <SelectItem value="7">Grade 7 (A)</SelectItem>
                                            <SelectItem value="8">Grade 8 (A*)</SelectItem>
                                            <SelectItem value="9">Grade 9 (A*)</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSavePreferences}
                                    disabled={savingPreferences}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {savingPreferences ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Save Changes
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={savingPreferences}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <GraduationCap className="w-5 h-5 text-indigo-600 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Level</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {profileData.preferences.level || "—"}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <BookOpen className="w-5 h-5 text-blue-600 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Exam Board</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {profileData.preferences.examBoard}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <CalendarClock className="w-5 h-5 text-green-600 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Weekly Study Hours</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {profileData.preferences.hoursPerWeek} hours
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                                <Target className="w-5 h-5 text-purple-600 mt-0.5" />
                                <div>
                                    <div className="text-xs text-gray-600 mb-1">Target Grade</div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        Grade {profileData.preferences.targetGrade}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p className="mb-3">No study preferences set yet</p>
                        <button
                            onClick={handleEditPreferences}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Set Preferences
                        </button>
                    </div>
                )}
            </div>

            {/* Subject Progress Section */}
            {profileData.stats.subjectProgress && Object.keys(profileData.stats.subjectProgress).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress by Subject</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(profileData.stats.subjectProgress)
                            .sort((a, b) => b[1].total - a[1].total) // Sort by most questions attempted
                            .map(([subject, progress]) => (
                                <div key={subject} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 capitalize">{subject}</h4>
                                        <span className={`text-sm font-bold ${
                                            progress.accuracy >= 70 ? 'text-green-600' :
                                                progress.accuracy >= 50 ? 'text-yellow-600' :
                                                    'text-red-600'
                                        }`}>
                                            {progress.accuracy}%
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                progress.accuracy >= 70 ? 'bg-green-500' :
                                                    progress.accuracy >= 50 ? 'bg-yellow-500' :
                                                        'bg-red-500'
                                            }`}
                                            style={{ width: `${progress.accuracy}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between text-xs text-gray-600">
                                        <span>{progress.correct} / {progress.total} correct</span>
                                        <span>{progress.total} questions</span>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Subscription Component */}
            <SubscriptionPage />
        </div>
    );
}