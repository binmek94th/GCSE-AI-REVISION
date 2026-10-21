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

        const db = admin.firestore();

        // The user doc and their progress docs don't depend on each other —
        // read them together instead of one after the other.
        const [userDoc, progressSnapshot] = await Promise.all([
            db.collection('users').doc(userId).get(),
            db.collection('users').doc(userId).collection('progress').get(),
        ]);

        // Get user's examBoard + level preference
        const userData = userDoc.data();
        const examBoard = userData?.preferences?.examBoard ?? userData?.examBoard ?? null;
        const level = userData?.level ?? userData?.preferences?.level ?? null;

        if (progressSnapshot.empty) {
            return NextResponse.json({
                userId,
                subjects: [],
                overallProgress: 0,
                totalMaterials: 0,
                totalFinished: 0,
            });
        }

        // /api/study_materials' POST writes each entry as
        // {materialId: {done: true, completedAt}}, not a plain boolean —
        // this was checking `=== true`, which an object never satisfies,
        // so finishedMaterialIds was always empty and "Materials" showed
        // 0%/"Not started" no matter how much was actually completed.
        // Also accepts a literal `true` for any older/other callers.
        const isMaterialDone = (value: unknown): boolean =>
            value === true || (typeof value === 'object' && value !== null && (value as any).done === true);

        // Every pack is independent, so they're processed at the same time.
        // This loop used to run one pack after another (three awaited reads
        // each), so the dashboard — which shows a full-screen spinner until
        // this returns — waited for all of them back to back.
        const perPack = await Promise.all(progressSnapshot.docs.map(async (doc) => {
            const packId = doc.id;
            const progressData = doc.data();

            // The pack (to resolve the real subject name) and this pack's quiz
            // progress don't depend on each other.
            const [studyPackDoc, quizProgressDoc] = await Promise.all([
                db.collection('study_packs').doc(packId).get(),
                db.collection('users').doc(userId).collection('question_progress').doc(packId).get(),
            ]);

            if (!studyPackDoc.exists) {
                console.log('Study pack not found for:', packId);
                return null;
            }

            const studyPackData = studyPackDoc.data();
            const subjectName = studyPackData?.subject;
            if (!subjectName) return null;

            // ✅ Filter subjects by the user's level preference (fail-open if either
            //    side is missing, so we never silently hide content due to a
            //    missing level field on the pack or the user)
            const packLevel = studyPackData?.level;
            if (level && packLevel && packLevel !== level) {
                return null;
            }

            // GCSE and A-Level materials live in separate collections (see
            // /api/study_materials, which already branches on this). This
            // route was always querying 'study_materials' (GCSE) regardless
            // of the pack's own level — so for any A-Level pack,
            // totalSubjectMaterials came back 0 and "Materials" showed
            // 0%/"Not started" no matter how much was actually completed.
            const isALevel = packLevel === 'A-Level' || packLevel === 'alevel' || packLevel === 'a-level';
            const materialsCollection = isALevel ? 'alevel_study_materials' : 'study_materials';

            // ✅ Query materials the same way the study-materials GET does —
            //    by subject name + examBoard + approved, NOT by packId
            let materialsQuery = db
                .collection(materialsCollection)
                .where('subject', '==', subjectName)
                .where('moderation_status', '==', 'approved');

            if (examBoard) {
                materialsQuery = materialsQuery.where('exam_board', '==', examBoard) as any;
            }

            // Only the ids and the count are used, so ask for no fields. Each
            // material document holds its full lesson text (tens of KB), and
            // this used to download all of it just to count them.
            const materialsSnapshot = await materialsQuery.select().get();
            const totalSubjectMaterials = materialsSnapshot.size;

            // Build a set of valid material IDs so we only count progress
            // against materials that actually exist (avoids stale progress keys)
            const validMaterialIds = new Set(materialsSnapshot.docs.map(d => d.id));

            const finishedMaterialIds = Object.keys(progressData).filter(
                key => isMaterialDone(progressData[key]) && validMaterialIds.has(key)
            );
            const finishedCount = finishedMaterialIds.length;

            const progressPercentage = totalSubjectMaterials > 0
                ? Math.round((finishedCount / totalSubjectMaterials) * 100)
                : 0;

            // Quiz progress / grade
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

            return {
                subjectId: packId,
                subjectName,
                totalMaterials: totalSubjectMaterials,
                finishedMaterials: finishedCount,
                progress: progressPercentage,
                grade,
                accuracyPercentage,
                finishedMaterialIds,
            };
        }));

        // Promise.all keeps the original order, so the response matches what
        // the sequential loop produced.
        const subjectProgress = perPack.filter((p): p is NonNullable<typeof p> => p !== null);
        const totalMaterials = subjectProgress.reduce((sum, p) => sum + p.totalMaterials, 0);
        const totalFinished = subjectProgress.reduce((sum, p) => sum + p.finishedMaterials, 0);

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