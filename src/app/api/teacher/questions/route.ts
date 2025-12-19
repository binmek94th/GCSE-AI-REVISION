import { NextRequest, NextResponse } from 'next/server';
import admin from "@/lib/firebaseAdmin";


export async function GET(request: NextRequest) {
    try {
        function denormalizeSubject(value: string) {
            return value
                .replace(/_/g, ' ')
                .replace(/\band\b/gi, '&')
                .replace(/\b\w/g, c => c.toUpperCase());
        }


        const { searchParams } = new URL(request.url);
        const rawSubject = searchParams.get('subject');
        console.log(rawSubject);
        const subject = rawSubject ? denormalizeSubject(rawSubject) : null;
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '100');

        let query = admin.firestore().collection('questions');

        if (subject) query = query.where('subject', '==', subject) as any;
        // }
        // if (type && type !== 'all') {
        //     query = query.where('question_type', '==', type) as any;
        // }
        if (status && status !== 'all') {
            query = query.where('moderation_status', '==', status) as any;
        }

        query = query.orderBy('created_at', 'desc') as any;

        const snapshot = await query.get();
        const questions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            success: true,
            questions,
            count: questions.length,
        });
    } catch (error) {
        console.error('Error fetching questions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch questions' },
            { status: 500 }
        );
    }
}


