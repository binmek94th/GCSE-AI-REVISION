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

export default function StudyMaterialsModeration() {
    const [materials, setMaterials] = useState<StudyMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedMaterial, setSelectedMaterial] = useState<StudyMaterial | null>(null);
    const [editMode, setEditMode] = useState(false);
    const [filters, setFilters] = useState({
        subject: '',
        examBoard: '',
        status: 'all',
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
        fetchMaterials();
    }, [filters]);

    const fetchMaterials = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.examBoard) params.append('examBoard', filters.examBoard);
            if (filters.status) params.append('status', filters.status);

            const response = await fetch(`/api/teacher/study-materials?${params}`);
            const data = await response.json();

            if (data.success) {
                setMaterials(data.materials);
            }
        } catch (error) {
            console.error('Error fetching materials:', error);
        } finally {
            setLoading(false);
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
                alert('Material updated successfully!');
                fetchMaterials();
                setSelectedMaterial(data.material);
                setEditMode(false);
                setEditForm(prev => ({ ...prev, imagesToRemove: [] }));
            }
        } catch (error) {
            console.error('Error updating material:', error);
            alert('Failed to update material');
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
                alert('Material approved!');
                fetchMaterials();
                setSelectedMaterial(null);
            }
        } catch (error) {
            console.error('Error approving material:', error);
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
                alert('Material rejected');
                fetchMaterials();
                setSelectedMaterial(null);
            }
        } catch (error) {
            console.error('Error rejecting material:', error);
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
                alert('Material deleted');
                fetchMaterials();
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
                                Exam Board
                            </label>

                            <Select
                                value={filters.examBoard}
                                onValueChange={(value) =>
                                    setFilters(prev => ({ ...prev, examBoard: value }))
                                }
                            >
                                <SelectTrigger className="w-full">
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
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Boards</SelectItem>
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 hover:bg-gray-100"
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
                        <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
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
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(material.created_at?.toDate?.() || material.created_at).toLocaleDateString()}
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
                    </div>

                    {/* Material Details & Edit */}
                    <div className="bg-white rounded-lg shadow">
                        {selectedMaterial ? (
                            <>
                                <div className="p-4 border-b flex justify-between items-center">
                                    <h2 className="text-xl font-semibold">Material Details</h2>
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
                                                        <option value="Mathematics">Mathematics</option>
                                                        <option value="English">English</option>
                                                        <option value="Chemistry">Chemistry</option>
                                                        <option value="Biology">Biology</option>
                                                        <option value="Physics">Physics</option>
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

                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        Images in Content ({imageUrls.length})
                                                    </label>
                                                    {imageUrls.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {imageUrls.map((url, index) => (
                                                                <div
                                                                    key={index}
                                                                    className={`flex items-center justify-between p-2 border rounded ${
                                                                        editForm.imagesToRemove.includes(url) ? 'bg-red-50 border-red-300' : 'bg-white'
                                                                    }`}
                                                                >
                                                                    <span className="text-xs text-gray-600 truncate flex-1">{url.substring(0, 60)}...</span>
                                                                    <button
                                                                        onClick={() => handleRemoveImage(url)}
                                                                        disabled={editForm.imagesToRemove.includes(url)}
                                                                        className={`ml-2 px-3 py-1 text-xs rounded ${
                                                                            editForm.imagesToRemove.includes(url)
                                                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                                                : 'bg-red-600 text-white hover:bg-red-700'
                                                                        }`}
                                                                    >
                                                                        {editForm.imagesToRemove.includes(url) ? 'Marked' : 'Remove'}
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-500">No images found</p>
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
                                                    />
                                                </div>

                                                <button
                                                    onClick={handleUpdateMaterial}
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
                                Select a material to view details
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}