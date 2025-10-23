import { NextRequest, NextResponse } from 'next/server';
import admin from "../../../lib/firebaseAdmin";


export async function GET(request: NextRequest) {
    try {
        const idToken = request.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken) {
            return NextResponse.json(
                { error: 'Missing authorization token' },
                { status: 401 }
            );
        }

        // Verify auth and get userId
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Get all progress documents for the user
        const progressRef = admin.firestore().collection('users').doc(userId).collection('progress');
        const progressSnapshot = await progressRef.get();

        if (progressSnapshot.empty) {
            return NextResponse.json({
                userId,
                subjects: [],
                overallProgress: 0,
                totalMaterials: 0,
                totalFinished: 0
            });
        }

        const subjectProgress = [];
        let totalMaterials = 0;
        let totalFinished = 0;

        // Iterate through each subject in progress collection
        for (const doc of progressSnapshot.docs) {
            const subjectId = doc.id;
            const data = doc.data();

            // Get the study pack info
            const studyPackRef = admin.firestore().collection('study_packs').doc(subjectId);
            const studyPackDoc = await studyPackRef.get();

            if (!studyPackDoc.exists) {
                console.log('Study pack not found for:', subjectId);
                continue;
            }

            const studyPackData = studyPackDoc.data();

            // Query study materials collection to count materials for this study pack
            const materialsRef = admin.firestore().collection('study_materials');
            const materialsQuery = materialsRef.where('study_pack_id', '==', subjectId);
            const materialsSnapshot = await materialsQuery.get();
            const totalSubjectMaterials = materialsSnapshot.size;


            const finishedMaterialIds = Object.keys(data).filter(key => data[key] === true);
            const finishedCount = finishedMaterialIds.length;

            const progressPercentage = totalSubjectMaterials > 0
                ? Math.round((finishedCount / totalSubjectMaterials) * 100)
                : 0;

            const quizProgressRef = admin.firestore()
                .collection('users')
                .doc(userId)
                .collection('question_progress')
                .doc(subjectId);

            const quizProgressDoc = await quizProgressRef.get();
            let grade = 'N/A';
            let accuracyPercentage = 0;

            if (quizProgressDoc.exists) {
                const quizData = quizProgressDoc.data();

                // Convert the map to an array and sort by answeredAt timestamp (most recent first)
                const answeredQuestions = Object.entries(quizData || {})
                    .map(([questionId, answer]: [string, any]) => ({
                        questionId,
                        ...answer
                    }))
                    .sort((a, b) => {
                        // Handle Firestore Timestamp objects
                        const timeA = a.answeredAt?._seconds || a.answeredAt?.seconds || 0;
                        const timeB = b.answeredAt?._seconds || b.answeredAt?.seconds || 0;
                        return timeB - timeA;
                    })
                    .slice(0, 50);

                if (answeredQuestions.length > 0) {
                    const correctAnswers = answeredQuestions.filter(q => q.correct === true).length;
                    accuracyPercentage = Math.round((correctAnswers / answeredQuestions.length) * 100);

                    if (accuracyPercentage >= 90) grade = 'A*';
                    else if (accuracyPercentage >= 80) grade = 'A';
                    else if (accuracyPercentage >= 70) grade = 'B';
                    else if (accuracyPercentage >= 60) grade = 'C';
                    else if (accuracyPercentage >= 50) grade = 'D';
                    else if (accuracyPercentage >= 40) grade = 'E';
                    else if (accuracyPercentage < 40) grade = 'F';
                    else grade = 'U';
                }
            }

            subjectProgress.push({
                subjectId,
                subjectName: studyPackData?.name || subjectId,
                totalMaterials: totalSubjectMaterials,
                finishedMaterials: finishedCount,
                progress: progressPercentage,
                grade: grade,
                finishedMaterialIds: finishedMaterialIds
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
            totalFinished
        });

    } catch (error) {
        console.error('Error fetching study pack progress:', error);

        if (error instanceof Error && error.message.includes('auth')) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch progress data' },
            { status: 500 }
        );
    }
}