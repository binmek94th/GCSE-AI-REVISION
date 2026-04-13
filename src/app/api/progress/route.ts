import { NextRequest, NextResponse } from 'next/server';
import admin from "../../../lib/firebaseAdmin";

export async function GET(request: NextRequest) {
    try {
        const idToken = request.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) {
            return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Get user's examBoard preference
        const userDoc = await admin.firestore().collection('users').doc(userId).get();
        const examBoard = userDoc.data()?.preferences?.examBoard ?? userDoc.data()?.examBoard ?? null;

        // Get all progress documents for the user
        const progressSnapshot = await admin
            .firestore()
            .collection('users')
            .doc(userId)
            .collection('progress')
            .get();

        if (progressSnapshot.empty) {
            return NextResponse.json({
                userId,
                subjects: [],
                overallProgress: 0,
                totalMaterials: 0,
                totalFinished: 0,
            });
        }

        const subjectProgress = [];
        let totalMaterials = 0;
        let totalFinished = 0;

        for (const doc of progressSnapshot.docs) {
            const packId = doc.id;
            const progressData = doc.data();

            // Get the study pack to resolve the real subject name
            const studyPackDoc = await admin
                .firestore()
                .collection('study_packs')
                .doc(packId)
                .get();

            if (!studyPackDoc.exists) {
                console.log('Study pack not found for:', packId);
                continue;
            }

            const subjectName = studyPackDoc.data()?.subject;
            if (!subjectName) continue;

            // ✅ Query materials the same way the study-materials GET does —
            //    by subject name + examBoard + approved, NOT by packId
            let materialsQuery = admin
                .firestore()
                .collection('study_materials')
                .where('subject', '==', subjectName)
                .where('moderation_status', '==', 'approved');

            if (examBoard) {
                materialsQuery = materialsQuery.where('exam_board', '==', examBoard) as any;
            }

            const materialsSnapshot = await materialsQuery.get();
            const totalSubjectMaterials = materialsSnapshot.size;

            // Build a set of valid material IDs so we only count progress
            // against materials that actually exist (avoids stale progress keys)
            const validMaterialIds = new Set(materialsSnapshot.docs.map(d => d.id));

            const finishedMaterialIds = Object.keys(progressData).filter(
                key => progressData[key] === true && validMaterialIds.has(key)
            );
            const finishedCount = finishedMaterialIds.length;

            const progressPercentage = totalSubjectMaterials > 0
                ? Math.round((finishedCount / totalSubjectMaterials) * 100)
                : 0;

            // Quiz progress / grade
            const quizProgressDoc = await admin
                .firestore()
                .collection('users')
                .doc(userId)
                .collection('question_progress')
                .doc(packId)
                .get();

            let grade = 'N/A';
            let accuracyPercentage = 0;

            if (quizProgressDoc.exists) {
                const quizData = quizProgressDoc.data();

                const answeredQuestions = Object.entries(quizData || {})
                    .map(([questionId, answer]: [string, any]) => ({ questionId, ...answer }))
                    .sort((a, b) => {
                        const timeA = a.answeredAt?._seconds ?? a.answeredAt?.seconds ?? 0;
                        const timeB = b.answeredAt?._seconds ?? b.answeredAt?.seconds ?? 0;
                        return timeB - timeA;
                    })
                    .slice(0, 50);

                if (answeredQuestions.length > 0) {
                    const correctAnswers = answeredQuestions.filter(q => q.correct === true).length;
                    accuracyPercentage = Math.round((correctAnswers / answeredQuestions.length) * 100);

                    if      (accuracyPercentage >= 90) grade = 'A*';
                    else if (accuracyPercentage >= 80) grade = 'A';
                    else if (accuracyPercentage >= 70) grade = 'B';
                    else if (accuracyPercentage >= 60) grade = 'C';
                    else if (accuracyPercentage >= 50) grade = 'D';
                    else if (accuracyPercentage >= 40) grade = 'E';
                    else                               grade = 'F';
                }
            }

            subjectProgress.push({
                subjectId: packId,
                subjectName,
                totalMaterials: totalSubjectMaterials,
                finishedMaterials: finishedCount,
                progress: progressPercentage,
                grade,
                accuracyPercentage,
                finishedMaterialIds,
            });

            totalMaterials += totalSubjectMaterials;
            totalFinished += finishedCount;
        }

        const overallProgress = totalMaterials > 0
            ? Math.round((totalFinished / totalMaterials) * 100)
            : 0;

        return NextResponse.json({
            userId,
            subjects: subjectProgress,
            overallProgress,
            totalMaterials,
            totalFinished,
        });

    } catch (error) {
        console.error('Error fetching study pack progress:', error);
        return NextResponse.json({ error: 'Failed to fetch progress data' }, { status: 500 });
    }
}