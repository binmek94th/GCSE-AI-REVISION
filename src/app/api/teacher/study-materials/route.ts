import admin from "@/lib/firebaseAdmin";
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        function formatPackId(packId: string) {
            const subject = packId
                .replace(/_/g, " ")
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            if (subject === "Art And Design")
                return"Art and Design"
            if (subject === "Art & Design")
                return "Art and Design"
            return subject
        }

        const { searchParams } = new URL(request.url);
        const subject = searchParams.get('subject');
        const examBoard = searchParams.get('examBoard');
        const status = searchParams.get('status');
        const formattedSubject = subject ? formatPackId(subject) : null;

        // Pagination parameters
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const lastDocId = searchParams.get('lastDocId');

        let query = admin.firestore().collection('study_materials');

        if (formattedSubject && subject !== "all")
            query = query.where('subject', '==', formattedSubject) as any;
        if (examBoard && examBoard !== "all")
            query = query.where('exam_board', '==', examBoard) as any;
        if (status && status !== 'all')
            query = query.where('moderation_status', '==', status) as any;

        if (lastDocId) {
            const lastDoc = await admin.firestore().collection('study_materials').doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc) as any;
            }
        }

        // Fetch one extra to check if there are more pages
        query = query.limit(limit + 1) as any;

        const snapshot = await query.get();
        const hasMore = snapshot.docs.length > limit;

        // Only return the requested limit
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

        const materials = docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const lastVisible = docs.length > 0 ? docs[docs.length - 1].id : null;

        return NextResponse.json({
            success: true,
            materials,
            count: materials.length,
            pagination: {
                page,
                limit,
                hasMore,
                lastDocId: lastVisible,
            },
        });
    } catch (error) {
        console.error('Error fetching study materials:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch study materials' },
            { status: 500 }
        );
    }
}