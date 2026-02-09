import { NextRequest, NextResponse } from 'next/server';
import admin from "@/lib/firebaseAdmin";


export async function GET(request: NextRequest) {
    try {
        function formatPackId(packId: string) {
            if (packId === "all") return "all";
            const subject = packId
                .replace(/_/g, " ")
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            if (subject === "Art And Design")
                return"Art and Design"
            return subject
        }


        const { searchParams } = new URL(request.url);
        const rawSubject = searchParams.get('subject');
        const subject = rawSubject ? formatPackId(rawSubject) : "all";
        const type = searchParams.get('type');
        const status = searchParams.get('status');

        // Pagination parameters
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const lastDocId = searchParams.get('lastDocId');

        let query = admin.firestore().collection('questions');

        if (subject && subject !== "all")
            query = query.where('subject', '==', subject) as any;

        if (type && type !== 'all')
            query = query.where('question_type', '==', type) as any;

        if (status && status !== 'all')
            query = query.where('moderation_status', '==', status) as any;

        if (lastDocId) {
            const lastDoc = await admin.firestore().collection('questions').doc(lastDocId).get();
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

        const questions = docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        const lastVisible = docs.length > 0 ? docs[docs.length - 1].id : null;

        return NextResponse.json({
            success: true,
            questions,
            count: questions.length,
            pagination: {
                page,
                limit,
                hasMore,
                lastDocId: lastVisible,
            },
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch questions' },
            { status: 500 }
        );
    }
}