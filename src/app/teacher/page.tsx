'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Stats {
    materials: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
    questions: {
        total: number;
        pending: number;
        approved: number;
        rejected: number;
    };
}

export default function TeacherDashboard() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats>({
        materials: { total: 0, pending: 0, approved: 0, rejected: 0 },
        questions: { total: 0, pending: 0, approved: 0, rejected: 0 },
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Fetch materials stats
            const materialsResponse = await fetch('/api/teacher/study-materials?limit=1000');
            const materialsData = await materialsResponse.json();

            // Fetch questions stats
            const questionsResponse = await fetch('/api/teacher/questions?limit=1000');
            const questionsData = await questionsResponse.json();

            if (materialsData.success && questionsData.success) {
                const materials = materialsData.materials;
                const questions = questionsData.questions;

                setStats({
                    materials: {
                        total: materials.length,
                        pending: materials.filter((m: any) => !m.moderation_status || m.moderation_status === 'pending').length,
                        approved: materials.filter((m: any) => m.moderation_status === 'approved').length,
                        rejected: materials.filter((m: any) => m.moderation_status === 'rejected').length,
                    },
                    questions: {
                        total: questions.length,
                        pending: questions.filter((q: any) => !q.moderation_status || q.moderation_status === 'pending').length,
                        approved: questions.filter((q: any) => q.moderation_status === 'approved').length,
                        rejected: questions.filter((q: any) => q.moderation_status === 'rejected').length,
                    },
                });
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, stats, icon, color, link }: any) => (
        <Link href={link}>
            <div className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer border-t-4 ${color}`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <span className="text-3xl">{icon}</span>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total</span>
                        <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        <div className="text-center">
                            <div className="text-xs text-gray-500">Pending</div>
                            <div className="text-lg font-semibold text-yellow-600">{stats.pending}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">Approved</div>
                            <div className="text-lg font-semibold text-green-600">{stats.approved}</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xs text-gray-500">Rejected</div>
                            <div className="text-lg font-semibold text-red-600">{stats.rejected}</div>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h1>
                            <p className="text-gray-600 mt-1">Content Moderation System</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={fetchStats}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                            >
                                <span>🔄</span>
                                Refresh
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="text-xl text-gray-600">Loading statistics...</div>
                    </div>
                ) : (
                    <>
                        {/* Stats Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <StatCard
                                title="Study Materials"
                                stats={stats.materials}
                                icon="📚"
                                color="border-blue-500"
                                link="/teacher/study-materials"
                            />
                            <StatCard
                                title="Questions"
                                stats={stats.questions}
                                icon="❓"
                                color="border-purple-500"
                                link="/teacher/questions"
                            />
                        </div>

                        {/* Quick Actions */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Link
                                    href="/teacher/study-materials?status=pending"
                                    className="p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-400 transition-colors"
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">⏳</div>
                                        <div className="font-medium text-gray-900">Pending Materials</div>
                                        <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.materials.pending}</div>
                                    </div>
                                </Link>

                                <Link
                                    href="/teacher/questions?status=pending"
                                    className="p-4 border-2 border-yellow-200 rounded-lg hover:border-yellow-400 transition-colors"
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">⏳</div>
                                        <div className="font-medium text-gray-900">Pending Questions</div>
                                        <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.questions.pending}</div>
                                    </div>
                                </Link>

                                <Link
                                    href="/teacher/study-materials?status=approved"
                                    className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors"
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">✅</div>
                                        <div className="font-medium text-gray-900">Approved Materials</div>
                                        <div className="text-2xl font-bold text-green-600 mt-1">{stats.materials.approved}</div>
                                    </div>
                                </Link>

                                <Link
                                    href="/teacher/questions?status=approved"
                                    className="p-4 border-2 border-green-200 rounded-lg hover:border-green-400 transition-colors"
                                >
                                    <div className="text-center">
                                        <div className="text-2xl mb-2">✅</div>
                                        <div className="font-medium text-gray-900">Approved Questions</div>
                                        <div className="text-2xl font-bold text-green-600 mt-1">{stats.questions.approved}</div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">System Information</h2>
                            <div className="space-y-3 text-sm text-gray-600">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    <span>System operational</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                    <span>Last refreshed: {new Date().toLocaleTimeString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    <span>Total items requiring review: {stats.materials.pending + stats.questions.pending}</span>
                                </div>
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">📋 Moderation Guidelines</h3>
                            <ul className="space-y-2 text-sm text-blue-800">
                                <li>• Review content for accuracy, appropriate difficulty level, and clarity</li>
                                <li>• Check that study materials follow curriculum standards</li>
                                <li>• Verify questions have correct answers and clear explanations</li>
                                <li>• Use moderation notes to provide feedback for rejected items</li>
                                <li>• Edit content directly when minor corrections are needed</li>
                            </ul>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}