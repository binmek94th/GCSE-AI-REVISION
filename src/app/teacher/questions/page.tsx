'use client';

import { useState, useEffect } from 'react';
import { Question } from '@/types/moderation';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/app/components/ui/select";
import {EXAM_DATA} from "@/app/onboarding/exam_data";
import Spinner from "@/app/components/ui/Spinner";
import {toast} from "sonner";

export default function QuestionsModeration() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [filters, setFilters] = useState({
        subject: '',
        status: 'all',
    });

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
        fetchQuestions();
    }, [filters]);

    const fetchQuestions = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.status) params.append('status', filters.status);

            const response = await fetch(`/api/teacher/questions?${params}`);
            const data = await response.json();

            if (data.success) {
                setQuestions(data.questions);
            }
        } catch (error) {
            console.error('Error fetching questions:', error);
        } finally {
            setLoading(false);
        }
    };

    const subjects = Array.from(new Set(EXAM_DATA.map(e => e.subject))).sort();


    const handleSelectQuestion = (question: Question) => {
        setSelectedQuestion(question);

        // Handle both array and object formats for options
        const optionsArray = Array.isArray(question.options)
            ? question.options
            : Object.values(question.options);

        setEditForm({
            question_text: question.question,
            options: optionsArray,
            correct_answer: question.correct_answer,
            explanation: question.explanation || '',
            subject: question.subject,
            topic: question.tier,
            difficulty: question.difficulty,
            question_type: question.question_type,
            marks: question.marks || 1,
            moderation_status: question.moderation_status || 'pending',
            moderation_notes: question.moderation_notes || '',
        });
        setEditMode(false);
    };

    const handleUpdateQuestion = async () => {
        if (!selectedQuestion) return;

        try {
            const response = await fetch(`/api/teacher/questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Question updated successfully!');
                fetchQuestions();
                setSelectedQuestion(data.question);
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
            const response = await fetch(`/api/teacher/questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moderation_status: 'approved',
                    moderation_notes: editForm.moderation_notes,
                }),
            });

            if (response.ok) {
                toast.success('Question approved!');
                fetchQuestions();
                setSelectedQuestion(null);
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
            const response = await fetch(`/api/teacher/questions/${selectedQuestion.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moderation_status: 'rejected',
                    moderation_notes: notes,
                }),
            });

            if (response.ok) {
                toast.success('Question rejected');
                fetchQuestions();
                setSelectedQuestion(null);
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
            const response = await fetch(`/api/teacher/questions/${selectedQuestion.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Question deleted');
                fetchQuestions();
                setSelectedQuestion(null);
            }
        } catch (error) {
            console.error('Error deleting question:', error);
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

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Questions Moderation</h1>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                                <SelectTrigger className="w-full">
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
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem key={"pending"} value={"pending"}>
                                        pending
                                    </SelectItem>
                                    <SelectItem key={"approved"} value={"approved"}>
                                        approved
                                    </SelectItem>
                                    <SelectItem key={"rejected"} value={"rejected"}>
                                        rejected
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Reset */}
                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({ subject: "all", status: "" })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 hover:bg-gray-100"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Questions List */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b">
                            <h2 className="text-xl font-semibold">Questions ({questions.length})</h2>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                            {loading ? (
                                <Spinner></Spinner>
                            ) : questions.length === 0 ? (
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
                                                    {question.question}
                                                </p>
                                                <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {question.subject}
                          </span>
                                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {question.difficulty}
                          </span>
                                                    <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                            {question.tier}
                          </span>
                                                </div>
                                            </div>
                                            <span
                                                className={`ml-2 px-2 py-1 text-xs font-medium rounded whitespace-nowrap ${
                                                    question.moderation_status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : question.moderation_status === 'rejected'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                            >
                        {question.moderation_status || 'pending'}
                      </span>
                                        </div>
                                    </div>
                                ))
                            )}
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
                                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
                                                <p className="text-gray-900">{selectedQuestion.question}</p>
                                            </div>

                                            <div className="mb-4">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
                                                <div className="space-y-2">
                                                    {editForm.options.map((option, index) => (
                                                        <div
                                                            key={index}
                                                            className={`p-3 rounded border ${
                                                                option === selectedQuestion.correct_answer
                                                                    ? 'bg-green-50 border-green-500'
                                                                    : 'bg-gray-50 border-gray-200'
                                                            }`}
                                                        >
                                                            <span className="text-sm">{option}</span>
                                                            {option === selectedQuestion.correct_answer && (
                                                                <span className="ml-2 text-xs text-green-600 font-medium">✓ Correct</span>
                                                            )}
                                                        </div>
                                                    ))}
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
                                                    <p className="text-sm font-medium text-gray-700">Tier:</p>
                                                    <p className="text-sm text-gray-900">{selectedQuestion.tier}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-700">Difficulty:</p>
                                                    <p className="text-sm text-gray-900">{selectedQuestion.difficulty}</p>
                                                </div>
                                                {/*<div>*/}
                                                {/*    <p className="text-sm font-medium text-gray-700">Type:</p>*/}
                                                {/*    <p className="text-sm text-gray-900">{selectedQuestion.question_type}</p>*/}
                                                {/*</div>*/}
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
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={handleReject}
                                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        // Edit Mode
                                        <>
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Options
                                                    </label>
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
                                                            <option key={index} value={option}>
                                                                {option}
                                                            </option>
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
                                                            <option value="Mathematics">Mathematics</option>
                                                            <option value="English">English</option>
                                                            <option value="Chemistry">Chemistry</option>
                                                            <option value="Biology">Biology</option>
                                                            <option value="Physics">Physics</option>
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Marks</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={editForm.marks}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, marks: parseInt(e.target.value) }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    />
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
                                        </>
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
            </div>
        </div>
    );
}