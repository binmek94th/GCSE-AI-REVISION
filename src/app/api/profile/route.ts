import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();

        // ✅ Resolve the student's level to filter subject progress by
        const level = userData?.level ?? userData?.preferences?.level ?? null;

        // Fetch subscription from subcollection
        const subColRef = db.collection("users").doc(uid).collection("subscriptions");

        // First try to get an active subscription
        let subscriptionQuery = subColRef
            .where("status", "==", "active")
            .limit(1);

        let subscriptionSnapshot = await subscriptionQuery.get();

        // If no active subscription, get most recently updated one
        if (subscriptionSnapshot.empty) {
            subscriptionQuery = subColRef
                .orderBy("updatedAt", "desc")
                .limit(1);
            subscriptionSnapshot = await subscriptionQuery.get();
        }

        const subscription = subscriptionSnapshot.empty
            ? null
            : subscriptionSnapshot.docs[0].data();

        const userRecord = await admin.auth().getUser(uid);

        const packRef = db.collection("users").doc(uid).collection("boughtPacks");
        const packSnapshot = await packRef.get();
        const studyPacks = packSnapshot.size;

        const userProgressRef = db.collection("users").doc(uid).collection("question_progress");
        const subjectsSnapshot = await userProgressRef.get();

        let totalQuestions = 0;
        let correctAnswers = 0;
        const quizSessions = new Set<string>(); // Track unique quiz sessions by date
        const subjectProgress: { [subject: string]: { total: number; correct: number; accuracy: number } } = {};

        for (const subjectDoc of subjectsSnapshot.docs) {
            const subjectName = subjectDoc.id; // this is the packId
            const subjectData = subjectDoc.data();

            // ✅ Filter by level: look up the pack's level and skip if it
            // doesn't match the student's level. Fail-open — if either the
            // student's level or the pack's level is missing, don't filter,
            // so progress is never silently hidden due to incomplete data.
            const packDoc = await db.collection("study_packs").doc(subjectName).get();
            const packLevel = packDoc.exists ? packDoc.data()?.level : undefined;
            if (level && packLevel && packLevel !== level)
                continue;

            for (const [questionId, progressData] of Object.entries(subjectData)) {
                if (typeof progressData === 'object' && progressData !== null) {
                    const data = progressData as any;
                    totalQuestions++;

                    // Initialize subject tracking if needed
                    if (!subjectProgress[subjectName]) {
                        subjectProgress[subjectName] = { total: 0, correct: 0, accuracy: 0 };
                    }
                    subjectProgress[subjectName].total++;

                    // Check if answer was correct (using 'correct' field)
                    if (data.correct === true) {
                        correctAnswers++;
                        subjectProgress[subjectName].correct++;
                    }

                    // Track quiz sessions using quizId if available, or create session ID from timestamp
                    if (data.quizId) {
                        quizSessions.add(data.quizId);
                    } else if (data.answeredAt) {
                        // Group questions answered within 1 hour as a single quiz session
                        const timestamp = data.answeredAt.toDate ? data.answeredAt.toDate() : new Date(data.answeredAt);
                        const sessionKey = `${subjectName}-${Math.floor(timestamp.getTime() / (60 * 60 * 1000))}`; // Hour-based grouping
                        quizSessions.add(sessionKey);
                    }
                }
            }
        }

        // Calculate accuracy for each subject
        for (const subject in subjectProgress) {
            const progress = subjectProgress[subject];
            progress.accuracy = progress.total > 0
                ? Math.round((progress.correct / progress.total) * 100)
                : 0;
        }

        const averageScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        // Get AI interaction stats
        const aiInteractions = userData?.stats?.aiInteractions || { total: 0 };

        // Calculate total study hours
        const totalStudyHours = userData?.stats?.totalStudyHours || 0;

        const profileData = {
            email: userRecord.email || "",
            displayName: userRecord.displayName || userData?.displayName || null,
            // parent_email lives in Firestore, not on the Auth record.
            parentEmail: userData?.parent_email ?? null,
            createdAt: userRecord.metadata.creationTime,
            tokens: userData?.tokens ?? 1000,
            totalStudyHours: totalStudyHours,
            preferences: userData?.preferences || null,
            subscription: subscription ? {
                status: subscription.status,
                plan: subscription.items?.[0]?.price?.product?.name || "Premium",
                currentPeriodEnd: subscription.current_period_end
                    ? new Date(subscription.current_period_end.seconds * 1000).toISOString()
                    : undefined
            } : null,
            studyPacks: studyPacks,
            stats: {
                quizzesCompleted: quizSessions.size,
                averageScore: Math.round(averageScore * 10) / 10,
                totalQuestions: totalQuestions,
                correctAnswers: correctAnswers,
                subjectProgress: subjectProgress,
                aiInteractions: aiInteractions
            }
        };

        return NextResponse.json(profileData);

    } catch (err: any) {
        console.error("Profile fetch error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}