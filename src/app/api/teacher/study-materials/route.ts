import { NextRequest, NextResponse } from 'next/server';
import admin from "firebase-admin";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const subject = searchParams.get('subject');
        const examBoard = searchParams.get('examBoard');
        const status = searchParams.get('status');
        const limit = parseInt(searchParams.get('limit') || '50');

        let query = admin.firestore().collection('study_materials');

        // Apply filters
        if (subject) {
            query = query.where('subject', '==', subject) as any;
        }
        if (examBoard) {
            query = query.where('exam_board', '==', examBoard) as any;
        }
        if (status && status !== 'all') {
            query = query.where('moderation_status', '==', status) as any;
        }

        // Order by creation date (newest first)
        query = query.orderBy('created_at', 'desc').limit(limit) as any;

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

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const materialId = params.id;
        const body = await request.json();

        const {
            title,
            content,
            subject,
            exam_board,
            study_pack_id,
            moderation_status,
            moderation_notes,
            remove_images, // Array of image URLs to remove
        } = body;

        // Get the current material
        const materialRef = admin.firestore().collection('study_materials').doc(materialId);
        const materialDoc = await materialRef.get();

        if (!materialDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Study material not found' },
                { status: 404 }
            );
        }

        const updateData: any = {
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Update fields if provided
        if (title !== undefined) updateData.title = title;
        if (subject !== undefined) updateData.subject = subject;
        if (exam_board !== undefined) updateData.exam_board = exam_board;
        if (study_pack_id !== undefined) updateData.study_pack_id = study_pack_id;
        if (moderation_status !== undefined) {
            updateData.moderation_status = moderation_status;
            updateData.moderated_at = admin.firestore.FieldValue.serverTimestamp();
        }
        if (moderation_notes !== undefined) updateData.moderation_notes = moderation_notes;

        // Handle content updates and image removal
        if (content !== undefined) {
            let updatedContent = content;

            // Remove specific images if requested
            if (remove_images && remove_images.length > 0) {
                for (const imageUrl of remove_images) {
                    // Remove markdown image syntax
                    const imagePattern = new RegExp(
                        `!\\[.*?\\]\\(${imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`,
                        'g'
                    );
                    updatedContent = updatedContent.replace(imagePattern, '');

                    // Remove standalone URLs
                    updatedContent = updatedContent.replace(
                        new RegExp(imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                        ''
                    );
                }

                // Clean up extra newlines
                updatedContent = updatedContent.replace(/\n{3,}/g, '\n\n');
            }

            updateData.content = updatedContent;
        }

        // Update the document
        await materialRef.update(updateData);

        // Get the updated document
        const updatedDoc = await materialRef.get();

        return NextResponse.json({
            success: true,
            material: {
                id: updatedDoc.id,
                ...updatedDoc.data(),
            },
        });
    } catch (error) {
        console.error('Error updating study material:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update study material' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const materialId = params.id;

        const materialRef = admin.firestore().collection('study_materials').doc(materialId);
        const materialDoc = await materialRef.get();

        if (!materialDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Study material not found' },
                { status: 404 }
            );
        }

        // Soft delete by updating status
        await materialRef.update({
            moderation_status: 'deleted',
            deleted_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        return NextResponse.json({
            success: true,
            message: 'Study material deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting study material:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete study material' },
            { status: 500 }
        );
    }
}