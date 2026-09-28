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
                // "Pending" means moderation_status is 'pending' OR missing
                // entirely (older docs). Firestore can't query "field is
                // missing", so we have to look at every doc — but we do it
                // with ONE lightweight projection (only the few fields we
                // need to filter + sort) instead of downloading the whole
                // collection twice with all its question text, choices and
                // explanations, which is what made this so slow.
                const lightSnapshot = await query
                    .select('subject', 'createdAt', 'created_at', 'moderation_status')
                    .get();

                const toMillis = (v: any): number =>
                    typeof v?.toMillis === 'function' ? v.toMillis() : 0;

                const pendingIndex = lightSnapshot.docs
                    .map(doc => {
                        const d = doc.data();
                        return {
                            ref: doc.ref,
                            status: d.moderation_status as string | undefined,
                            subject: String(d.subject || '').toLowerCase(),
                            // A-Level docs use `createdAt`; older ones `created_at`.
                            time: toMillis(d.createdAt) || toMillis(d.created_at),
                        };
                    })
                    .filter(d => !d.status || d.status === 'pending');

                // Subject A→Z, then most recent first — same order as before.
                pendingIndex.sort((a, b) =>
                    a.subject !== b.subject
                        ? a.subject.localeCompare(b.subject)
                        : b.time - a.time
                );

                const total = pendingIndex.length;
                const totalPages = Math.max(1, Math.ceil(total / limit));
                const pageRefs = pendingIndex.slice(offset, offset + limit).map(d => d.ref);

                // Only the requested page is fetched in full.
                const pageDocs = pageRefs.length
                    ? await admin.firestore().getAll(...pageRefs)
                    : [];

                const questions = pageDocs
                    .filter(doc => doc.exists)
                    .map(doc => ({
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