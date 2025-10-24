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
        const { friendId } = body;

        if (!friendId) {
            return NextResponse.json(
                { error: 'Friend ID is required' },
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
        const friends = userData?.friends || [];

        // Check if they are friends
        if (!friends.includes(friendId)) {
            return NextResponse.json(
                { error: 'Not friends with this user' },
                { status: 400 }
            );
        }

        // Remove from both friends lists
        await db.collection('users').doc(userId).update({
            friends: admin.firestore.FieldValue.arrayRemove(friendId)
        });

        await db.collection('users').doc(friendId).update({
            friends: admin.firestore.FieldValue.arrayRemove(userId)
        });

        return NextResponse.json({
            success: true,
            message: 'Friend removed successfully',
            status: 'none'
        });

    } catch (error) {
        console.error('Error removing friend:', error);
        return NextResponse.json(
            { error: 'Failed to remove friend' },
            { status: 500 }
        );
    }
}