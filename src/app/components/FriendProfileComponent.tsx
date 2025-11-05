'use client';

import { useEffect, useState } from 'react';
import { Users, Eye } from 'lucide-react';

interface FriendsListComponentProps {
    onViewFriend?: (friend: any) => void;
}

export default function FriendsListComponent({ onViewFriend }: FriendsListComponentProps) {
    const [friends, setFriends] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Your existing logic to fetch friends
        fetchFriends();
    }, []);

    const fetchFriends = async () => {
        try {
            // Your existing fetch logic here
            // const response = await fetch('/api/friends');
            // const data = await response.json();
            // setFriends(data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching friends:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Friends Yet</h3>
                <p className="text-gray-600">Start by searching for users to add as friends!</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-sm">
            <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Your Friends ({friends.length})
                </h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {friends.map((friend) => (
                        <div
                            key={friend.id}
                            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                    {friend.username?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">
                                        {friend.username}
                                    </h3>
                                    <p className="text-sm text-gray-600 truncate">
                                        {friend.email}
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={() => onViewFriend?.(friend)}
                                            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                        >
                                            <Eye className="w-4 h-4" />
                                            View Profile
                                        </button>
                                        {/* Add other action buttons here if needed */}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}