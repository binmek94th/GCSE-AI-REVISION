'use client'

import { useEffect, useState } from "react";
import { Mail, Calendar, Package, Clock, Award, TrendingUp } from "lucide-react";
import { auth } from "@/lib/firebase";
import Spinner from "@/app/components/ui/Spinner";
import {useRouter} from "next/navigation";
import SubscriptionPage from "@/app/dashboard/subscription/page";

interface ProfileData {
    email: string;
    displayName: string | null;
    createdAt: string;
    tokens: number;
    totalStudyHours: number;
    studyPacks: string[];
    stats: {
        quizzesCompleted: number;
        averageScore: number;
        totalQuestions: number;
        aiInteractions: {
            total: number;
        };
    };
}

export default function ProfilePage() {
    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter()
    const [user, setUser] = useState<any>(null);

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

            } catch (err) {
                setError(err instanceof Error ? err.message : "An error occurred");
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);


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
            {/*<div className="grid grid-cols-2 md:grid-cols-4 gap-4">*/}
            {/*    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">*/}
            {/*        <Clock className="w-6 h-6 text-orange-500 mx-auto mb-2" />*/}
            {/*        <div className="text-2xl font-bold text-gray-900">{Math.floor(profileData.totalStudyHours)}</div>*/}
            {/*        <div className="text-xs text-gray-600">Study Hours</div>*/}
            {/*    </div>*/}

            {/*    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">*/}
            {/*        <Package className="w-6 h-6 text-green-500 mx-auto mb-2" />*/}
            {/*        <div className="text-2xl font-bold text-gray-900">{profileData.studyPacks.length}</div>*/}
            {/*        <div className="text-xs text-gray-600">Study Packs</div>*/}
            {/*    </div>*/}

            {/*    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">*/}
            {/*        <Award className="w-6 h-6 text-blue-500 mx-auto mb-2" />*/}
            {/*        <div className="text-2xl font-bold text-gray-900">{profileData.stats.quizzesCompleted}</div>*/}
            {/*        <div className="text-xs text-gray-600">Quizzes Done</div>*/}
            {/*    </div>*/}

            {/*    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">*/}
            {/*        <TrendingUp className="w-6 h-6 text-purple-500 mx-auto mb-2" />*/}
            {/*        <div className="text-2xl font-bold text-gray-900">{profileData.stats.averageScore.toFixed(0)}%</div>*/}
            {/*        <div className="text-xs text-gray-600">Avg Score</div>*/}
            {/*    </div>*/}
            {/*</div>*/}

            {/* Subscription Component */}
            <SubscriptionPage />
        </div>
    );
}