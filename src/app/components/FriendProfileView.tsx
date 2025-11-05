"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BADGE_CATEGORIES } from "@/lib/data/badges";
import { auth } from "@/lib/firebase";

interface FriendProfileViewProps {
    friend: any;
}

export default function FriendProfileView({ friend }: FriendProfileViewProps) {
    const [badges, setBadges] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFriendBadges = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    console.log("No current user");
                    return;
                }

                const token = await user.getIdToken();
                const friendId = friend.uid || friend.id;
                console.log("Fetching badges for friend ID:", friendId);

                const res = await fetch(`/api/badges/friend/${friendId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });

                const data = await res.json();
                console.log("Badge API response:", data);

                if (data.success) {
                    setBadges(data.badges || {});
                } else {
                    console.error("Failed to fetch badges:", data.error);
                }
            } catch (err) {
                console.error("Error fetching friend badges:", err);
            } finally {
                setLoading(false);
            }
        };

        if (friend?.uid || friend?.id) {
            fetchFriendBadges();
        } else {
            console.error("No friend ID found:", friend);
            setLoading(false);
        }
    }, [friend]);

    if (loading)
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="animate-spin w-6 h-6 text-blue-500" />
            </div>
        );

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* User Info Card */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {friend.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{friend.username}</h2>
                        <p className="text-gray-600">{friend.email}</p>
                    </div>
                </div>
            </div>

            {/* Badges Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-2xl font-bold mb-4 text-center">🎖️ {friend.username}'s Badges</h2>

                {Object.entries(BADGE_CATEGORIES).map(([category, items]) => (
                    <div key={category} className="mb-6">
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
        </div>
    );
}