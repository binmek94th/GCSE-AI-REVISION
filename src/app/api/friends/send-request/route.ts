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
        const senderId = decodedToken.uid;

        const body = await request.json();
        const { recipientId } = body;

        if (!recipientId) {
            return NextResponse.json(
                { error: 'Recipient ID is required' },
                { status: 400 }
            );
        }

        if (senderId === recipientId) {
            return NextResponse.json(
                { error: 'Cannot send friend request to yourself' },
                { status: 400 }
            );
        }

        const db = admin.firestore();

        // Get both users
        const senderDoc = await db.collection('users').doc(senderId).get();
        const recipientDoc = await db.collection('users').doc(recipientId).get();

        if (!senderDoc.exists || !recipientDoc.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const senderData = senderDoc.data();
        const recipientData = recipientDoc.data();

        // Check if already friends
        const senderFriends = senderData?.friends || [];
        if (senderFriends.includes(recipientId)) {
            return NextResponse.json(
                { error: 'Already friends with this user' },
                { status: 400 }
            );
        }

        // Check if request already sent
        const sentRequests = senderData?.sentFriendRequests || [];
        if (sentRequests.includes(recipientId)) {
            return NextResponse.json(
                { error: 'Friend request already sent' },
                { status: 400 }
            );
        }

        // Check if there's a pending request from the recipient (accept it instead)
        const receivedRequests = senderData?.receivedFriendRequests || [];
        if (receivedRequests.includes(recipientId)) {
            // Auto-accept the existing request
            await db.collection('users').doc(senderId).update({
                friends: admin.firestore.FieldValue.arrayUnion(recipientId),
                receivedFriendRequests: admin.firestore.FieldValue.arrayRemove(recipientId)
            });

            await db.collection('users').doc(recipientId).update({
                friends: admin.firestore.FieldValue.arrayUnion(senderId),
                sentFriendRequests: admin.firestore.FieldValue.arrayRemove(senderId)
            });

            return NextResponse.json({
                success: true,
                message: 'Friend request accepted',
                status: 'friends'
            });
        }

        // Send friend request
        await db.collection('users').doc(senderId).update({
            sentFriendRequests: admin.firestore.FieldValue.arrayUnion(recipientId)
        });

        await db.collection('users').doc(recipientId).update({
            receivedFriendRequests: admin.firestore.FieldValue.arrayUnion(senderId)
        });

        // Create notification for recipient
        await db.collection('notifications').add({
            userId: recipientId,
            type: 'friend_request',
            fromUserId: senderId,
            fromUsername: senderData?.username || 'Unknown',
            fromName: senderData?.name || 'Unknown',
            message: `${senderData?.username} sent you a friend request`,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            message: 'Friend request sent successfully',
            status: 'request_sent'
        });

    } catch (error) {
        console.error('Error sending friend request:', error);
        return NextResponse.json(
            { error: 'Failed to send friend request' },
            { status: 500 }
        );
    }
}