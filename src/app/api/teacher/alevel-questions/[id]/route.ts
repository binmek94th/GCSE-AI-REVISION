import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import { randomUUID } from "crypto";

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

// Decode a data: URL into a Buffer + mime type.
function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return null;
    return {
        contentType: match[1],
        buffer: Buffer.from(match[2], "base64"),
    };
}

const CHOICE_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

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
            croppedImage,
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

        const existing = questionDoc.data() || {};

        // snake_case to match the rest of the A-Level schema (the PUT previously
        // wrote camelCase `updatedAt`, which the read path ignores).
        const updateData: any = {
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Question text: A-Level docs read `questionText`. Write it there (and a
        // legacy `question` mirror) instead of the dead `question_text` field.
        if (question_text !== undefined) {
            updateData.questionText = question_text;
            updateData.question = question_text;
        }

        // Options: the component edits a flat string[] + a correct_answer string,
        // but A-Level docs are read from `choices[]` ({ option, text, isCorrect }).
        // Rebuild choices so the edit actually shows after save.
        if (options !== undefined) {
            const flatOptions: string[] = Array.isArray(options)
                ? options.map((o: any) => (typeof o === 'string' ? o : o?.text ?? ''))
                : Object.values(options as Record<string, string>);

            updateData.choices = flatOptions.map((text, i) => ({
                option: CHOICE_LETTERS[i] ?? String(i + 1),
                text,
                isCorrect: correct_answer !== undefined ? text === correct_answer : false,
            }));

            // Keep flat mirrors for any GCSE-style readers.
            updateData.options = flatOptions;
        }

        if (correct_answer !== undefined) {
            updateData.correct_answer = correct_answer;
            updateData.correctAnswer = correct_answer;
        }

        if (explanation !== undefined) updateData.explanation = explanation;
        if (subject !== undefined) updateData.subject = subject;
        if (topic !== undefined) updateData.topic = topic;
        if (difficulty !== undefined) updateData.difficulty = difficulty;
        if (question_type !== undefined) updateData.question_type = question_type;
        if (marks !== undefined) updateData.marks = marks;

        if (moderation_status !== undefined) {
            updateData.moderation_status = moderation_status;
            updateData.moderated_at = admin.firestore.FieldValue.serverTimestamp();
        }

        if (moderation_notes !== undefined) {
            updateData.moderation_notes = moderation_notes;
        }

        // --- Cropped image upload ---
        // The client crops on a canvas and posts a JPEG data URL. Overwrite the
        // existing Storage object when possible (else create a new path), using a
        // UUID download token for a permanent, UBLA-safe URL.
        if (croppedImage && typeof croppedImage === 'string') {
            const decoded = decodeDataUrl(croppedImage);
            if (!decoded) {
                return NextResponse.json(
                    { success: false, error: 'Invalid cropped image data' },
                    { status: 400 }
                );
            }

            const existingUrl: string | null = existing.imageUrl ?? null;
            const parsed = existingUrl ? parseStorageUrl(existingUrl) : null;

            const bucket = parsed
                ? admin.storage().bucket(parsed.bucket)
                : admin.storage().bucket();
            const path = parsed?.path ?? `alevel-questions/${questionId}/${randomUUID()}.jpg`;

            const token = randomUUID();
            await bucket.file(path).save(decoded.buffer, {
                resumable: false,
                contentType: decoded.contentType || 'image/jpeg',
                metadata: {
                    metadata: { firebaseStorageDownloadTokens: token },
                },
            });

            const newUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

            updateData.imageUrl = newUrl;
            updateData.hasImage = true;
        }

        // --- Image removal ---
        // Clears the Firestore reference (matching the schema convention where
        // image-less questions store imageUrl: null), and best-effort deletes the
        // underlying Storage object. Storage failure does NOT block the update.
        if (removeImage) {
            const existingUrl: string | null = existing.imageUrl ?? null;

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

        // Validate correct answer against the submitted options.
        if (options && correct_answer !== undefined) {
            const optionValues = Array.isArray(options)
                ? options.map(opt => (typeof opt === 'string' ? opt : opt.text))
                : Object.values(options);

            if (!optionValues.includes(correct_answer)) {
                return NextResponse.json(
                    { success: false, error: 'Correct answer must match one of the options' },
                    { status: 400 }
                );
            }
        }

        await questionRef.update(updateData);

        const updatedDoc = await questionRef.get();

        return NextResponse.json({
            success: true,
            // Returned to handleSaveCrop so the <img> swaps to the fresh URL.
            imageUrl: updateData.imageUrl ?? existing.imageUrl ?? null,
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