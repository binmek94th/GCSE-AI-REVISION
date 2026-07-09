import {NextRequest, NextResponse} from 'next/server';
import admin from "@/lib/firebaseAdmin";


export async function GET(request: NextRequest) {
    try {
        function formatPackId(packId: string) {
            if (packId === "all") return "all";
            return packId
                .replace(/_/g, " ")
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")
        }

        const { searchParams } = new URL(request.url);
        const rawSubject = searchParams.get('subject');
        const flag = searchParams.get('flag');
        const subject = rawSubject ? formatPackId(rawSubject) : "all";
        const type = searchParams.get('type');
        const status = searchParams.get('status');
        // ✅ Exam board filter — A-Level question docs store this as
        // camelCase `examBoard` (distinct from study_packs' snake_case
        // `exam_board`).
        const examBoard = searchParams.get('examBoard');

        // Pagination parameters
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const limit = Math.max(1, parseInt(searchParams.get('limit') || '20'));
        const offset = (page - 1) * limit;

        let query = admin.firestore().collection('a-levelExamQuestions');

        if (subject && subject !== "all")
            query = query.where('subject', '==', subject) as any;

        if (type && type !== 'all')
            query = query.where('question_type', '==', type) as any;

        if (flag && flag !== "all")
            query = query.where('flag', '==', flag) as any;

        if (examBoard && examBoard !== 'all')
            query = query.where('examBoard', '==', examBoard) as any;

        // Handle status filtering
        if (status && status !== 'all') {
            if (status === 'pending') {
                // For pending, we need both explicitly pending and missing status.
                const pendingSnapshot = await query.where('moderation_status', '==', 'pending').get();
                const allSnapshot = await query.get();

                const missingStatusDocs = allSnapshot.docs.filter(
                    (doc) => !doc.data().moderation_status
                );

                // Combine + sort (most recent first) for consistent ordering.
                const combinedDocs = [...pendingSnapshot.docs, ...missingStatusDocs];
                combinedDocs.sort((a, b) => {
                    const aSubject = (a.data().subject || '').toLowerCase();
                    const bSubject = (b.data().subject || '').toLowerCase();
                    if (aSubject !== bSubject) {
                        return aSubject.localeCompare(bSubject);
                    }
                    const aTime = a.data().created_at?.toMillis() || 0;
                    const bTime = b.data().created_at?.toMillis() || 0;
                    return bTime - aTime;
                });

                const total = combinedDocs.length;
                const totalPages = Math.max(1, Math.ceil(total / limit));
                const paginatedDocs = combinedDocs.slice(offset, offset + limit);

                const questions = paginatedDocs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                return NextResponse.json({
                    success: true,
                    questions,
                    count: questions.length,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages,
                        hasMore: page < totalPages,
                    },
                });
            } else {
                query = query.where('moderation_status', '==', status) as any;
            }
        }

        // Total count for the filtered set (UBLA-safe: .select() avoids reading
        // field data; .count() is unreliable at runtime in some configs).
        const countSnapshot = await query.select().get();
        const total = countSnapshot.size;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        // Offset-based page fetch (default __name__ ordering — no composite index).
        const snapshot = await query.offset(offset).limit(limit).get();

        const questions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        return NextResponse.json({
            success: true,
            questions,
            count: questions.length,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasMore: page < totalPages,
            },
        });
    } catch (error) {
        console.error('Error fetching A-Level questions:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch questions' },
            { status: 500 }
        );
    }
}