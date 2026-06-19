'use client';

import { useState, useEffect, useRef } from 'react';
import { StudyMaterial } from '@/types/moderation';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/app/components/ui/select";
import { EXAM_DATA } from "@/app/onboarding/exam_data";
import Spinner from "@/app/components/ui/Spinner";
import { toast } from "sonner";

export default function ALevelStudyMaterialsModeration() {
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

    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [currentImageToCrop, setCurrentImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState<Crop>({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        hasMore: false,
        lastDocId: null as string | null,
    });

    const [editForm, setEditForm] = useState({
        title: '', // displayed as Title; persisted to the `topic` field
        content: '',
        subject: '',
        exam_board: '',
        study_pack_id: '',
        moderation_status: '',
        moderation_notes: '',
        imagesToRemove: [] as string[],
        croppedImages: {} as Record<string, string>,
    });

    // A-Level materials use `topic`; keep a `title` fallback for safety.
    const titleOf = (m: any) => m?.topic ?? m?.title ?? '';
    const boardOf = (m: any) => m?.exam_board ?? m?.examBoard ?? '';

    useEffect(() => {
        setPagination({ page: 1, limit: 20, hasMore: false, lastDocId: null });
        fetchMaterials(1, null);
    }, [filters]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (fullscreenImage) setFullscreenImage(null);
                else if (cropModalOpen) setCropModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [fullscreenImage, cropModalOpen]);

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

            const response = await fetch(`/api/teacher/alevel-study-materials?${params}`);
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
            setPagination({ page: 1, limit: 20, hasMore: false, lastDocId: null });
            fetchMaterials(1, null);
        }
    };

    const updateMaterialInList = (materialId: string, updates: Partial<StudyMaterial>) => {
        setMaterials(prev => prev.map(m => m.id === materialId ? { ...m, ...updates } : m));
        if (selectedMaterial?.id === materialId) {
            setSelectedMaterial(prev => prev ? { ...prev, ...updates } : null);
        }
    };

    const removeMaterialFromList = (materialId: string) => {
        setMaterials(prev => prev.filter(m => m.id !== materialId));
        if (selectedMaterial?.id === materialId) setSelectedMaterial(null);
    };

    const handleSelectMaterial = (material: StudyMaterial) => {
        setSelectedMaterial(material);
        setEditForm({
            title: titleOf(material),
            content: material.content,
            subject: material.subject,
            exam_board: boardOf(material),
            study_pack_id: material.study_pack_id,
            moderation_status: material.moderation_status || 'pending',
            moderation_notes: material.moderation_notes || '',
            imagesToRemove: [],
            croppedImages: {},
        });
        setEditMode(false);
    };

    const extractImageUrls = (content: string): string[] => {
        const imageRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
        const matches = content.matchAll(imageRegex);
        return Array.from(matches, match => match[1]);
    };

    const handleRemoveImage = (imageUrl: string) => {
        setEditForm(prev => ({ ...prev, imagesToRemove: [...prev.imagesToRemove, imageUrl] }));
    };

    const handleOpenCropModal = (imageUrl: string) => {
        const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
        setCurrentImageToCrop(proxiedUrl);
        setCropModalOpen(true);
        setCrop({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
        setCompletedCrop(null);
    };

    const handleSaveCrop = async () => {
        if (!currentImageToCrop || !completedCrop) {
            toast.error('Please select an area to crop');
            return;
        }
        const croppedImageData = await getCroppedImg();
        if (!croppedImageData) {
            toast.error('Failed to crop image');
            return;
        }
        const urlParams = new URLSearchParams(currentImageToCrop.split('?')[1]);
        const originalUrl = urlParams.get('url');
        if (!originalUrl) {
            toast.error('Invalid image URL');
            return;
        }
        setEditForm(prev => ({
            ...prev,
            croppedImages: { ...prev.croppedImages, [originalUrl]: croppedImageData },
        }));
        toast.success('Image cropped successfully');
        setCropModalOpen(false);
        setCurrentImageToCrop(null);
    };

    const getCroppedImg = async (): Promise<string | null> => {
        if (!completedCrop || !imgRef.current) return null;
        const canvas = document.createElement('canvas');
        const image = imgRef.current;
        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;
        ctx.drawImage(
            image,
            completedCrop.x * scaleX, completedCrop.y * scaleY,
            completedCrop.width * scaleX, completedCrop.height * scaleY,
            0, 0, completedCrop.width, completedCrop.height
        );
        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) { resolve(null); return; }
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(blob);
            }, 'image/jpeg', 0.95);
        });
    };

    const handleUpdateMaterial = async () => {
        if (!selectedMaterial) return;
        try {
            const loadingToast = toast.loading('Updating material...');
            const response = await fetch(`/api/teacher/alevel-study-materials/${selectedMaterial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editForm,
                    topic: editForm.title, // persist title input to `topic`
                    remove_images: editForm.imagesToRemove,
                    cropped_images: editForm.croppedImages,
                }),
            });
            const data = await response.json();
            toast.dismiss(loadingToast);

            if (data.success) {
                toast.success('Material updated successfully!');
                updateMaterialInList(selectedMaterial.id, data.material);
                setSelectedMaterial(data.material);
                setEditForm({
                    title: titleOf(data.material),
                    content: data.material.content,
                    subject: data.material.subject,
                    exam_board: boardOf(data.material),
                    study_pack_id: data.material.study_pack_id,
                    moderation_status: data.material.moderation_status || 'pending',
                    moderation_notes: data.material.moderation_notes || '',
                    imagesToRemove: [],
                    croppedImages: {},
                });
                setEditMode(false);
            } else {
                toast.error(data.error || 'Failed to update material');
            }
        } catch (error) {
            console.error('Error updating material:', error);
            toast.error('Failed to update material');
        }
    };

    const handleApprove = async () => {
        if (!selectedMaterial) return;
        try {
            const response = await fetch(`/api/teacher/alevel-study-materials/${selectedMaterial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    moderation_status: 'approved',
                    moderation_notes: editForm.moderation_notes,
                }),
            });
            if (response.ok) {
                toast.success('Material approved!');
                updateMaterialInList(selectedMaterial.id, {
                    moderation_status: 'approved',
                    moderation_notes: editForm.moderation_notes,
                });
                if (filters.status === 'pending') removeMaterialFromList(selectedMaterial.id);
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
            const response = await fetch(`/api/teacher/alevel-study-materials/${selectedMaterial.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ moderation_status: 'rejected', moderation_notes: notes }),
            });
            if (response.ok) {
                toast.success('Material rejected');
                updateMaterialInList(selectedMaterial.id, {
                    moderation_status: 'rejected',
                    moderation_notes: notes,
                });
                if (filters.status === 'pending') removeMaterialFromList(selectedMaterial.id);
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
            const response = await fetch(`/api/teacher/alevel-study-materials/${selectedMaterial.id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                toast.success('Material deleted');
                removeMaterialFromList(selectedMaterial.id);
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
                <h1 className="text-3xl font-bold text-gray-900 mb-6">A-Level Study Materials Moderation</h1>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                            <Select
                                value={filters.subject}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="All Subjects" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Subjects</SelectItem>
                                    {subjects.map(subject => (
                                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Exam Board</label>
                            <Select
                                value={filters.examBoard}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, examBoard: value }))}
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="All Boards" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Boards</SelectItem>
                                    {examBoards.map(board => (
                                        <SelectItem key={board} value={board}>{board}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                            <Select
                                value={filters.status}
                                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="pending">pending</SelectItem>
                                    <SelectItem value="approved">approved</SelectItem>
                                    <SelectItem value="rejected">rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => setFilters({ subject: "all", examBoard: "all", status: "all" })}
                                className="w-full px-3 py-2 border cursor-pointer border-gray-300 rounded-md text-sm bg-gray-50 hover:bg-gray-100"
                            >
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <Spinner />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Materials List */}
                        <div className="bg-white rounded-lg shadow">
                            <div className="p-4 border-b">
                                <h2 className="text-xl font-semibold">Materials ({materials.length})</h2>
                            </div>
                            <div className="overflow-y-auto max-h-[calc(100vh-400px)]">
                                {materials.length === 0 ? (
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
                                                    <h3 className="font-semibold text-gray-900">{titleOf(material)}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {material.subject} - {boardOf(material)}
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

                            <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={pagination.page === 1 || loading}
                                    className="px-4 py-2 cursor-pointer text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Previous
                                </button>
                                <span className="text-sm text-gray-700">Page {pagination.page}</span>
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
                                            <>
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-bold text-gray-900">{titleOf(selectedMaterial)}</h3>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {selectedMaterial.subject} - {boardOf(selectedMaterial)}
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
                                                    <select
                                                        value={editForm.exam_board}
                                                        onChange={(e) => setEditForm(prev => ({ ...prev, exam_board: e.target.value }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                                                    >
                                                        <option value="">Select Exam Board</option>
                                                        {examBoards.map((board) => (
                                                            <option key={board} value={board}>{board}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Image Preview Section */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Images in Content ({imageUrls.length})
                                                    </label>
                                                    {imageUrls.length > 0 ? (
                                                        <div className="space-y-3">
                                                            {imageUrls.map((url, index) => {
                                                                const displayUrl = editForm.croppedImages[url] || url;
                                                                const isCropped = !!editForm.croppedImages[url];
                                                                return (
                                                                    <div
                                                                        key={index}
                                                                        className={`border rounded-lg overflow-hidden transition-all ${
                                                                            editForm.imagesToRemove.includes(url)
                                                                                ? 'bg-red-50 border-red-300 opacity-60'
                                                                                : isCropped
                                                                                    ? 'bg-blue-50 border-blue-300'
                                                                                    : 'bg-white border-gray-200'
                                                                        }`}
                                                                    >
                                                                        <div
                                                                            className="relative w-full h-48 bg-gray-100 flex items-center justify-center cursor-pointer transition-colors group overflow-hidden"
                                                                            onClick={() => setFullscreenImage(displayUrl)}
                                                                        >
                                                                            <img
                                                                                src={displayUrl}
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
                                                                            {!editForm.imagesToRemove.includes(url) && (
                                                                                <div className="absolute inset-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center pointer-events-none z-10">
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
                                                                            {isCropped && (
                                                                                <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded z-10">
                                                                                    ✓ Cropped
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        <div className="p-3 flex items-center justify-between gap-2 bg-gray-50">
                                                                            <div className="flex-1 min-w-0">
                                                                                <p className="text-xs text-gray-500 mb-1 font-medium">Image {index + 1}</p>
                                                                                <p className="text-xs text-gray-600 truncate font-mono bg-white px-2 py-1 rounded">{url}</p>
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleOpenCropModal(url); }}
                                                                                    disabled={editForm.imagesToRemove.includes(url)}
                                                                                    className="px-3 py-1.5 text-xs font-medium rounded whitespace-nowrap transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                                >
                                                                                    {isCropped ? 'Re-crop' : 'Crop'}
                                                                                </button>
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); handleRemoveImage(url); }}
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
                                                                    </div>
                                                                );
                                                            })}

                                                            {(editForm.imagesToRemove.length > 0 || Object.keys(editForm.croppedImages).length > 0) && (
                                                                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                                                    <p className="text-sm text-amber-800">
                                                                        {editForm.imagesToRemove.length > 0 && (
                                                                            <span className="block">
                                                                                <strong>{editForm.imagesToRemove.length}</strong> image(s) marked for removal.
                                                                            </span>
                                                                        )}
                                                                        {Object.keys(editForm.croppedImages).length > 0 && (
                                                                            <span className="block">
                                                                                <strong>{Object.keys(editForm.croppedImages).length}</strong> image(s) cropped.
                                                                            </span>
                                                                        )}
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
                )}
            </div>

            {/* Crop Modal */}
            {cropModalOpen && currentImageToCrop && (
                <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="text-lg font-semibold">Crop Image</h3>
                            <button onClick={() => setCropModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4">
                            <div className="mb-4">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(c) => setCrop(c)}
                                    onComplete={(c) => setCompletedCrop(c)}
                                >
                                    <img
                                        ref={imgRef}
                                        src={currentImageToCrop}
                                        alt="Crop preview"
                                        className="max-w-full"
                                        crossOrigin="anonymous"
                                    />
                                </ReactCrop>
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button onClick={() => setCropModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveCrop}
                                    disabled={!completedCrop}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Apply Crop
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullscreen Image Modal */}
            {fullscreenImage && (
                <div
                    className="fixed inset-0 z-50 bg-black bg-opacity-95 flex items-center justify-center p-4 animate-fadeIn"
                    onClick={() => setFullscreenImage(null)}
                >
                    <button
                        onClick={() => setFullscreenImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-70"
                        aria-label="Close fullscreen image"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div className="absolute top-4 left-4 text-white text-sm bg-black bg-opacity-60 px-4 py-2 rounded-lg flex items-center gap-2">
                        <kbd className="px-2 py-1 bg-gray-700 rounded text-xs font-mono">ESC</kbd>
                        <span>or click anywhere to close</span>
                    </div>
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