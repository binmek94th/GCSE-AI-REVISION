import { FieldValue } from 'firebase-admin/firestore';
import admin from "@/lib/firebaseAdmin";

/**
 * Mark a study material as completed for a user
 */
export async function markMaterialAsCompleted(
    userId: string,
    packId: string,
    materialId: string
): Promise<void> {
    try {
        const progressRef = admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('progress')
            .doc(packId);

        // Get current progress
        const progressDoc = await progressRef.get();
        const currentProgress = progressDoc.data() || {};

        // Add material to completed list
        await progressRef.set(
            {
                completedMaterialIds: FieldValue.arrayUnion(materialId),
                lastStudied: new Date(),
                updatedAt: new Date(),
            },
            { merge: true }
        );

        // Calculate new completion percentage
        const boughtPackDoc = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('boughtPacks')
            .doc(packId)
            .get();

        if (boughtPackDoc.exists) {
            // Get total materials for this pack
            const materialsSnapshot = await admin.firestore()
                .collection('study_material')
                .where('subject_pack_id', '==', packId)
                .get();

            const totalMaterials = materialsSnapshot.size;
            const completedMaterialIds = [
                ...(currentProgress.completedMaterialIds || []),
                materialId,
            ];

            // Remove duplicates
            const uniqueCompleted = [...new Set(completedMaterialIds)];
            const percentComplete = Math.round(
                (uniqueCompleted.length / totalMaterials) * 100
            );

            // Update progress with percentage
            await progressRef.update({
                percentComplete,
            });
        }

        console.log(`Material ${materialId} marked as completed for user ${userId}`);
    } catch (error) {
        console.error('Error marking material as completed:', error);
        throw error;
    }
}

/**
 * Mark an entire session as completed
 */
export async function markSessionAsCompleted(
    userId: string,
    packId: string,
    materialId: string,
    sessionDuration: number // in minutes
): Promise<void> {
    try {
        await markMaterialAsCompleted(userId, packId, materialId);

        // Update user's total study time (optional)
        const userRef = admin.firestore().collection('users').doc(userId);
        await userRef.set(
            {
                stats: {
                    totalStudyMinutes: FieldValue.increment(sessionDuration),
                    lastStudyDate: new Date(),
                },
            },
            { merge: true }
        );

        console.log(`Session completed: ${sessionDuration} minutes`);
    } catch (error) {
        console.error('Error marking session as completed:', error);
        throw error;
    }
}

/**
 * Get user's study progress summary
 */
export async function getUserProgressSummary(userId: string): Promise<{
    totalPacks: number;
    completedPacks: number;
    inProgressPacks: number;
    overallProgress: number;
    packs: Array<{
        packId: string;
        packName: string;
        subject: string;
        percentComplete: number;
        completedMaterials: number;
        totalMaterials: number;
    }>;
}> {
    try {
        const boughtPacksSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('boughtPacks')
            .get();

        const progressSnapshot = await admin.firestore()
            .collection('users')
            .doc(userId)
            .collection('progress')
            .get();

        const progressMap: Record<string, any> = {};
        progressSnapshot.forEach((doc) => {
            progressMap[doc.id] = doc.data();
        });

        let totalProgress = 0;
        let completedPacks = 0;
        let inProgressPacks = 0;

        const packs = await Promise.all(
            boughtPacksSnapshot.docs.map(async (packDoc) => {
                const packId = packDoc.id;
                const packData = packDoc.data();
                const progress = progressMap[packId] || {};

                // Get total materials
                const materialsSnapshot = await admin.firestore()
                    .collection('study_material')
                    .where('subject_pack_id', '==', packId)
                    .get();

                const totalMaterials = materialsSnapshot.size;
                const completedMaterials = (progress.completedMaterialIds || []).length;
                const percentComplete = progress.percentComplete || 0;

                totalProgress += percentComplete;

                if (percentComplete === 100) {
                    completedPacks++;
                } else if (percentComplete > 0) {
                    inProgressPacks++;
                }

                return {
                    packId,
                    packName: packData.name || packData.subject,
                    subject: packData.subject,
                    percentComplete,
                    completedMaterials,
                    totalMaterials,
                };
            })
        );

        const overallProgress = boughtPacksSnapshot.size > 0
            ? Math.round(totalProgress / boughtPacksSnapshot.size)
            : 0;

        return {
            totalPacks: boughtPacksSnapshot.size,
            completedPacks,
            inProgressPacks,
            overallProgress,
            packs,
        };
    } catch (error) {
        console.error('Error getting user progress summary:', error);
        throw error;
    }
}