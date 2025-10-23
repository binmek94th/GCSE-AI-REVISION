import React from "react";
import { Flame } from "lucide-react";
import { useStreak } from "@/hooks/useStreak";

interface Props {
    idToken: string;
}

const Streak = ({ idToken }: Props) => {
    const { data: streakData } = useStreak(idToken || null);

    if (!streakData) return null;

    return (
        <div className="flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full">
            <Flame className="w-4 h-4" />
            <span>{streakData.currentStreak}-day streak!</span>
        </div>
    );
};

export default Streak;
