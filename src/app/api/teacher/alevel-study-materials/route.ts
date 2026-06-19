import admin from "@/lib/firebaseAdmin";
import {NextRequest, NextResponse} from 'next/server';

const COLLECTION = 'alevel_study_materials';
// Flip to 'examBoard' if your A-Level docs use camelCase (see note at end).
const EXAM_BOARD_FIELD = 'exam_board';

export async function GET(request: NextRequest) {
    try {
        function formatPackId(packId: string) {
            return packId
                .replace(/_/g, " ")
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
        }

        const { searchParams } = new URL(request.url);
        const subject = searchParams.get('subject');
        const examBoard = searchParams.get('examBoard');
        const status = searchParams.get('status');
        const formattedSubject = subject ? formatPackId(subject) : null;

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const lastDocId = searchParams.get('lastDocId');

        let query = admin.firestore().collection(COLLECTION);

        if (formattedSubject && subject !== "all")
            query = query.where('subject', '==', formattedSubject) as any;
        if (examBoard && examBoard !== "all")
            query = query.where(EXAM_BOARD_FIELD, '==', examBoard) as any;

        // Reads either timestamp casing so the pending sort works regardless.
        const docMillis = (doc: any) =>
            (doc.data().createdAt ?? doc.data().created_at)?.toMillis?.() || 0;

        if (status && status !== "all") {
            if (status === "pending") {
                const pendingQuery = query.where("moderation_status", "==", "pending");
                const pendingSnapshot = await pendingQuery.get();

                const allSnapshot = await query.get();
                const missingStatusDocs = allSnapshot.docs.filter(
                    (doc) => !doc.data().moderation_status
                );

                const combinedDocs = [...pendingSnapshot.docs, ...missingStatusDocs];
                combinedDocs.sort((a, b) => docMillis(b) - docMillis(a));

                const startIndex = lastDocId
                    ? combinedDocs.findIndex(doc => doc.id === lastDocId) + 1
                    : 0;

                const paginatedDocs = combinedDocs.slice(startIndex, startIndex + limit);
                const hasMore = startIndex + limit < combinedDocs.length;

                const materials = paginatedDocs.map(doc => ({ id: doc.id, ...doc.data() }));
                const lastVisible = paginatedDocs.length > 0
                    ? paginatedDocs[paginatedDocs.length - 1].id
                    : null;

                return NextResponse.json({
                    success: true,
                    materials,
                    count: materials.length,
                    pagination: { page, limit, hasMore, lastDocId: lastVisible },
                });
            } else {
                query = query.where("moderation_status", "==", status) as any;
            }
        }

        if (lastDocId) {
            const lastDoc = await admin.firestore().collection(COLLECTION).doc(lastDocId).get();
            if (lastDoc.exists) {
                query = query.startAfter(lastDoc) as any;
            }
        }

        query = query.limit(limit + 1) as any;

        const snapshot = await query.get();
        const hasMore = snapshot.docs.length > limit;
        const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

        const materials = docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const lastVisible = docs.length > 0 ? docs[docs.length - 1].id : null;

        return NextResponse.json({
            success: true,
            materials,
            count: materials.length,
            pagination: { page, limit, hasMore, lastDocId: lastVisible },
        });
    } catch (error) {
        console.error('Error fetching A-Level study materials:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch study materials' },
            { status: 500 }
        );
    }
}