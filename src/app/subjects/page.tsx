'use client';
import React, { useState, useMemo } from 'react';
import { EXAM_DATA } from "@/app/onboarding/exam_data";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue
} from "@/app/components/select";

export default function SubjectExamDisplay() {
    // ------------------------------------------------------------
    // 1️⃣ Extract unique exam boards
    // ------------------------------------------------------------
    const examBoards = Array.from(
        new Set(EXAM_DATA.map(exam => exam.exam_board))
    );

    // ------------------------------------------------------------
    // 2️⃣ State for selected board (default = all)
    // ------------------------------------------------------------
    const [selectedBoard, setSelectedBoard] = useState<string>("all");

    // ------------------------------------------------------------
    // 3️⃣ Filter exam data by selected board
    // ------------------------------------------------------------
    const filteredData = useMemo(() => {
        if (selectedBoard === "all") return EXAM_DATA;
        return EXAM_DATA.filter(exam => exam.exam_board === selectedBoard);
    }, [selectedBoard]);

    // ------------------------------------------------------------
    // 4️⃣ Group filtered data by subject
    // ------------------------------------------------------------
    const groupedMap = new Map<string, typeof EXAM_DATA[0][]>();

    filteredData.forEach(exam => {
        if (!groupedMap.has(exam.subject)) {
            groupedMap.set(exam.subject, []);
        }
        groupedMap.get(exam.subject)!.push(exam);
    });

    const groupedData = Object.fromEntries(groupedMap);
    const sortedSubjects = Object.keys(groupedData).sort();

    // ------------------------------------------------------------
    // UI helpers
    // ------------------------------------------------------------
    const getTierBadgeColor = (tier: string) => {
        if (tier.includes('Higher')) return 'bg-purple-100 text-purple-700';
        if (tier.includes('Foundation')) return 'bg-blue-100 text-blue-700';
        if (tier === 'Untiered') return 'bg-gray-100 text-gray-700';
        if (tier === 'NEA') return 'bg-green-100 text-green-700';
        return 'bg-yellow-100 text-yellow-700';
    };

    return (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">GCSE Exam Subjects</h1>
                <p className="text-gray-600">Grouped by subject across all exam boards</p>
            </div>

            {/* ------------------------------------------------------------
                Dropdown
            ------------------------------------------------------------ */}
            <div className="mt-6">
                <label className="text-sm font-semibold text-gray-900 mb-3 block">
                    Select Exam Board
                </label>

                <Select value={selectedBoard} onValueChange={setSelectedBoard}>
                    <SelectTrigger className="w-full md:w-64">
                        <SelectValue placeholder="Select Exam Board" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectGroup>
                            <SelectLabel>Exam Board</SelectLabel>

                            <SelectItem value="all">All</SelectItem>

                            {examBoards.map(board => (
                                <SelectItem key={board} value={board}>
                                    {board}
                                </SelectItem>
                            ))}
                        </SelectGroup>
                    </SelectContent>
                </Select>
            </div>

            {/* ------------------------------------------------------------
                Render Subjects
            ------------------------------------------------------------ */}
            <div className="space-y-6 flex flex-wrap gap-4 mt-6">
                {sortedSubjects.length === 0 && (
                    <p className="text-gray-500">No exams available for this board.</p>
                )}

                {sortedSubjects.map(subject => {
                    const exams = groupedData[subject];

                    return (
                        <div
                            key={subject}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 w-full md:w-auto"
                        >
                            <div className="mb-4">
                                <h2 className="text-xl font-semibold text-gray-800">{subject}</h2>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {exams.map((exam, index) => (
                                    <div
                                        key={index}
                                        className="flex flex-col gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900 text-sm">
                                                {exam.exam_board}
                                            </span>
                                            <span
                                                className={`px-2 py-1 text-xs font-medium rounded-full ${getTierBadgeColor(exam.tier)}`}
                                            >
                                                {exam.tier}
                                            </span>
                                        </div>

                                        {exam.note && (
                                            <p className="text-xs text-gray-600 italic max-w-xs">
                                                {exam.note}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
