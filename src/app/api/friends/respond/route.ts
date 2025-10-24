import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';

export async function POST(request: NextRequest) {
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
        const userId = decodedToken.uid;

        const body = await request.json();
        const { requesterId, action } = body; // action: 'accept' or 'reject'

        if (!requesterId || !action) {
            return NextResponse.json(
                { error: 'Requester ID and action are required' },
                { status: 400 }
            );
        }

        if (action !== 'accept' && action !== 'reject') {
            return NextResponse.json(
                { error: 'Invalid action. Must be "accept" or "reject"' },
                { status: 400 }
            );
        }

        const db = admin.firestore();

        // Get user document
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const receivedRequests = userData?.receivedFriendRequests || [];

        // Check if request exists
        if (!receivedRequests.includes(requesterId)) {
            return NextResponse.json(
                { error: 'Friend request not found' },
                { status: 404 }
            );
        }

        if (action === 'accept') {
            // Add each other as friends
            await db.collection('users').doc(userId).update({
                friends: admin.firestore.FieldValue.arrayUnion(requesterId),
                receivedFriendRequests: admin.firestore.FieldValue.arrayRemove(requesterId)
            });

            await db.collection('users').doc(requesterId).update({
                friends: admin.firestore.FieldValue.arrayUnion(userId),
                sentFriendRequests: admin.firestore.FieldValue.arrayRemove(userId)
            });

            // Create notification for requester
            const requesterDoc = await db.collection('users').doc(requesterId).get();
            await db.collection('notifications').add({
                userId: requesterId,
                type: 'friend_request_accepted',
                fromUserId: userId,
                fromUsername: userData?.username || 'Unknown',
                fromName: userData?.name || 'Unknown',
                message: `${userData?.username} accepted your friend request`,
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return NextResponse.json({
                success: true,
                message: 'Friend request accepted',
                status: 'friends'
            });
        } else {
            // Reject the request
            await db.collection('users').doc(userId).update({
                receivedFriendRequests: admin.firestore.FieldValue.arrayRemove(requesterId)
            });

            await db.collection('users').doc(requesterId).update({
                sentFriendRequests: admin.firestore.FieldValue.arrayRemove(userId)
            });

            return NextResponse.json({
                success: true,
                message: 'Friend request rejected',
                status: 'none'
            });
        }

    } catch (error) {
        console.error('Error responding to friend request:', error);
        return NextResponse.json(
            { error: 'Failed to respond to friend request' },
            { status: 500 }
        );
    }
}