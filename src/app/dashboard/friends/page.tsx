'use client';

import { useState } from 'react';
import UserSearchComponent from '@/app/components/UserSearchComponent';
import FriendRequestsComponent from '@/app/components/FriendRequestsComponent';
import { Users, UserPlus, Search, ArrowLeft } from 'lucide-react';
import FriendsListComponent from "@/app/components/FriendListComponent";
import FriendProfileView from "@/app/components/FriendProfileView";

export default function FriendsPage() {
    const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
    const [selectedFriend, setSelectedFriend] = useState<any>(null);

    const tabs = [
        {
            id: 'friends',
            label: 'My Friends',
            icon: Users,
            component: FriendsListComponent
        },
        {
            id: 'requests',
            label: 'Friend Requests',
            icon: UserPlus,
            component: FriendRequestsComponent
        },
        {
            id: 'search',
            label: 'Find Friends',
            icon: Search,
            component: UserSearchComponent
        }
    ];

    const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

    const handleViewFriend = (friend: any) => {
        setSelectedFriend(friend);
    };

    const handleBackToList = () => {
        setSelectedFriend(null);
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    {selectedFriend && (
                        <button
                            onClick={handleBackToList}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back to Friends</span>
                        </button>
                    )}
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {selectedFriend ? `${selectedFriend.username}'s Profile` : 'Friends'}
                    </h1>
                    <p className="text-gray-600">
                        {selectedFriend
                            ? 'View badges and achievements'
                            : 'Connect with other students and build your study network'}
                    </p>
                </div>

                {/* Show either the friend's profile or the tabs */}
                {selectedFriend ? (
                    <FriendProfileView friend={selectedFriend} />
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="bg-white rounded-lg shadow-sm mb-6 overflow-hidden">
                            <div className="flex border-b border-gray-200">
                                {tabs.map((tab) => {
                                    const Icon = tab.icon;
                                    return (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveTab(tab.id as any)}
                                            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
                                                activeTab === tab.id
                                                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="hidden sm:inline">{tab.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Active Component */}
                        <div className="transition-all duration-200">
                            {ActiveComponent && activeTab === 'friends' && (
                                <ActiveComponent onViewFriend={handleViewFriend} />
                            )}
                            {ActiveComponent && activeTab !== 'friends' && (
                                <ActiveComponent />
                            )}
                        </div>

                        {/* Help Section */}
                        <div className="mt-8 bg-blue-50 rounded-lg p-6 border border-blue-200">
                            <h3 className="font-semibold text-blue-900 mb-3">How the Friend System Works</h3>
                            <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-800">
                                <div>
                                    <h4 className="font-semibold mb-1">1. Find Friends</h4>
                                    <p>Search for other users by their username and send friend requests</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">2. Manage Requests</h4>
                                    <p>Accept or reject incoming friend requests from other users</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-1">3. Stay Connected</h4>
                                    <p>View your friends list and manage your connections</p>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}