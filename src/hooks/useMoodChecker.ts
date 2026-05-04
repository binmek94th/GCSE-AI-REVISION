import { useState, useEffect } from 'react';
import { toast } from "sonner";

export const MOOD_MESSAGES: Record<string, { emoji: string; message: string }> = {
    great: {
        emoji: "🚀",
        message: "You're on fire! We've loaded up your study plan with a bit more to match your energy. Let's crush it today!",
    },
    good: {
        emoji: "😊",
        message: "Glad you're feeling good! We've kept your study plan nice and steady. You've got this!",
    },
    okay: {
        emoji: "😌",
        message: "No worries — we've lightened today's study plan a little so it feels more manageable. Take it one step at a time.",
    },
    bad: {
        emoji: "💙",
        message: "Sorry to hear that. We've trimmed down your plan for today so you can take it easy. Remember, small progress still counts!",
    },
    terrible: {
        emoji: "🫂",
        message: "We've got you. Your study plan has been minimised for today — just focus on resting up. Tomorrow is a new day!",
    },
};

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
            await fetch('/api/mood', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({mood}),
            });

            setShouldShow(false);
            return mood.toLowerCase()

            //     const moodKey = mood.toLowerCase();
            //     const { emoji, message } = MOOD_MESSAGES[moodKey] ?? {
            //         emoji: "✅",
            //         message: "Mood saved! Your study plan has been adjusted for today.",
            //     };
            //
            // toast(
            //     <div className="flex flex-col gap-1">
            //     <p className="font-semibold text-sm text-gray-900">
            //         {emoji} Your study plan's been updated!
            // </p>
            // <p className="text-sm text-gray-700 leading-snug">
            //     {message}
            //     </p>
            //     </div>,
            // {
            //     duration: 5000,
            // }

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
        closeMoodChecker,
    };
}