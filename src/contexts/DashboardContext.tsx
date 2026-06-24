'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface StudyPack {
    id: string;
    name: string;
    subject: string;
    purchasedAt: string;
}

interface DashboardData {
    streak: { currentStreak: number, lastActivity: string };
    studyPacks: StudyPack[];
    totalStudyHours: number;
    completedSessions: number;
    lastActivity: string;
    examBoard: string;
    level: string;
}

interface MoodStatus {
    hasSentToday: boolean;
    lastSent: string | null;
}

interface DashboardContextType {
    dashboardData: DashboardData | null;
    moodStatus: MoodStatus | null;
    loading: boolean;
    error: string | null;
    refreshDashboard: () => Promise<void>;
    sendMoodStatus: (mood: string) => Promise<void>;
    incrementStreak: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [moodStatus, setMoodStatus] = useState<MoodStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    const incrementStreak = async () => {
        if (!dashboardData?.streak) return;

        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

        if (dashboardData.lastActivity === today) {
            return;
        }
        else {
            try {
                const user = auth.currentUser;
                if (!user) throw new Error('User not authenticated');

                const idToken = await user.getIdToken();

                const response = await fetch('/api/streak', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    throw new Error('Failed to increment streak');
                }

                const data = await response.json();

                setDashboardData(prev => prev ? {
                    ...prev,
                    streak: {
                        ...prev.streak,
                        currentStreak: data.currentStreak,
                    },
                    lastActivity: today,
                } : null);
            } catch (err) {
                console.error('Error incrementing streak:', err);
            }
        }
    };

    const fetchDashboardData = async (idToken: string) => {
        try {
            const response = await fetch('/api/dashboard', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const data = await response.json();
            setDashboardData(data.dashboard);
            setMoodStatus(data.moodStatus);

            // Check if mood needs to be sent
            if (!data.moodStatus.hasSentToday) {
                // You can trigger a mood modal/prompt here if needed
                console.log('Mood status not sent today');
            }

            return data;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            throw err;
        }
    };

    const refreshDashboard = async () => {
        if (!userId) return;

        try {
            setLoading(true);
            setError(null);
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const idToken = await user.getIdToken();
            await fetchDashboardData(idToken);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh dashboard');
        } finally {
            setLoading(false);
        }
    };

    const sendMoodStatus = async (mood: string) => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('User not authenticated');

            const idToken = await user.getIdToken();

            const response = await fetch('/api/mood', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mood }),
            });

            if (!response.ok) {
                throw new Error('Failed to send mood status');
            }

            setMoodStatus({
                hasSentToday: true,
                lastSent: new Date().toISOString(),
            });
        } catch (err) {
            console.error('Error sending mood:', err);
            throw err;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setUserId(null);
                setDashboardData(null);
                setMoodStatus(null);
                setLoading(false);
                return;
            }

            try {
                setUserId(user.uid);
                const idToken = await user.getIdToken();
                await fetchDashboardData(idToken);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load dashboard');
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const value: DashboardContextType = {
        dashboardData,
        moodStatus,
        loading,
        error,
        refreshDashboard,
        sendMoodStatus,
        incrementStreak
    };

    return (
        <DashboardContext.Provider value={value}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}