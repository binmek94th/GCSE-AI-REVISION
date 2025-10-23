
'use client'

import { BookOpen, TrendingUp, Target, Lightbulb, CheckCircle2, XCircle, X } from 'lucide-react';
import { useState } from 'react';
import {QuizResultSuggestion, QuizSuggestionRecommendation} from "@/app/onboarding/Schema";
import {MarkdownContent} from "@/app/dashboard/study_materials/Markdown";
import {useRouter} from "next/navigation";
import {Button} from "@/app/components/button";

interface Props {
    data: QuizResultSuggestion;
    onMaterialClick?: (materialId: string) => void;
}

export function QuizSuggestionsDisplay({ data, onMaterialClick }: Props) {
    const { suggestions, metadata } = data;
    const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
    const router = useRouter();

    const getAccuracyColor = (accuracy: number) => {
        if (accuracy >= 80) return 'text-green-600';
        if (accuracy >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getAccuracyBgColor = (accuracy: number) => {
        if (accuracy >= 80) return 'bg-green-50 border-green-200';
        if (accuracy >= 60) return 'bg-yellow-50 border-yellow-200';
        return 'bg-red-50 border-red-200';
    };

    const handleMaterialClick = (material: any) => {
        setSelectedMaterial(material);
        onMaterialClick?.(material.id);
    };

    const handleContinue = () => {
        router.push("/dashboard");
    }

    return (
        <>
            {/* Material Modal */}
            {selectedMaterial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-300">
                        {/* Modal Header */}
                        <div className="flex items-start justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                    {selectedMaterial.title}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-medium">
                                        {selectedMaterial.subject}
                                    </span>
                                    {selectedMaterial.difficulty && (
                                        <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-medium">
                                            {selectedMaterial.difficulty}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedMaterial(null)}
                                className="flex-shrink-0 ml-4 p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {selectedMaterial.content ? (
                                <MarkdownContent content={selectedMaterial.content} />
                            ) : (
                                <p className="text-gray-500 text-center py-8">
                                    No content available for this material.
                                </p>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedMaterial(null)}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {/* Overall Analysis Card */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                    <div className="flex items-start gap-3 mb-3">
                        <div className="flex-shrink-0 w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                            <Lightbulb className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                Overall Analysis
                            </h3>
                            <p className="text-gray-700 leading-relaxed">
                                {suggestions.overallAnalysis}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Performance Summary */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Performance by Subject
                        </h3>
                    </div>

                    <div className="grid gap-3">
                        {metadata.subjectAnalysis.map((subject, idx) => (
                            <div
                                key={idx}
                                className={`p-4 rounded-lg border-2 transition-all ${getAccuracyBgColor(subject.accuracy)}`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">
                                        {subject.subject}
                                    </span>
                                        {subject.accuracy >= 70 ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-red-600" />
                                        )}
                                    </div>
                                    <div className={`text-2xl font-bold ${getAccuracyColor(subject.accuracy)}`}>
                                        {subject.accuracy}%
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                <span>
                                    <strong className="text-gray-900">{subject.correct}</strong> correct
                                </span>
                                    <span>•</span>
                                    <span>
                                    <strong className="text-gray-900">{subject.total - subject.correct}</strong> incorrect
                                </span>
                                    <span>•</span>
                                    <span>
                                    <strong className="text-gray-900">{subject.total}</strong> total
                                </span>
                                </div>

                                {/* Progress Bar */}
                                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${
                                            subject.accuracy >= 80
                                                ? 'bg-green-500'
                                                : subject.accuracy >= 60
                                                    ? 'bg-yellow-500'
                                                    : 'bg-red-500'
                                        }`}
                                        style={{ width: `${subject.accuracy}%` }}
                                    ></div>
                                </div>

                                {/* Show struggled questions if any */}
                                {subject.incorrectQuestions.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-xs font-medium text-gray-700 mb-1">
                                            Areas needing attention:
                                        </p>
                                        <ul className="text-xs text-gray-600 space-y-1">
                                            {subject.incorrectQuestions.map((q, qIdx) => (
                                                <li key={qIdx} className="line-clamp-1">• {q}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                            Recommended Study Materials
                        </h3>
                    </div>

                    {suggestions.recommendations.length === 0 ? (
                        <div className="text-center py-8">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                            <p className="text-gray-600">
                                Great job! You&#39;re doing well across all subjects.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {suggestions.recommendations.map((rec: QuizSuggestionRecommendation, idx) => (
                                <div
                                    key={idx}
                                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 border border-blue-200"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="flex-shrink-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 text-lg mb-2">
                                                {rec.subject}
                                            </h4>
                                            <p className="text-sm text-gray-700 mb-4">
                                                {rec.reasoning}
                                            </p>

                                            {rec.materials && rec.materials.length > 0 && (
                                                <div className="space-y-2">
                                                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                                                        Suggested Materials:
                                                    </p>
                                                    {rec.materials.map((material) => (
                                                        <button
                                                            key={material.id}
                                                            onClick={() => handleMaterialClick(material)}
                                                            className="w-full bg-white p-4 rounded-lg border-2 border-indigo-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="flex-1">
                                                                    <h5 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors mb-1">
                                                                        {material.title}
                                                                    </h5>
                                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <span className="bg-gray-100 px-2 py-1 rounded">
                                                                        {material.subject}
                                                                    </span>
                                                                        {material.difficulty && (
                                                                            <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                                                                            {material.difficulty}
                                                                        </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <svg
                                                                    className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth={2}
                                                                        d="M9 5l7 7-7 7"
                                                                    />
                                                                </svg>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Study Plan */}
                {suggestions.studyPlan && (
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200">
                        <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                                <Target className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Your Personalized Study Plan
                                </h3>
                                <p className="text-gray-700 leading-relaxed">
                                    {suggestions.studyPlan}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Summary Stats */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-around text-center">
                        <div>
                            <div className="text-2xl font-bold text-gray-900">
                                {metadata.totalQuestions}
                            </div>
                            <div className="text-xs text-gray-600">Total Questions</div>
                        </div>
                        <div className="w-px h-10 bg-gray-300"></div>
                        <div>
                            <div className="text-2xl font-bold text-green-600">
                                {metadata.totalQuestions - metadata.incorrectCount}
                            </div>
                            <div className="text-xs text-gray-600">Correct</div>
                        </div>
                        <div className="w-px h-10 bg-gray-300"></div>
                        <div>
                            <div className="text-2xl font-bold text-red-600">
                                {metadata.incorrectCount}
                            </div>
                            <div className="text-xs text-gray-600">Incorrect</div>
                        </div>
                        <div className="w-px h-10 bg-gray-300"></div>
                        <div>
                            <div className="text-2xl font-bold text-indigo-600">
                                {Math.round(((metadata.totalQuestions - metadata.incorrectCount) / metadata.totalQuestions) * 100)}%
                            </div>
                            <div className="text-xs text-gray-600">Overall Score</div>
                        </div>
                    </div>
                </div>
            </div>
            <div className={"flex justify-end mt-6"}>
                <Button onClick={handleContinue}>Continue</Button>
            </div>
        </>
    );
}