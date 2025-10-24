import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
    try {
        // Get the authorization token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const currentUserId = decodedToken.uid;

        // Get search query from URL params
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.trim().length < 2) {
            return NextResponse.json({
                users: [],
                message: 'Search query must be at least 2 characters'
            });
        }

        const normalizedQuery = query.toLowerCase().trim();
        const db = admin.firestore();

        // Search for users by username (case-insensitive prefix match)
        const usersRef = db.collection('users');

        // Get users where username_lowercase starts with the query
        const snapshot = await usersRef
            .where('username_lowercase', '>=', normalizedQuery)
            .where('username_lowercase', '<=', normalizedQuery + '\uf8ff')
            .limit(20)
            .get();

        if (snapshot.empty) {
            return NextResponse.json({
                users: [],
                message: 'No users found'
            });
        }

        // Get current user's friend requests and friends
        const currentUserDoc = await db.collection('users').doc(currentUserId).get();
        const currentUserData = currentUserDoc.data();

        const friends = currentUserData?.friends || [];
        const sentRequests = currentUserData?.sentFriendRequests || [];
        const receivedRequests = currentUserData?.receivedFriendRequests || [];

        // Format user data
        const users = snapshot.docs
            .filter(doc => doc.id !== currentUserId) // Exclude current user
            .map(doc => {
                const data = doc.data();
                const userId = doc.id;

                // Determine friendship status
                let friendshipStatus = 'none';
                if (friends.includes(userId)) {
                    friendshipStatus = 'friends';
                } else if (sentRequests.includes(userId)) {
                    friendshipStatus = 'request_sent';
                } else if (receivedRequests.includes(userId)) {
                    friendshipStatus = 'request_received';
                }

                return {
                    id: userId,
                    username: data.username,
                    name: data.name,
                    userType: data.userType,
                    friendshipStatus,
                };
            });

        return NextResponse.json({
            users,
            message: users.length > 0 ? `Found ${users.length} user(s)` : 'No users found'
        });

    } catch (error) {
        console.error('Error searching users:', error);
        return NextResponse.json(
            { error: 'Failed to search users' },
            { status: 500 }
        );
    }
}