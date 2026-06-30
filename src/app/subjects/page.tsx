'use client';
import React, { useState, useMemo } from 'react';
import { GraduationCap, Search, BookOpen, X } from 'lucide-react';
import { EXAM_DATA } from "@/app/onboarding/exam_data";
import { A_Level_EXAM_DATA } from "@/app/onboarding/a-levelExamData";

type ExamItem = {
    exam_board: string;
    subject: string;
    level?: string;
    tier?: string;
    note?: string;
};

const LEVELS = ["GCSE", "A-Level"] as const;
type Level = typeof LEVELS[number];

export default function SubjectExamDisplay() {
    const [selectedLevel, setSelectedLevel] = useState<Level>("GCSE");
    const [selectedBoard, setSelectedBoard] = useState<string>("all");
    const [query, setQuery] = useState("");

    const levelData: ExamItem[] = useMemo(
        () => (selectedLevel === "A-Level" ? A_Level_EXAM_DATA : EXAM_DATA),
        [selectedLevel]
    );

    // Board list with counts for the active level
    const boards = useMemo(() => {
        const counts = new Map<string, number>();
        levelData.forEach(e => counts.set(e.exam_board, (counts.get(e.exam_board) ?? 0) + 1));
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([name, count]) => ({ name, count }));
    }, [levelData]);

    const filteredData = useMemo(() => {
        const q = query.trim().toLowerCase();
        return levelData.filter(e => {
            const boardOk = selectedBoard === "all" || e.exam_board === selectedBoard;
            const queryOk = !q || e.subject.toLowerCase().includes(q);
            return boardOk && queryOk;
        });
    }, [levelData, selectedBoard, query]);

    const groupedData = useMemo(() => {
        const map = new Map<string, ExamItem[]>();
        filteredData.forEach(e => {
            if (!map.has(e.subject)) map.set(e.subject, []);
            map.get(e.subject)!.push(e);
        });
        return map;
    }, [filteredData]);

    const sortedSubjects = useMemo(
        () => Array.from(groupedData.keys()).sort((a, b) => a.localeCompare(b)),
        [groupedData]
    );

    const handleLevelChange = (level: Level) => {
        setSelectedLevel(level);
        setSelectedBoard("all");
    };

    const tierStyle = (tier?: string) => {
        if (!tier) return "";
        if (tier.includes('Higher')) return 'bg-purple-50 text-purple-700 ring-purple-200';
        if (tier.includes('Foundation')) return 'bg-sky-50 text-sky-700 ring-sky-200';
        if (tier === 'Untiered') return 'bg-slate-50 text-slate-600 ring-slate-200';
        if (tier === 'NEA') return 'bg-green-50 text-green-700 ring-green-200';
        return 'bg-amber-50 text-amber-700 ring-amber-200';
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">

                {/* Header */}
                <header className="flex items-start gap-4 mb-8">
                    <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-200">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                            {selectedLevel} Exam Subjects
                        </h1>
                        <p className="text-slate-500 mt-1">
                            {sortedSubjects.length} subject{sortedSubjects.length === 1 ? "" : "s"}
                            <span className="mx-1.5 text-slate-300">·</span>
                            {filteredData.length} qualification{filteredData.length === 1 ? "" : "s"}
                        </p>
                    </div>
                </header>

                {/* Controls */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            {/* Level segmented control */}
                            <div className="inline-flex rounded-lg bg-slate-100 p-1 self-start">
                                {LEVELS.map(level => {
                                    const active = selectedLevel === level;
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => handleLevelChange(level)}
                                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                                active
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-700"
                                            }`}
                                        >
                                            {level}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search subjects"
                                    className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-9 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 outline-none transition"
                                />
                                {query && (
                                    <button
                                        onClick={() => setQuery("")}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        aria-label="Clear search"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Board pills */}
                        <div className="flex flex-wrap gap-2">
                            <BoardPill
                                label="All boards"
                                count={levelData.length}
                                active={selectedBoard === "all"}
                                onClick={() => setSelectedBoard("all")}
                            />
                            {boards.map(b => (
                                <BoardPill
                                    key={b.name}
                                    label={b.name}
                                    count={b.count}
                                    active={selectedBoard === b.name}
                                    onClick={() => setSelectedBoard(b.name)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Subjects */}
                {sortedSubjects.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl border border-dashed border-slate-300 bg-white">
                        <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-600 font-medium">No subjects match your filters</p>
                        <p className="text-slate-400 text-sm mt-1">Try another board or clear the search.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedSubjects.map(subject => {
                            const exams = groupedData.get(subject)!;
                            return (
                                <div
                                    key={subject}
                                    className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-sky-200 transition-all"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-base font-semibold text-slate-900">{subject}</h2>
                                        <span className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold ring-1 ring-sky-100">
                                            {exams.length}
                                        </span>
                                    </div>

                                    <ul className="flex flex-col gap-2">
                                        {exams.map((exam, i) => (
                                            <li
                                                key={i}
                                                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2"
                                            >
                                                <span className="text-sm text-slate-700 truncate">
                                                    {exam.exam_board}
                                                </span>
                                                {exam.tier && (
                                                    <span
                                                        className={`shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-full ring-1 ${tierStyle(exam.tier)}`}
                                                    >
                                                        {exam.tier}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>

                                    {exams.some(e => e.note) && (
                                        <div className="mt-3 space-y-1">
                                            {exams.filter(e => e.note).map((e, i) => (
                                                <p key={i} className="text-xs text-slate-500 italic leading-snug">
                                                    {e.exam_board}: {e.note}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function BoardPill({
                       label,
                       count,
                       active,
                       onClick,
                   }: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                    ? "border-sky-500 bg-sky-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
        >
            {label}
            <span
                className={`text-xs tabular-nums ${
                    active ? "text-sky-100" : "text-slate-400"
                }`}
            >
                {count}
            </span>
        </button>
    );
}