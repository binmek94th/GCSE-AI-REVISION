"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {BADGE_CATEGORIES} from "@/lib/data/badges";
import {auth} from "@/lib/firebase";

export default function UserBadges() {
    const [badges, setBadges] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBadges = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const token = await user.getIdToken();
                const res = await fetch("/api/badges", {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await res.json();
                if (data.success) setBadges(data.badges || {});
            } catch (err) {
                console.error("Error fetching badges:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBadges();
    }, []);

    if (loading)
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="animate-spin w-6 h-6 text-blue-500" />
            </div>
        );

    return (
        <div className="max-w-5xl mx-auto p-6 space-y-6">
            <h2 className="text-2xl font-bold mb-4 text-center">🎖️ Your Badges</h2>

            {Object.entries(BADGE_CATEGORIES).map(([category, items]) => (
                <div key={category}>
                    <h3 className="text-lg font-semibold mb-3 capitalize text-gray-700">
                        {category.replace("_", " ")}
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {items.map((badge) => {
                            const earned = badges[category]?.includes(badge.name);
                            return (
                                <div
                                    key={badge.name}
                                    className={`p-4 rounded-xl border shadow-sm transition-all ${
                                        earned
                                            ? "bg-yellow-100 border-yellow-400"
                                            : "bg-gray-100 border-gray-300 opacity-60"
                                    }`}
                                >
                                    <div className="text-3xl mb-2 text-center">{badge.icon}</div>
                                    <p className="text-sm font-semibold text-center">{badge.name}</p>
                                    <p className="text-xs text-gray-500 text-center">{badge.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
