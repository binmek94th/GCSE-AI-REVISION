'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { UserPlus, UserCheck, UserX, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/button';
import {toast} from "sonner";

interface FriendRequest {
    id: string;
    username: string;
    name: string;
    userType: string;
}

export default function FriendRequestsComponent() {
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchFriendRequests();
    }, []);

    const fetchFriendRequests = async () => {
        if (!auth.currentUser) return;

        setLoading(true);
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/friends/requests', {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                },
            });

            const data = await response.json();
            setRequests(data.requests || []);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
        } finally {
            setLoading(false);
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

            if (response.ok) {
                // Remove from list
                setRequests(prevRequests =>
                    prevRequests.filter(req => req.id !== userId)
                );
            } else {
                const data = await response.json();
                toast.error(data.error || 'Failed to respond to friend request');
            }
        } catch (error) {
            console.error('Error responding to friend request:', error);
            toast.error('Failed to respond to friend request');
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

    if (requests.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Friend Requests</h2>
                <div className="text-center py-8 text-gray-500">
                    <UserPlus className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p>No pending friend requests</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
                Friend Requests ({requests.length})
            </h2>

            <div className="space-y-3">
                {requests.map((request) => (
                    <div
                        key={request.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                                {request.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-semibold text-gray-900">{request.username}</h3>
                                <p className="text-sm text-gray-600">{request.name}</p>
                                <p className="text-xs text-gray-500 capitalize">{request.userType}</p>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => respondToRequest(request.id, 'accept')}
                                disabled={actionLoading === request.id}
                                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                            >
                                {actionLoading === request.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <UserCheck className="w-4 h-4" />
                                )}
                                Accept
                            </Button>
                            <Button
                                onClick={() => respondToRequest(request.id, 'reject')}
                                disabled={actionLoading === request.id}
                                variant="outline"
                                className="text-red-600 hover:bg-red-50"
                            >
                                <UserX className="w-4 h-4" />
                                Reject
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}