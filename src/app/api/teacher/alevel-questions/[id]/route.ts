import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";

// Extract bucket + object path from a Firebase Storage download URL:
// https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<url-encoded-path>?alt=media&token=...
function parseStorageUrl(url: string): { bucket: string; path: string } | null {
    try {
        const match = url.match(/\/b\/([^/]+)\/o\/([^?]+)/);
        if (!match) return null;
        return {
            bucket: match[1],
            path: decodeURIComponent(match[2]),
        };
    } catch {
        return null;
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: questionId } = await context.params;

        const body = await request.json();

        const {
            question_text,
            options,
            correct_answer,
            explanation,
            subject,
            topic,
            difficulty,
            question_type,
            moderation_status,
            moderation_notes,
            marks,
            removeImage,
        } = body;

        const questionRef = admin.firestore()
            .collection('a-levelExamQuestions')
            .doc(questionId);

        const questionDoc = await questionRef.get();

        if (!questionDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Question not found' },
                { status: 404 }
            );
        }

        const updateData: any = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (question_text !== undefined) updateData.question_text = question_text;
        if (options !== undefined) updateData.options = options;
        if (correct_answer !== undefined) updateData.correct_answer = correct_answer;
        if (explanation !== undefined) updateData.explanation = explanation;
        if (subject !== undefined) updateData.subject = subject;
        if (topic !== undefined) updateData.topic = topic;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (question_type !== undefined) updateData.question_type = question_type;
        if (marks !== undefined) updateData.marks = marks;

        if (moderation_status !== undefined) {
            updateData.moderation_status = moderation_status;
            updateData.moderated_at =
                admin.firestore.FieldValue.serverTimestamp();
        }

        if (moderation_notes !== undefined) {
            updateData.moderation_notes = moderation_notes;
        }

        // --- Image removal ---
        // Clears the Firestore reference (matching the schema convention where
        // image-less questions store imageUrl: null), and best-effort deletes the
        // underlying Storage object. Storage failure does NOT block the update.
        if (removeImage) {
            const existing = questionDoc.data();
            const existingUrl: string | null = existing?.imageUrl ?? null;

            updateData.imageUrl = null;
            updateData.hasImage = false;
            updateData.imageDescription = '';

            if (existingUrl) {
                const parsed = parseStorageUrl(existingUrl);
                if (parsed) {
                    try {
                        await admin
                            .storage()
                            .bucket(parsed.bucket)
                            .file(parsed.path)
                            .delete();
                    } catch (storageErr) {
                        // Orphaned file is preferable to a failed moderation action.
                        console.warn(
                            `Storage delete failed for ${parsed.path} (continuing):`,
                            storageErr
                        );
                    }
                }
            }
        }

        // Validate correct answer
        if (options && correct_answer !== undefined) {
            const optionValues = Array.isArray(options)
                ? options.map(opt => typeof opt === 'string' ? opt : opt.text)
                : Object.values(options);

            if (!optionValues.includes(correct_answer)) {
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Correct answer must match one of the options',
                    },
                    { status: 400 }
                );
            }
        }

        await questionRef.update(updateData);

        const updatedDoc = await questionRef.get();

        return NextResponse.json({
            success: true,
            question: {
                id: updatedDoc.id,
                ...updatedDoc.data(),
            },
        });
    } catch (error) {
        console.error('Error updating A-Level question:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update question' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: questionId } = await context.params;

        const questionRef = admin.firestore()
            .collection('a-levelExamQuestions')
            .doc(questionId);

        const questionDoc = await questionRef.get();

        if (!questionDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Question not found' },
                { status: 404 }
            );
        }

        await questionRef.delete();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting A-Level question:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete question' },
            { status: 500 }
        );
    }
}