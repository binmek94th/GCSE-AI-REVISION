'use client';

import { useState, useEffect, useRef } from 'react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {EXAM_DATA} from "@/app/onboarding/exam_data";
import Spinner from "@/app/components/ui/Spinner";
import {toast} from "sonner";
import ReactCrop, {type Crop, type PixelCrop} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export interface Choice {
    option: string;        // "A", "B", "C", "D"
    text: string;
    isCorrect: boolean;
}

export interface Question {
    id: string;

    // Question text: GCSE used `question`, A-Level uses `questionText`.
    questionText?: string;
    question?: string;

    // Options: GCSE stores `options` (array or map); A-Level stores `choices`.
    options?: string[] | { [key: string]: string };
    choices?: Choice[];

    // Correct answer: GCSE fields. A-Level derives it from choices[].isCorrect.
    correct_answer?: string;
    correctAnswer?: string;

    explanation?: string;
    subject: string;

    // Classification: A-Level uses `topic` + `tier` ("AS"/"A2"); GCSE uses `tier`.
    topic?: string;
    tier?: string;

    difficulty: 'easy' | 'medium' | 'hard';

    // A-Level docs don't carry question_type; component defaults to 'quiz'.
    question_type?: 'quiz' | 'mock_test';

    marks?: number | null;

    // A-Level extraction fields.
    imageUrl?: string | null;
    hasImage?: boolean;
    validationStatus?: 'pass' | 'review' | 'fail';
    needsReview?: boolean;
    qualification?: string;
    examBoard?: string;

    flag?: string;

    moderation_status?: 'pending' | 'approved' | 'rejected' | 'deleted';
    moderated_at?: any;
    moderation_notes?: string;

    created_at?: any;
    updated_at?: any;
    createdAt?: any;
    updatedAt?: any;
}

// Route Storage images through a same-origin proxy so the crop canvas isn't
// CORS-tainted (Firebase download URLs aren't served with permissive CORS).
// Uses the same /api/proxy-image route as the GCSE cropping flow.
const getCropSrc = (url: string) =>
    `/api/proxy-image?url=${encodeURIComponent(url)}`;

// Draw the selected crop region (in natural-resolution pixels) onto a canvas
// and export a JPEG blob.
async function getCroppedBlob(image: HTMLImageElement, crop: PixelCrop): Promise<Blob> {
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(crop.width * scaleX));
    canvas.height = Math.max(1, Math.floor(crop.height * scaleY));

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas 2d context');

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
        image,
        crop.x * scaleX,
        crop.y * scaleY,
        crop.width * scaleX,
        crop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error('Canvas is empty'))),
            'image/jpeg',
            0.92,
        );
    });
}

function blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

// Build a windowed page list with ellipses for large page counts.
// Always shows up to `windowSize` numbered pages (default 7), keeping the
// current page centred where possible and clamping at the ends.
function buildPageList(current: number, total: number, windowSize = 7): (number | 'dots')[] {
    if (total <= windowSize) {
        return Array.from({ length: total }, (_, i) => i + 1);
    }

    const side = Math.floor(windowSize / 2);
    let start = Math.max(1, current - side);
    let end = start + windowSize - 1;

    // Clamp to the end and re-pull start back so we always show `windowSize` numbers.
    if (end > total) {
        end = total;
        start = end - windowSize + 1;
    }

    const pages: (number | 'dots')[] = [];

    // Always anchor page 1, with a leading ellipsis if there's a gap.
    if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('dots');
    }

    for (let i = start; i <= end; i++) pages.push(i);

    // Always anchor the last page, with a trailing ellipsis if there's a gap.
    if (end < total) {
        if (end < total - 1) pages.push('dots');
        pages.push(total);
    }

    return pages;
}

export default function ALevelQuestionsModeration() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [filters, setFilters] = useState({
        subject: '',
        status: 'all',
        flag: 'all',
    });

    // Pagination state (offset/page-number based)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1,
        hasMore: false,
    });

    // Image cropping state
    const imgRef = useRef<HTMLImageElement | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [cropSaving, setCropSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        question_text: '',
        options: [] as string[],
        correct_answer: '',
        explanation: '',
        subject: '',
        topic: '',
        difficulty: 'medium' as 'easy' | 'medium' | 'hard',
        question_type: 'quiz' as 'quiz' | 'mock_test',
        marks: 1,
        moderation_status: '',
        moderation_notes: '',
    });

    useEffect(() => {
        // Reset to page 1 whenever filters change.
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchQuestions(1);
    }, [filters]);

    const handleRemoveImage = async () => {
        if (!selectedQuestion) return;
        if (!confirm('Remove the image from this question? This also deletes the file from storage and cannot be undone.')) return;

        try {
            const response = await fetch(`/api/teacher/alevel-questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ removeImage: true }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Image removed');
                setIsCropping(false);
                updateQuestionInList(selectedQuestion.id, { imageUrl: null, hasImage: false });
            } else {
                toast.error(data.error || 'Failed to remove image');
            }
        } catch (error) {
            console.error('Error removing image:', error);
            toast.error('Failed to remove image');
        }
    };

    const fetchQuestions = async (page: number = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.status) params.append('status', filters.status);
            if (filters.flag && filters.flag !== 'all') params.append('flag', filters.flag);
            params.append('page', page.toString());
            params.append('limit', pagination.limit.toString());

            const response = await fetch(`/api/teacher/alevel-questions?${params}`);
            const data = await response.json();

            if (data.success) {
                setQuestions(data.questions);
                setPagination(prev => ({
                    ...prev,
                    page,
                    total: data.pagination.total ?? 0,
                    totalPages: data.pagination.totalPages ?? 1,
                    hasMore: data.pagination.hasMore ?? false,
                }));
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
            toast.error('Failed to fetch questions');
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page: number) => {
        if (loading) return;
        if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
        fetchQuestions(page);
    };

    const handleNextPage = () => goToPage(pagination.page + 1);
    const handlePreviousPage = () => goToPage(pagination.page - 1);

    const subjects = Array.from(new Set(EXAM_DATA.map(e => e.subject))).sort();

    const updateQuestionInList = (questionId: string, updates: Partial<Question>) => {
        setQuestions(prevQuestions =>
            prevQuestions.map(q =>
                q.id === questionId ? { ...q, ...updates } : q
            )
        );

        if (selectedQuestion?.id === questionId) {
            setSelectedQuestion(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    const removeQuestionFromList = (questionId: string) => {
        setQuestions(prevQuestions =>
            prevQuestions.filter(q => q.id !== questionId)
        );

        if (selectedQuestion?.id === questionId) {
            setSelectedQuestion(null);
        }
    };

    const handleSelectQuestion = (question: Question) => {
        setSelectedQuestion(question);
        // Leave crop mode whenever a different question is opened.
        setIsCropping(false);

        // A-Level questions store their options in a `choices` array of objects:
        // { option: "A", isCorrect: boolean, text: string }
        // Fall back to the GCSE-style `options` shape if `choices` is absent.
        let optionsArray: string[] = [];
        let correctAnswerText = '';

        if (Array.isArray(question.choices) && question.choices.length > 0) {
            optionsArray = question.choices.map((c: any) => c.text);
            correctAnswerText = question.choices.find((c: any) => c.isCorrect)?.text ?? '';
        } else if (question.options) {
            optionsArray = Array.isArray(question.options)
                ? question.options
                : Object.values(question.options);
            correctAnswerText = typeof question.options === 'object' && !Array.isArray(question.options)
                ? question.options[question.correctAnswer] || question.correct_answer
                : question.correct_answer;
        }

        setEditForm({
            question_text: question.questionText ?? question.question ?? '',
            options: optionsArray,
            correct_answer: correctAnswerText,
            explanation: question.explanation || '',
            subject: question.subject,
            topic: question.topic ?? question.tier ?? '',
            difficulty: question.difficulty,
            question_type: question.question_type ?? 'quiz',
            marks: question.marks || 1,
            moderation_status: question.moderation_status || 'pending',
            moderation_notes: question.moderation_notes || '',
        });
        setEditMode(false);
    };

    const startCrop = () => {
        setCrop(undefined);          // initialised on image load
        setCompletedCrop(undefined);
        setIsCropping(true);
    };

    const onCropImageLoad = (_e: React.SyntheticEvent<HTMLImageElement>) => {
        // Start with a centred, free-form selection covering most of the image.
        setCrop({ unit: '%', x: 5, y: 5, width: 90, height: 90 });
    };

    const handleSaveCrop = async () => {
        if (!selectedQuestion || !selectedQuestion.imageUrl) return;
        if (!imgRef.current || !completedCrop?.width || !completedCrop?.height) {
            toast.error('Select a crop area first');
            return;
        }

        setCropSaving(true);
        try {
            const blob = await getCroppedBlob(imgRef.current, completedCrop);
            const dataUrl = await blobToDataURL(blob);

            const response = await fetch(`/api/teacher/alevel-questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ croppedImage: dataUrl }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Image cropped');
                // Prefer the URL the server returns; otherwise cache-bust so the
                // overwritten file refreshes in the <img>.
                const newUrl =
                    data.imageUrl ??
                    `${selectedQuestion.imageUrl}${selectedQuestion.imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
                updateQuestionInList(selectedQuestion.id, { imageUrl: newUrl, hasImage: true });
                setIsCropping(false);
            } else {
                toast.error(data.error || 'Failed to crop image');
            }
        } catch (error) {
            console.error('Error cropping image:', error);
            toast.error('Failed to crop image');
        } finally {
            setCropSaving(false);
        }
    };

    const handleUpdateQuestion = async () => {
        if (!selectedQuestion) return;

        try {
            const response = await fetch(`/api/teacher/alevel-questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Question updated successfully!');
                updateQuestionInList(selectedQuestion.id, data.question);
                setEditMode(false);
            } else {
                toast.error(data.error || 'Failed to update question');
            }
        } catch (error) {
            console.error('Error updating question:', error);
            toast.error('Failed to update question');
        }
    };

    const handleApprove = async () => {
        if (!selectedQuestion) return;

        try {
            const response = await fetch(`/api/teacher/alevel-questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moderation_status: 'approved',
                    moderation_notes: editForm.moderation_notes,
                }),
            });

            if (response.ok) {
                toast.success('Question approved!');
                updateQuestionInList(selectedQuestion.id, {
                    moderation_status: 'approved',
                    moderation_notes: editForm.moderation_notes,
                });
                if (filters.status === 'pending') {
                    removeQuestionFromList(selectedQuestion.id);
                }
            } else {
                toast.error("Error approving question");
            }
        } catch (error) {
            console.error('Error approving question:', error);
            toast.error("Error approving question");
        }
    };

    const handleReject = async () => {
        if (!selectedQuestion) return;

        const notes = prompt('Rejection reason:');
        if (!notes) return;

        try {
            const response = await fetch(`/api/teacher/alevel-questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moderation_status: 'rejected',
                    moderation_notes: notes,
                }),
            });

            if (response.ok) {
                toast.success('Question rejected');
                updateQuestionInList(selectedQuestion.id, {
                    moderation_status: 'rejected',
                    moderation_notes: notes,
                });
                if (filters.status === 'pending') {
                    removeQuestionFromList(selectedQuestion.id);
                }
            } else {
                toast.error('Error rejecting question');
            }
        } catch (error) {
            console.error('Error rejecting question:', error);
            toast.error("Error rejecting question");
        }
    };

    const handleDelete = async () => {
        if (!selectedQuestion) return;
        if (!confirm('Are you sure you want to delete this question?')) return;

        try {
            const response = await fetch(`/api/teacher/alevel-questions/${selectedQuestion.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Question deleted');
                removeQuestionFromList(selectedQuestion.id);
            } else {
                toast.error('Error deleting question');
            }
        } catch (error) {
            console.error('Error deleting question:', error);
            toast.error("Error deleting question");
        }
    };

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...editForm.options];
        newOptions[index] = value;
        setEditForm(prev => ({ ...prev, options: newOptions }));
    };

    const handleAddOption = () => {
        setEditForm(prev => ({
            ...prev,
            options: [...prev.options, ''],
        }));
    };

    const handleRemoveOption = (index: number) => {
        const newOptions = editForm.options.filter((_, i) => i !== index);
        setEditForm(prev => ({ ...prev, options: newOptions }));
    };

    const getStatusBadgeClass = (status: string | undefined) => {
        switch (status) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default:         return 'bg-yellow-100 text-yellow-800'; // pending
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">A-Level Questions Moderation</h1>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Subject
                            </label>
                            <Select
                                value={filters.subject}
                                onValueChange={(value) =>
                                    setFilters(prev => ({ ...prev, subject: value }))
                                }
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="All Subjects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Subjects</SelectItem>
                                    {subjects.map(subject => (
                                        <SelectItem key={subject} value={subject}>
                                            {subject}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <Select
                                value={filters.status}
                                onValueChange={(value) =>
                                    setFilters(prev => ({ ...prev, status: value }))
                                }
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Flag */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Flag
                            </label>
                            <Select
                                value={filters.flag}
                                onValueChange={(value) =>
                                    setFilters(prev => ({ ...prev, flag: value }))
                                }
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="All Flags" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Flags</SelectItem>
                                    <SelectItem value="irrelevant">Irrelevant</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reset */}
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({ subject: 'all', status: 'all', flag: 'all' })}
                                className="w-full px-3 py-2 border cursor-pointer border-gray-300 rounded-md text-sm bg-gray-50 hover:bg-gray-100"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? <Spinner /> :
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Questions List */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b flex items-center justify-between">
                                <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
                                <span className="text-sm text-gray-500">{pagination.total} total</span>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
                                {questions.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">No questions found</div>
                                ) : (
                                    questions.map((question) => (
                                        <div
                                            key={question.id}
                                            onClick={() => handleSelectQuestion(question)}
                                            className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                                                selectedQuestion?.id === question.id ? 'bg-blue-50' : ''
                                            }`}
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900 line-clamp-2">
                                                        {question.questionText ?? question.question}
                                                    </p>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                                            {question.subject}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                                            {question.difficulty}
                                                        </span>
                                                        <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                                            {question.topic ?? question.tier}
                                                        </span>
                                                        {question.flag && (
                                                            <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                                                                🚩 {question.flag}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`ml-2 px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${getStatusBadgeClass(question.moderation_status)}`}>
                                                    {question.moderation_status || 'pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Pagination Controls */}
                            <div className="p-4 border-t bg-gray-50 flex flex-wrap items-center justify-center gap-1">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={pagination.page === 1 || loading}
                                    className="px-3 py-2 text-sm font-medium cursor-pointer text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ←
                                </button>

                                {buildPageList(pagination.page, pagination.totalPages).map((p, i) =>
                                    p === 'dots' ? (
                                        <span key={`dots-${i}`} className="px-2 text-gray-400 select-none">…</span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => goToPage(p)}
                                            disabled={loading}
                                            className={`min-w-[2.25rem] px-3 py-2 text-sm font-medium cursor-pointer rounded-md border disabled:cursor-not-allowed ${
                                                p === pagination.page
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                )}

                                <button
                                    onClick={handleNextPage}
                                    disabled={!pagination.hasMore || loading}
                                    className="px-3 py-2 text-sm font-medium cursor-pointer text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    →
                                </button>
                            </div>
                        </div>

                        {/* Question Details & Edit */}
                        <div className="bg-white rounded-lg shadow">
                            {selectedQuestion ? (
                                <>
                                    <div className="p-4 border-b flex justify-between items-center">
                                        <h2 className="text-xl font-semibold">Question Details</h2>
                                        <button
                                            onClick={() => setEditMode(!editMode)}
                                            className="px-4 py-2 cursor-pointer bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            {editMode ? 'Cancel Edit' : 'Edit'}
                                        </button>
                                    </div>

                                    <div className="overflow-y-auto max-h-[calc(100vh-300px)] p-4">
                                        {!editMode ? (
                                            // View Mode
                                            <>
                                                <div className="mb-4">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">Question:</p>
                                                    <p className="text-gray-900">{selectedQuestion.questionText ?? selectedQuestion.question}</p>
                                                </div>

                                                {/* Question image, if present */}
                                                {selectedQuestion.imageUrl && (
                                                    <div className="mb-4">
                                                        {isCropping ? (
                                                            <div className="space-y-3">
                                                                <ReactCrop
                                                                    crop={crop}
                                                                    onChange={(_, percentCrop) => setCrop(percentCrop)}
                                                                    onComplete={(c) => setCompletedCrop(c)}
                                                                >
                                                                    <img
                                                                        ref={imgRef}
                                                                        src={getCropSrc(selectedQuestion.imageUrl)}
                                                                        crossOrigin="anonymous"
                                                                        alt="Crop question diagram"
                                                                        onLoad={onCropImageLoad}
                                                                        className="max-w-full rounded border border-gray-200"
                                                                    />
                                                                </ReactCrop>
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={handleSaveCrop}
                                                                        disabled={cropSaving}
                                                                        className="px-3 py-1.5 text-sm cursor-pointer bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        {cropSaving ? 'Saving…' : 'Save Crop'}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setIsCropping(false)}
                                                                        disabled={cropSaving}
                                                                        className="px-3 py-1.5 text-sm cursor-pointer bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <img
                                                                    src={selectedQuestion.imageUrl}
                                                                    alt="Question diagram"
                                                                    className="max-w-full rounded border border-gray-200"
                                                                />
                                                                <div className="mt-2 flex gap-2">
                                                                    <button
                                                                        onClick={startCrop}
                                                                        className="px-3 py-1.5 text-sm cursor-pointer bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                                    >
                                                                        Crop Image
                                                                    </button>
                                                                    <button
                                                                        onClick={handleRemoveImage}
                                                                        className="px-3 py-1.5 text-sm cursor-pointer bg-red-600 text-white rounded-md hover:bg-red-700"
                                                                    >
                                                                        Remove Image
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Flag badge in detail view */}
                                                {selectedQuestion.flag && (
                                                    <div className="mb-4 flex items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-700">Flag:</span>
                                                        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded font-medium">
                                                            🚩 {selectedQuestion.flag}
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="mb-4">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
                                                    <div className="space-y-2">
                                                        {editForm.options.length === 0 ? (
                                                            <p className="text-sm text-gray-400">No options found</p>
                                                        ) : (
                                                            editForm.options.map((option, index) => (
                                                                <div
                                                                    key={index}
                                                                    className={`p-3 rounded border ${
                                                                        option === editForm.correct_answer
                                                                            ? 'bg-green-50 border-green-500'
                                                                            : 'bg-gray-50 border-gray-200'
                                                                    }`}
                                                                >
                                                                    <span className="text-sm">{option}</span>
                                                                    {option === editForm.correct_answer && (
                                                                        <span className="ml-2 text-xs text-green-600 font-medium">✓ Correct</span>
                                                                    )}
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>

                                                {selectedQuestion.explanation && (
                                                    <div className="mb-4 p-4 bg-blue-50 rounded">
                                                        <p className="text-sm font-medium text-gray-700 mb-2">Explanation:</p>
                                                        <p className="text-sm text-gray-600">{selectedQuestion.explanation}</p>
                                                    </div>
                                                )}

                                                <div className="mb-4 grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Subject:</p>
                                                        <p className="text-sm text-gray-900">{selectedQuestion.subject}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Topic:</p>
                                                        <p className="text-sm text-gray-900">{selectedQuestion.topic ?? selectedQuestion.tier}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-gray-700">Difficulty:</p>
                                                        <p className="text-sm text-gray-900">{selectedQuestion.difficulty}</p>
                                                    </div>
                                                </div>

                                                {selectedQuestion.moderation_notes && (
                                                    <div className="mb-4 p-4 bg-yellow-50 rounded">
                                                        <p className="text-sm font-medium text-gray-700 mb-2">Moderation Notes:</p>
                                                        <p className="text-sm text-gray-600">{selectedQuestion.moderation_notes}</p>
                                                    </div>
                                                )}

                                                <div className="flex gap-2 mt-6">
                                                    <button
                                                        onClick={handleApprove}
                                                        className="flex-1 px-4 py-2 cursor-pointer bg-green-600 text-white rounded-md hover:bg-green-700"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={handleReject}
                                                        className="flex-1 px-4 py-2 cursor-pointer bg-red-600 text-white rounded-md hover:bg-red-700"
                                                    >
                                                        Reject
                                                    </button>
                                                    <button
                                                        onClick={handleDelete}
                                                        className="px-4 py-2 bg-gray-600 cursor-pointer text-white rounded-md hover:bg-gray-700"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            // Edit Mode
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
                                                    <textarea
                                                        value={editForm.question_text}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, question_text: e.target.value }))}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                                                    <div className="space-y-2">
                                                        {editForm.options.map((option, index) => (
                                                            <div key={index} className="flex gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={option}
                                                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                                                                    placeholder={`Option ${index + 1}`}
                                                                />
                                                                {editForm.options.length > 2 && (
                                                                    <button
                                                                        onClick={() => handleRemoveOption(index)}
                                                                        className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                    {editForm.options.length < 6 && (
                                                        <button
                                                            onClick={handleAddOption}
                                                            className="mt-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                                        >
                                                            Add Option
                                                        </button>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                                                    <select
                                                        value={editForm.correct_answer}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, correct_answer: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    >
                                                        <option value="">Select correct answer</option>
                                                        {editForm.options.map((option, index) => (
                                                            <option key={index} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Explanation</label>
                                                    <textarea
                                                        value={editForm.explanation}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, explanation: e.target.value }))}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                                        <select
                                                            value={editForm.subject}
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        >
                                                            <option value="">Select subject</option>
                                                            {subjects.map(subject => (
                                                                <option key={subject} value={subject}>{subject}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Topic</label>
                                                        <input
                                                            type="text"
                                                            value={editForm.topic}
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, topic: e.target.value }))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                                                        <select
                                                            value={editForm.difficulty}
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, difficulty: e.target.value as any }))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        >
                                                            <option value="easy">Easy</option>
                                                            <option value="medium">Medium</option>
                                                            <option value="hard">Hard</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                                                        <select
                                                            value={editForm.question_type}
                                                            onChange={(e) => setEditForm(prev => ({ ...prev, question_type: e.target.value as any }))}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        >
                                                            <option value="quiz">Quiz</option>
                                                            <option value="mock_test">Mock Test</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Moderation Notes</label>
                                                    <textarea
                                                        value={editForm.moderation_notes}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, moderation_notes: e.target.value }))}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleUpdateQuestion}
                                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="p-8 text-center text-gray-500">
                                    Select a question to view details
                                </div>
                            )}
                        </div>
                    </div>
                }
            </div>
        </div>
    );
}