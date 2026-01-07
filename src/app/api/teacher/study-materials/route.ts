import admin from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subject = searchParams.get('subject');
        const examBoard = searchParams.get('examBoard');
        const status = searchParams.get('status');

        let query = admin.firestore().collection('new_study_materials');

        // Apply filters
        if (subject && subject !== "all") {
            query = query.where('subject', '==', subject) as any;
        }
        if (examBoard) {
            query = query.where('exam_board', '==', examBoard) as any;
        }
        if (status && status !== 'all') {
            query = query.where('moderation_status', '==', status) as any;
        }

        query = query.orderBy('created_at', 'desc') as any;

        const snapshot = await query.get();
        const materials = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            success: true,
            materials,
            count: materials.length,
        });
    } catch (error) {
        console.error('Error fetching study materials:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch study materials' },
            { status: 500 }
        );
    }
}
