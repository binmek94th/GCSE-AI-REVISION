import { NextRequest, NextResponse } from 'next/server';
import admin from "@/lib/firebaseAdmin";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username } = body;

        if (!username) {
            return NextResponse.json(
                { error: 'Username is required' },
                { status: 400 }
            );
        }

        // Normalize username to lowercase for case-insensitive comparison
        const normalizedUsername = username.toLowerCase().trim();

        if (normalizedUsername.length < 3) {
            return NextResponse.json(
                { available: false, message: 'Username must be at least 3 characters' },
                { status: 200 }
            );
        }

        const db = admin.firestore();

        const usersRef = db.collection('users');
        const snapshot = await usersRef
            .where('username_lowercase', '==', normalizedUsername)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            return NextResponse.json({
                available: false,
                message: 'Username is already taken'
            });
        }

        return NextResponse.json({
            available: true,
            message: 'Username is available'
        });

    } catch (error) {
        console.error('Error checking username availability:', error);
        return NextResponse.json(
            { error: 'Failed to check username availability' },
            { status: 500 }
        );
    }
}