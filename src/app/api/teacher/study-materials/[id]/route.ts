import { NextRequest, NextResponse } from 'next/server';
import admin from "firebase-admin";

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: materialId } = await context.params;

        if (!materialId) {
            return NextResponse.json(
                { success: false, error: 'Invalid material ID' },
                { status: 400 }
            );
        }

        const body = await request.json();

        const {
            title,
            content,
            subject,
            exam_board,
            study_pack_id,
            moderation_status,
            moderation_notes,
            remove_images,
        } = body;

        const materialRef = admin
            .firestore()
            .collection('new_study_materials')
            .doc(materialId);

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

        if (title !== undefined) updateData.title = title;
        if (subject !== undefined) updateData.subject = subject;
        if (exam_board !== undefined) updateData.exam_board = exam_board;
        if (study_pack_id !== undefined) updateData.study_pack_id = study_pack_id;

        if (moderation_status !== undefined) {
            updateData.moderation_status = moderation_status;
            updateData.moderated_at =
                admin.firestore.FieldValue.serverTimestamp();
        }

        if (moderation_notes !== undefined) {
            updateData.moderation_notes = moderation_notes;
        }

        // Handle content + image removal
        if (content !== undefined) {
            let updatedContent = content;

            if (Array.isArray(remove_images) && remove_images.length > 0) {
                for (const imageUrl of remove_images) {
                    const escaped = imageUrl.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                    );

                    updatedContent = updatedContent
                        .replace(new RegExp(`!\\[.*?\\]\\(${escaped}\\)`, 'g'), '')
                        .replace(new RegExp(escaped, 'g'), '');
                }

                updatedContent = updatedContent.replace(/\n{3,}/g, '\n\n');
            }

            updateData.content = updatedContent;
        }

        await materialRef.update(updateData);

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
