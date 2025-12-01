'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { Search, UserPlus, UserCheck, UserX, Clock, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {toast} from "sonner";

interface User {
    id: string;
    username: string;
    name: string;
    userType: string;
    friendshipStatus: 'none' | 'friends' | 'request_sent' | 'request_received';
}

export default function UserSearchComponent() {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [message, setMessage] = useState('');


    
    useEffect(() => {
        const searchUsers = async () => {
            if (!auth.currentUser) return;

            setLoading(true);
            try {
                const idToken = await auth.currentUser.getIdToken();
                const response = await fetch(`/api/friends/search?q=${encodeURIComponent(searchQuery)}`, {
                    headers: {
                        'Authorization': `Bearer ${idToken}`,
                    },
                });

                const data = await response.json();
                setUsers(data.users || []);
                setMessage(data.message || '');
            } catch (error) {
                console.error('Error searching users:', error);
                setMessage('Failed to search users');
            } finally {
                setLoading(false);
            }
        };

        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }

        if (searchQuery.trim().length < 2) {
            setUsers([]);
            setMessage('');
            return;
        }

        const timeout = setTimeout(() => {
            searchUsers();
        }, 500);

        setSearchTimeout(timeout);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [searchQuery, searchTimeout]);

    const sendFriendRequest = async (userId: string) => {
        if (!auth.currentUser) return;

        setActionLoading(userId);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/friends/send-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ recipientId: userId }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update user in list
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === userId
                            ? { ...user, friendshipStatus: data.status }
                            : user
                    )
                );
            } else {
                toast.error(data.error || 'Failed to send friend request');
            }
        } catch (error) {
            console.error('Error sending friend request:', error);
            toast.error('Failed to send friend request');
        } finally {
            setActionLoading(null);
        }
    };

    const respondToRequest = async (userId: string, action: 'accept' | 'reject') => {
        if (!auth.currentUser) return;

        setActionLoading(userId);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/friends/respond', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ requesterId: userId, action }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update user in list
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === userId
                            ? { ...user, friendshipStatus: data.status }
                            : user
                    )
                );
            } else {
                toast.error(data.error || 'Failed to respond to friend request');
            }
        } catch (error) {
            console.error('Error responding to friend request:', error);
            toast.error('Failed to respond to friend request');
        } finally {
            setActionLoading(null);
        }
    };

    const unfriend = async (userId: string) => {
        if (!auth.currentUser) return;
        if (!confirm('Are you sure you want to unfriend this user?')) return;

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

            const data = await response.json();

            if (response.ok) {
                // Update user in list
                setUsers(prevUsers =>
                    prevUsers.map(user =>
                        user.id === userId
                            ? { ...user, friendshipStatus: data.status }
                            : user
                    )
                );
            } else {
                toast.error(data.error || 'Failed to unfriend user');
            }
        } catch (error) {
            console.error('Error unfriending user:', error);
            toast.error('Failed to unfriend user');
        } finally {
            setActionLoading(null);
        }
    };

    const getActionButton = (user: User) => {
        const isLoading = actionLoading === user.id;

        switch (user.friendshipStatus) {
            case 'friends':
                return (
                    <Button
                        onClick={() => unfriend(user.id)}
                        disabled={isLoading}
                        variant="outline"
                        className="flex items-center gap-2 text-red-600 hover:bg-red-50"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserX className="w-4 h-4" />
                        )}
                        Unfriend
                    </Button>
                );

            case 'request_sent':
                return (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Clock className="w-4 h-4" />
                        Request Sent
                    </div>
                );

            case 'request_received':
                return (
                    <div className="flex gap-2">
                        <Button
                            onClick={() => respondToRequest(user.id, 'accept')}
                            disabled={isLoading}
                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <UserCheck className="w-4 h-4" />
                            )}
                            Accept
                        </Button>
                        <Button
                            onClick={() => respondToRequest(user.id, 'reject')}
                            disabled={isLoading}
                            variant="outline"
                            className="text-red-600 hover:bg-red-50"
                        >
                            Reject
                        </Button>
                    </div>
                );

            default:
                return (
                    <Button
                        onClick={() => sendFriendRequest(user.id)}
                        disabled={isLoading}
                        className="flex items-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <UserPlus className="w-4 h-4" />
                        )}
                        Add Friend
                    </Button>
                );
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Find Friends</h1>

                {/* Search Input */}
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-full"
                    />
                    {loading && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                    )}
                </div>

                {/* Message */}
                {message && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">{message}</p>
                    </div>
                )}

                {/* User Results */}
                <div className="space-y-3">
                    {users.length === 0 && searchQuery.length >= 2 && !loading && (
                        <div className="text-center py-8 text-gray-500">
                            <p>No users found matching &#34;{searchQuery}&#34;</p>
                        </div>
                    )}

                    {users.map((user) => (
                        <div
                            key={user.id}
                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                    {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{user.username}</h3>
                                    <p className="text-sm text-gray-600">{user.name}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user.userType}</p>
                                </div>
                            </div>

                            <div>{getActionButton(user)}</div>
                        </div>
                    ))}
                </div>

                {/* Instructions */}
                {searchQuery.length === 0 && (
                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-semibold text-gray-900 mb-2">How to find friends:</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Type at least 2 characters to start searching</li>
                            <li>• Search is case-insensitive</li>
                            <li>• Send friend requests to connect with other users</li>
                            <li>• Accept or reject incoming friend requests</li>
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}