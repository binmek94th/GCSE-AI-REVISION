import { NextRequest, NextResponse } from 'next/server';
import admin from "firebase-admin";
import { randomUUID } from 'crypto';

const COLLECTION = 'alevel_study_materials';
const EXAM_BOARD_FIELD = 'exam_board';

// Extract the storage object path from either Firebase URL format.
function extractFilePath(url: string): string {
    try {
        const urlObj = new URL(url);
        if (url.includes('/o/')) {
            const m = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
            return m ? decodeURIComponent(m[1]) : '';
        }
        if (url.includes('storage.googleapis.com')) {
            const parts = urlObj.pathname.split('/');
            parts.shift(); // leading ''
            parts.shift(); // bucket name
            return parts.join('/');
        }
    } catch { /* fall through */ }
    return '';
}

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
            topic,
            content,
            subject,
            exam_board,
            study_pack_id,
            moderation_status,
            moderation_notes,
            remove_images,
            cropped_images,
        } = body;

        const materialRef = admin.firestore().collection(COLLECTION).doc(materialId);
        const materialDoc = await materialRef.get();

        if (!materialDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Study material not found' },
                { status: 404 }
            );
        }

        const updateData: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (topic !== undefined) updateData.topic = topic;
        if (subject !== undefined) updateData.subject = subject;
        if (exam_board !== undefined) updateData[EXAM_BOARD_FIELD] = exam_board;
        if (study_pack_id !== undefined) updateData.study_pack_id = study_pack_id;

        if (moderation_status !== undefined) {
            updateData.moderation_status = moderation_status;
            updateData.moderated_at = admin.firestore.FieldValue.serverTimestamp();
        }
        if (moderation_notes !== undefined) {
            updateData.moderation_notes = moderation_notes;
        }

        if (content !== undefined) {
            let updatedContent = content;

            // --- Cropped images: upload with a download token (UBLA-safe) ---
            if (cropped_images && Object.keys(cropped_images).length > 0) {
                const bucket = admin.storage().bucket();

                for (const [originalUrl, base64Data] of Object.entries(cropped_images)) {
                    try {
                        const base64Image = (base64Data as string).split(',')[1];
                        const buffer = Buffer.from(base64Image, 'base64');

                        const timestamp = Date.now();
                        const randomString = Math.random().toString(36).substring(7);
                        const filename = `alevel_study_materials/${materialId}/cropped_${timestamp}_${randomString}.jpg`;

                        const downloadToken = randomUUID();
                        const file = bucket.file(filename);
                        await file.save(buffer, {
                            metadata: {
                                contentType: 'image/jpeg',
                                metadata: {
                                    firebaseStorageDownloadTokens: downloadToken,
                                },
                            },
                        });

                        // Stable token URL instead of makePublic() — UBLA blocks ACLs.
                        const publicUrl =
                            `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
                            `${encodeURIComponent(filename)}?alt=media&token=${downloadToken}`;

                        const escaped = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        updatedContent = updatedContent.replace(new RegExp(escaped, 'g'), publicUrl);

                        if (originalUrl.includes('firebasestorage.googleapis.com') ||
                            originalUrl.includes('storage.googleapis.com')) {
                            const filePath = extractFilePath(originalUrl);
                            if (filePath) {
                                try {
                                    await bucket.file(filePath).delete();
                                } catch (delErr) {
                                    console.warn('Old cropped image delete failed (continuing):', delErr);
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Error processing cropped image:', err);
                    }
                }
            }

            // --- Image removal ---
            if (Array.isArray(remove_images) && remove_images.length > 0) {
                const bucket = admin.storage().bucket();

                for (const imageUrl of remove_images) {
                    const escaped = imageUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    updatedContent = updatedContent
                        .replace(new RegExp(`!\\[.*?\\]\\(${escaped}\\)`, 'g'), '')
                        .replace(new RegExp(escaped, 'g'), '');

                    if (imageUrl.includes('firebasestorage.googleapis.com') ||
                        imageUrl.includes('storage.googleapis.com')) {
                        const filePath = extractFilePath(imageUrl);
                        if (filePath) {
                            try {
                                await bucket.file(filePath).delete();
                            } catch (delErr) {
                                console.warn('Removed image delete failed (continuing):', delErr);
                            }
                        }
                    }
                }

                updatedContent = updatedContent.replace(/\n{3,}/g, '\n\n');
            }

            updateData.content = updatedContent;
        }

        await materialRef.update(updateData);
        const updatedDoc = await materialRef.get();

        return NextResponse.json({
            success: true,
            material: { id: updatedDoc.id, ...updatedDoc.data() },
        });
    } catch (error) {
        console.error('Error updating A-Level study material:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update study material' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: materialId } = await context.params;
        const materialRef = admin.firestore().collection(COLLECTION).doc(materialId);
        const materialDoc = await materialRef.get();

        if (!materialDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Study material not found' },
                { status: 404 }
            );
        }

        await materialRef.delete();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting A-Level study material:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete study material' },
            { status: 500 }
        );
    }
}