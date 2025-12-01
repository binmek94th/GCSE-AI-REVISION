'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Users, UserX, Loader2, Eye } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { toast } from "sonner";

interface Friend {
    id: string;
    username: string;
    name: string;
    userType: string;
}

interface FriendsListComponentProps {
    onViewFriend?: (friend: Friend) => void;
}

export default function FriendsListComponent({ onViewFriend }: FriendsListComponentProps) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/friends/list', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            const data = await response.json();
            setFriends(data.friends || []);
        } catch (error) {
            console.error('Error fetching friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const unfriend = async (userId: string, username: string, e: React.MouseEvent) => {
        // Prevent triggering the card click event
        e.stopPropagation();

        if (!auth.currentUser) return;
        if (!confirm(`Are you sure you want to unfriend ${username}?`)) return;

        setActionLoading(userId);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/friends/unfriend', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ friendId: userId }),
            });

            if (response.ok) {
                // Remove from list
                setFriends(prevFriends =>
                    prevFriends.filter(friend => friend.id !== userId)
                );
                toast.success(`Unfriended ${username}`);
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to unfriend user');
            }
        } catch (error) {
            console.error('Error unfriending user:', error);
            toast.error('Failed to unfriend user');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">My Friends</h2>
                <div className="text-center py-8 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="mb-2">You don&#39;t have any friends yet</p>
                    <p className="text-sm">Start by searching for users to add as friends!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
                My Friends ({friends.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {friends.map((friend) => (
                    <div
                        key={friend.id}
                        onClick={() => onViewFriend?.(friend)}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                {friend.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{friend.username}</h3>
                                <p className="text-sm text-gray-600">{friend.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-gray-500 capitalize">{friend.userType}</p>
                                    <span className="text-xs text-blue-600 flex items-center gap-1">
                                        <Eye className="w-3 h-3" />
                                        View Profile
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={(e) => unfriend(friend.id, friend.username, e)}
                                disabled={actionLoading === friend.id}
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                            >
                                {actionLoading === friend.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <UserX className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}