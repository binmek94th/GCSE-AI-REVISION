import { useState, useEffect } from 'react';
import {toast} from "sonner";

export function useMoodChecker(idToken: string | null) {
    const [shouldShow, setShouldShow] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkMoodStatus = async () => {
            if (!idToken) {
                setLoading(false);
                return;
            }

            try {
                const response = await fetch('/api/mood', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    setShouldShow(data.shouldShowMoodChecker);
                }
            } catch (error) {
                console.error('Error checking mood status:', error);
            } finally {
                setLoading(false);
            }
        };

        checkMoodStatus();
    }, [idToken]);

    const submitMood = async (mood: string) => {
        if (!idToken) return;

        try {
            const response = await fetch('/api/mood', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ mood }),
            });

            if (response.ok) {
                setShouldShow(false);
                toast.success('Mood successfully updated');
            }
        } catch (error: any) {
            console.error('Error submitting mood:', error);
            toast.error(error?.message || 'Failed to submit mood');
            throw error;
        }
    };

    const closeMoodChecker = () => {
        setShouldShow(false);
    };

    return {
        shouldShow,
        loading,
        submitMood,
        closeMoodChecker
    };
}