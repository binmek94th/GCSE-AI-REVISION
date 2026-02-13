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
            cropped_images,
        } = body;

        const materialRef = admin
            .firestore()
            .collection('study_materials')
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

        // Handle content + image processing
        if (content !== undefined) {
            let updatedContent = content;

            // Handle cropped images first
            if (cropped_images && Object.keys(cropped_images).length > 0) {
                const bucket = admin.storage().bucket();

                for (const [originalUrl, base64Data] of Object.entries(cropped_images)) {
                    try {
                        // Extract base64 data (remove data URL prefix)
                        const base64Image = (base64Data as string).split(',')[1];
                        const buffer = Buffer.from(base64Image, 'base64');

                        // Generate a unique filename
                        const timestamp = Date.now();
                        const randomString = Math.random().toString(36).substring(7);
                        const filename = `study_materials/${materialId}/cropped_${timestamp}_${randomString}.jpg`;

                        // Upload to Firebase Storage
                        const file = bucket.file(filename);
                        await file.save(buffer, {
                            metadata: {
                                contentType: 'image/jpeg',
                            },
                        });

                        // Make the file publicly accessible
                        await file.makePublic();

                        // Get the public URL
                        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filename}`;

                        // Replace the old URL with the new one in the content
                        const escapedOriginalUrl = originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        updatedContent = updatedContent.replace(
                            new RegExp(escapedOriginalUrl, 'g'),
                            publicUrl
                        );

                        // Delete the old image if it's from Firebase Storage
                        if (originalUrl.includes('firebasestorage.googleapis.com') ||
                            originalUrl.includes('storage.googleapis.com')) {
                            try {
                                const urlObj = new URL(originalUrl);
                                let filePath = '';

                                // Handle different Firebase Storage URL formats
                                if (originalUrl.includes('/o/')) {
                                    // Format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path?alt=media
                                    const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
                                    if (pathMatch) {
                                        filePath = decodeURIComponent(pathMatch[1]);
                                    }
                                } else if (originalUrl.includes('storage.googleapis.com')) {
                                    // Format: https://storage.googleapis.com/bucket/path
                                    const pathParts = urlObj.pathname.split('/');
                                    pathParts.shift(); // Remove empty string from leading /
                                    pathParts.shift(); // Remove bucket name
                                    filePath = pathParts.join('/');
                                }

                                if (filePath) {
                                    await bucket.file(filePath).delete();
                                    console.log(`Deleted old image: ${filePath}`);
                                }
                            } catch (deleteError) {
                                console.error('Error deleting old image:', deleteError);
                                // Continue even if delete fails
                            }
                        }
                    } catch (error) {
                        console.error('Error processing cropped image:', error);
                        // Continue with other images even if one fails
                    }
                }
            }

            // Handle image removal
            if (Array.isArray(remove_images) && remove_images.length > 0) {
                const bucket = admin.storage().bucket();

                for (const imageUrl of remove_images) {
                    const escaped = imageUrl.replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                    );

                    // Remove from content
                    updatedContent = updatedContent
                        .replace(new RegExp(`!\\[.*?\\]\\(${escaped}\\)`, 'g'), '')
                        .replace(new RegExp(escaped, 'g'), '');

                    // Delete from Firebase Storage
                    if (imageUrl.includes('firebasestorage.googleapis.com') ||
                        imageUrl.includes('storage.googleapis.com')) {
                        try {
                            const urlObj = new URL(imageUrl);
                            let filePath = '';

                            if (imageUrl.includes('/o/')) {
                                const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
                                if (pathMatch) {
                                    filePath = decodeURIComponent(pathMatch[1]);
                                }
                            } else if (imageUrl.includes('storage.googleapis.com')) {
                                const pathParts = urlObj.pathname.split('/');
                                pathParts.shift();
                                pathParts.shift();
                                filePath = pathParts.join('/');
                            }

                            if (filePath) {
                                await bucket.file(filePath).delete();
                                console.log(`Deleted removed image: ${filePath}`);
                            }
                        } catch (deleteError) {
                            console.error('Error deleting removed image:', deleteError);
                        }
                    }
                }

                // Clean up excessive newlines
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