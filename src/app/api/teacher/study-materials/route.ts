import admin from "@/lib/firebaseAdmin";
import {NextRequest, NextResponse} from 'next/server';

export async function GET(request: NextRequest) {
    try {
        function formatPackId(packId: string) {
            const subject = packId
                .replace(/_/g, " ")
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            if (subject === "Art And Design")
                return "Art and Design"
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

        // Handle status filtering
        if (status && status !== "all") {
            if (status === "pending") {
                // For pending, we need to get both explicitly pending and missing status
                // This is trickier with pagination, so we'll fetch all and paginate in memory
                const pendingQuery = query.where("moderation_status", "==", "pending");
                const pendingSnapshot = await pendingQuery.get();

                const allSnapshot = await query.get();

                const missingStatusDocs = allSnapshot.docs.filter(
                    (doc) => !doc.data().moderation_status
                );

                // Combine and sort by creation time or document ID for consistent ordering
                const combinedDocs = [...pendingSnapshot.docs, ...missingStatusDocs];

                // Sort for consistent pagination (you may want to adjust the sort field)
                combinedDocs.sort((a, b) => {
                    const aTime = a.data().created_at?.toMillis() || 0;
                    const bTime = b.data().created_at?.toMillis() || 0;
                    return bTime - aTime; // Most recent first
                });

                // Apply pagination manually
                const startIndex = lastDocId
                    ? combinedDocs.findIndex(doc => doc.id === lastDocId) + 1
                    : 0;

                const paginatedDocs = combinedDocs.slice(startIndex, startIndex + limit);
                const hasMore = startIndex + limit < combinedDocs.length;

                const materials = paginatedDocs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));

                const lastVisible = paginatedDocs.length > 0
                    ? paginatedDocs[paginatedDocs.length - 1].id
                    : null;

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
            } else {
                query = query.where("moderation_status", "==", status) as any;
            }
        }

        // Apply cursor-based pagination
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