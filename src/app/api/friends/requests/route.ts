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
        const userId = decodedToken.uid;

        const db = admin.firestore();

        // Get current user's received friend requests
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const userData = userDoc.data();
        const receivedRequestIds = userData?.receivedFriendRequests || [];

        if (receivedRequestIds.length === 0) {
            return NextResponse.json({
                requests: []
            });
        }

        // Fetch details of users who sent requests
        const requestsPromises = receivedRequestIds.map(async (requesterId: string) => {
            const requesterDoc = await db.collection('users').doc(requesterId).get();
            if (requesterDoc.exists) {
                const data = requesterDoc.data();
                return {
                    id: requesterId,
                    username: data?.username || 'Unknown',
                    name: data?.name || 'Unknown',
                    userType: data?.userType || 'student',
                };
            }
            return null;
        });

        const requests = (await Promise.all(requestsPromises)).filter(req => req !== null);

        return NextResponse.json({
            requests
        });

    } catch (error) {
        console.error('Error fetching friend requests:', error);
        return NextResponse.json(
            { error: 'Failed to fetch friend requests' },
            { status: 500 }
        );
    }
}