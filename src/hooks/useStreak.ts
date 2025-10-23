// hooks/useStreak.ts
import {useState, useEffect, useCallback} from 'react';

export interface StreakData {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
    totalActiveDays: number;
}

export function useStreak(idToken: string | null) {
    const [data, setData] = useState<StreakData>({
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null,
        totalActiveDays: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStreak = useCallback(async () => {
        if (!idToken) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await fetch('/api/streak', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch streak');
            }

            const streakData = await response.json();
            setData(streakData);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, [idToken]);

    const updateStreak = async () => {
        if (!idToken) return;

        try {
            const response = await fetch('/api/streak', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update streak');
            }

            const updatedData = await response.json();
            setData({
                currentStreak: updatedData.currentStreak,
                longestStreak: updatedData.longestStreak,
                lastActivityDate: updatedData.lastActivityDate || null,
                totalActiveDays: updatedData.totalActiveDays
            });
        } catch (err) {
            console.error('Error updating streak:', err);
        }
    };

    useEffect(() => {
        fetchStreak();
    }, [fetchStreak, idToken]);

    return { data, loading, error, updateStreak, refetch: fetchStreak };
}