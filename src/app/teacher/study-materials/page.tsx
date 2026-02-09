'use client';

import { useState, useEffect } from 'react';
import { StudyMaterial } from '@/types/moderation';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/app/components/ui/select";
import {EXAM_DATA} from "@/app/onboarding/exam_data";
import Spinner from "@/app/components/ui/Spinner";
import {toast} from "sonner";

export default function StudyMaterialsModeration() {
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
    const [filters, setFilters] = useState({
        subject: '',
        examBoard: '',
        status: 'all',
    });

    // Pagination state
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        hasMore: false,
        lastDocId: null as string | null,
    });

    const [editForm, setEditForm] = useState({
        title: '',
        content: '',
        subject: '',
        exam_board: '',
        study_pack_id: '',
        moderation_status: '',
        moderation_notes: '',
        imagesToRemove: [] as string[],
    });

    useEffect(() => {
        // Reset pagination when filters change
        setPagination({
            page: 1,
            limit: 20,
            hasMore: false,
            lastDocId: null,
        });
        fetchMaterials(1, null);
    }, [filters]);

    // Handle ESC key to close fullscreen image
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && fullscreenImage) {
                setFullscreenImage(null);
            }
        };

        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [fullscreenImage]);

    const fetchMaterials = async (page: number = 1, lastDocId: string | null = null) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.examBoard) params.append('examBoard', filters.examBoard);
            if (filters.status) params.append('status', filters.status);
            params.append('page', page.toString());
            params.append('limit', pagination.limit.toString());
            if (lastDocId) params.append('lastDocId', lastDocId);

            const response = await fetch(`/api/teacher/study-materials?${params}`);
            const data = await response.json();

            if (data.success) {
                setMaterials(data.materials);
                setPagination({
                    page,
                    limit: pagination.limit,
                    hasMore: data.pagination.hasMore,
                    lastDocId: data.pagination.lastDocId,
                });
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
            toast.error('Failed to fetch materials');
        } finally {
            setLoading(false);
        }
    };

    const handleNextPage = () => {
        if (pagination.hasMore && pagination.lastDocId) {
            fetchMaterials(pagination.page + 1, pagination.lastDocId);
        }
    };

    const handlePreviousPage = () => {
        if (pagination.page > 1) {
            // For previous page, we need to refetch from the beginning
            // This is a limitation of cursor-based pagination
            // We'll reset to page 1 for now
            setPagination({
                page: 1,
                limit: 20,
                hasMore: false,
                lastDocId: null,
            });
            fetchMaterials(1, null);
        }
    };

    const handleSelectMaterial = (material: StudyMaterial) => {
        setSelectedMaterial(material);
        setEditForm({
            title: material.title,
            content: material.content,
            subject: material.subject,
            exam_board: material.exam_board,
            study_pack_id: material.study_pack_id,
            moderation_status: material.moderation_status || 'pending',
            moderation_notes: material.moderation_notes || '',
            imagesToRemove: [],
        });
        setEditMode(false);
    };

    const extractImageUrls = (content: string): string[] => {
        const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
        const matches = content.matchAll(imageRegex);
        return Array.from(matches, match => match[1]);
    };

    const handleRemoveImage = (imageUrl: string) => {
        setEditForm(prev => ({
            ...prev,
            imagesToRemove: [...prev.imagesToRemove, imageUrl],
        }));
    };

    const handleUpdateMaterial = async () => {
        if (!selectedMaterial) return;

        try {
            const response = await fetch(`/api/teacher/study-materials/${selectedMaterial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editForm,
                    remove_images: editForm.imagesToRemove,
                }),
            });

            const data = await response.json();

            if (data.success) {
                toast.success('Material updated successfully!');
                fetchMaterials(pagination.page, pagination.lastDocId);
                setSelectedMaterial(data.material);
                setEditMode(false);
                setEditForm(prev => ({ ...prev, imagesToRemove: [] }));
            }
        } catch (error) {
            console.error('Error updating material:', error);
            toast.error('Failed to update material');
        }
    };

    const handleApprove = async () => {
        if (!selectedMaterial) return;

        try {
            const response = await fetch(`/api/teacher/study-materials/${selectedMaterial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moderation_status: 'approved',
                    moderation_notes: editForm.moderation_notes,
                }),
            });

            if (response.ok) {
                toast.success('Material approved!');
                fetchMaterials(pagination.page, pagination.lastDocId);
                setSelectedMaterial(null);
            }
        } catch (error) {
            console.error('Error approving material:', error);
            toast.error("Error approving material");
        }
    };

    const handleReject = async () => {
        if (!selectedMaterial) return;

        const notes = prompt('Rejection reason:');
        if (!notes) return;

        try {
            const response = await fetch(`/api/teacher/study-materials/${selectedMaterial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moderation_status: 'rejected',
                    moderation_notes: notes,
                }),
            });

            if (response.ok) {
                toast.success('Material rejected');
                fetchMaterials(pagination.page, pagination.lastDocId);
                setSelectedMaterial(null);
            }
        } catch (error) {
            console.error('Error rejecting material:', error);
            toast.error("Error rejecting material");
        }
    };

    const handleDelete = async () => {
        if (!selectedMaterial) return;
        if (!confirm('Are you sure you want to delete this material?')) return;

        try {
            const response = await fetch(`/api/teacher/study-materials/${selectedMaterial.id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                toast.success('Material deleted');
                fetchMaterials(pagination.page, pagination.lastDocId);
                setSelectedMaterial(null);
            }
        } catch (error) {
            console.error('Error deleting material:', error);
        }
    };

    const subjects = Array.from(new Set(EXAM_DATA.map(e => e.subject))).sort();
    const examBoards = Array.from(new Set(EXAM_DATA.map(e => e.exam_board))).sort();


    const imageUrls = selectedMaterial ? extractImageUrls(editForm.content) : [];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Study Materials Moderation</h1>

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Exam Board
                            </label>

                            <Select
                                value={filters.examBoard}
                                onValueChange={(value) =>
                                    setFilters(prev => ({ ...prev, examBoard: value }))
                                }
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="All Boards" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Boards</SelectItem>
                                    {examBoards.map(board => (
                                        <SelectItem key={board} value={board}>
                                            {board}
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
                                <SelectTrigger className="w-full cursor-pointer">
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
                                onClick={() => setFilters({ subject: "all", examBoard: "all", status: "" })}
                                className="w-full px-3 py-2 border cursor-pointer border-gray-300 rounded-md text-sm bg-gray-50 hover:bg-gray-100"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Materials List */}
                    <div className="bg-white rounded-lg shadow">
                        <div className="p-4 border-b">
                            <h2 className="text-xl font-semibold">Materials ({materials.length})</h2>
                        </div>
                        <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
                            {loading ? (
                                <Spinner></Spinner>
                            ) : materials.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No materials found</div>
                            ) : (
                                materials.map((material) => (
                                    <div
                                        key={material.id}
                                        onClick={() => handleSelectMaterial(material)}
                                        className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                                            selectedMaterial?.id === material.id ? 'bg-blue-50' : ''
                                        }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-gray-900">{material.title}</h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {material.subject} - {material.exam_board}
                                                </p>
                                            </div>
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded ${
                                                    material.moderation_status === 'approved'
                                                        ? 'bg-green-100 text-green-800'
                                                        : material.moderation_status === 'rejected'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                }`}
                                            >
                        {material.moderation_status || 'pending'}
                      </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Pagination Controls */}
                        <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                            <button
                                onClick={handlePreviousPage}
                                disabled={pagination.page === 1 || loading}
                                className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                ← Previous
                            </button>

                            <span className="text-sm text-gray-700">
                                Page {pagination.page}
                            </span>

                            <button
                                onClick={handleNextPage}
                                disabled={!pagination.hasMore || loading}
                                className="px-4 py-2 text-sm cursor-pointer font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next →
                            </button>
                        </div>
                    </div>

                    {/* Material Details & Edit */}
                    <div className="bg-white rounded-lg shadow">
                        {selectedMaterial ? (
                            <>
                                <div className="p-4 border-b flex justify-between items-center">
                                    <h2 className="text-xl font-semibold">Material Details</h2>
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
                                                <h3 className="text-lg font-bold text-gray-900">{selectedMaterial.title}</h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {selectedMaterial.subject} - {selectedMaterial.exam_board}
                                                </p>
                                            </div>

                                            <div className="mb-4 p-4 bg-gray-50 rounded">
                                                <p className="text-sm font-medium text-gray-700 mb-2">Content Preview:</p>
                                                <div className="text-sm text-gray-600 whitespace-pre-wrap max-h-60 overflow-y-auto">
                                                    {selectedMaterial.content.substring(0, 500)}...
                                                </div>
                                            </div>

                                            {selectedMaterial.moderation_notes && (
                                                <div className="mb-4 p-4 bg-yellow-50 rounded">
                                                    <p className="text-sm font-medium text-gray-700 mb-2">Moderation Notes:</p>
                                                    <p className="text-sm text-gray-600">{selectedMaterial.moderation_notes}</p>
                                                </div>
                                            )}

                                            <div className="flex gap-2 mt-6">
                                                <button
                                                    onClick={handleApprove}
                                                    className="flex-1 px-4 cursor-pointer py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={handleReject}
                                                    className="flex-1 px-4 cursor-pointer py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={handleDelete}
                                                    className="px-4 py-2 cursor-pointer bg-gray-600 text-white rounded-md hover:bg-gray-700"
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
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.title}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                                                    <select
                                                        value={editForm.subject}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, subject: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    >
                                                        {subjects.map(subject => (
                                                            <option key={subject} value={subject}>{subject}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Exam Board</label>
                                                    <input
                                                        type="text"
                                                        value={editForm.exam_board}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, exam_board: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                    />
                                                </div>

                                                {/* Image Preview Section */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Images in Content ({imageUrls.length})
                                                    </label>
                                                    {imageUrls.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {imageUrls.map((url, index) => (
                                                                <div
                                                                    key={index}
                                                                    className={`border rounded-lg overflow-hidden transition-all ${
                                                                        editForm.imagesToRemove.includes(url)
                                                                            ? 'bg-red-50 border-red-300 opacity-60'
                                                                            : 'bg-white border-gray-200'
                                                                    }`}
                                                                >
                                                                    {/* Image Preview */}
                                                                    <div
                                                                        className="relative w-full h-48 bg-gray-100 flex items-center justify-center cursor-pointer transition-colors group overflow-hidden"
                                                                        onClick={() => setFullscreenImage(url)}
                                                                    >
                                                                        <img
                                                                            src={url}
                                                                            alt={`Content image ${index + 1}`}
                                                                            className="max-w-full max-h-full object-contain relative z-0"
                                                                            onError={(e) => {
                                                                                const target = e.currentTarget;
                                                                                target.style.display = 'none';
                                                                                if (target.parentElement) {
                                                                                    const errorDiv = document.createElement('div');
                                                                                    errorDiv.className = 'text-gray-400 text-sm flex items-center gap-2';
                                                                                    errorDiv.innerHTML = '<span>⚠️</span><span>Image failed to load</span>';
                                                                                    target.parentElement.appendChild(errorDiv);
                                                                                }
                                                                            }}
                                                                        />
                                                                        {/* Hover overlay - only show when not marked for removal */}
                                                                        {!editForm.imagesToRemove.includes(url) && (
                                                                            <div className="absolute inset-0  group-hover:bg-opacity-30 transition-all flex items-center justify-center pointer-events-none z-10">
                                                                                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-70 px-3 py-1 rounded text-sm pointer-events-none">
                                                                                    Click to view full size
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                        {editForm.imagesToRemove.includes(url) && (
                                                                            <div className="absolute inset-0 bg-red-500 bg-opacity-20 flex items-center justify-center pointer-events-none z-10">
                                                                                <span className="text-red-700 font-semibold text-lg bg-white px-3 py-1 rounded">
                                                                                    ✓ Marked for Removal
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Image Info & Actions */}
                                                                    <div className="p-3 flex items-center justify-between gap-2 bg-gray-50">
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs text-gray-500 mb-1 font-medium">
                                                                                Image {index + 1}
                                                                            </p>
                                                                            <p className="text-xs text-gray-600 truncate font-mono bg-white px-2 py-1 rounded">
                                                                                {url}
                                                                            </p>
                                                                        </div>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation(); // Prevent opening fullscreen
                                                                                handleRemoveImage(url);
                                                                            }}
                                                                            disabled={editForm.imagesToRemove.includes(url)}
                                                                            className={`px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors ${
                                                                                editForm.imagesToRemove.includes(url)
                                                                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                                    : 'bg-red-600 text-white hover:bg-red-700'
                                                                            }`}
                                                                        >
                                                                            {editForm.imagesToRemove.includes(url) ? '✓ Marked' : 'Remove'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ))}

                                                            {/* Summary */}
                                                            {editForm.imagesToRemove.length > 0 && (
                                                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                                    <p className="text-sm text-amber-800">
                                                                        <strong>{editForm.imagesToRemove.length}</strong> image(s) marked for removal.
                                                                        Click &#34;Save Changes&#34; to apply.
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                                            <p className="text-sm text-gray-500">No images found in this material</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                                                    <textarea
                                                        value={editForm.content}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                                        rows={10}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">Moderation Notes</label>
                                                    <textarea
                                                        value={editForm.moderation_notes}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, moderation_notes: e.target.value }))}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                                        placeholder="Add notes about this material..."
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleUpdateMaterial}
                                                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
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
                                Select a material to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Fullscreen Image Modal */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setFullscreenImage(null)}
                >
                    {/* Close Button */}
                    <button
                        onClick={() => setFullscreenImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
                        aria-label="Close fullscreen image"
                    >
                        <svg
                            className="w-8 h-8"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>

                    {/* Instructions */}
                    <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-60 px-4 py-2 rounded-lg flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">ESC</kbd>
                        <span>or click anywhere to close</span>
                    </div>

                    {/* Image */}
                    <img
                        src={fullscreenImage}
                        alt="Fullscreen view"
                        className="max-w-full max-h-full object-contain cursor-zoom-out"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}