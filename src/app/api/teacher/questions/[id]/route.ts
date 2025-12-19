import {NextRequest, NextResponse} from "next/server";
import admin from "firebase-admin";

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
        } = body;

        const questionRef = admin.firestore()
            .collection('questions')
            .doc(questionId);

        const questionDoc = await questionRef.get();

        if (!questionDoc.exists) {
            return NextResponse.json(
                { success: false, error: 'Question not found' },
                { status: 404 }
            );
        }

        const updateData: any = {
            updated_at: admin.firestore.FieldValue.serverTimestamp(),
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
        console.error('Error updating question:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update question' },
            { status: 500 }
        );
    }
}
