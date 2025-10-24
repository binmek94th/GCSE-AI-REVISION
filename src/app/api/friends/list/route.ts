import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const db = admin.firestore();

        // Get current user's friends
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const friendIds = userData?.friends || [];

        if (friendIds.length === 0) {
            return NextResponse.json({
                friends: []
            });
        }

        // Fetch details of all friends
        const friendsPromises = friendIds.map(async (friendId: string) => {
            const friendDoc = await db.collection('users').doc(friendId).get();
            if (friendDoc.exists) {
                const data = friendDoc.data();
                return {
                    id: friendId,
                    username: data?.username || 'Unknown',
                    name: data?.name || 'Unknown',
                    userType: data?.userType || 'student',
                };
            }
            return null;
        });

        const friends = (await Promise.all(friendsPromises)).filter(friend => friend !== null);

        // Sort friends alphabetically by username
        friends.sort((a, b) => a!.username.localeCompare(b!.username));

        return NextResponse.json({
            friends
        });

    } catch (error) {
        console.error('Error fetching friends list:', error);
        return NextResponse.json(
            { error: 'Failed to fetch friends list' },
            { status: 500 }
        );
    }
}