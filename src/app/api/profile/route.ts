import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { resolvePackMeta } from "@/lib/packNames";

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

        // `boughtPacks` was an older ownership model nothing in the app
        // writes to anymore — pack ownership is tracked in `subjects`
        // (see /api/user/packs, /api/quiz-results), so this always read 0.
        const packRef = db.collection("users").doc(uid).collection("subjects");
        const packSnapshot = await packRef.get();
        const studyPacks = packSnapshot.size;

        const userProgressRef = db.collection("users").doc(uid).collection("question_progress");
        const subjectsSnapshot = await userProgressRef.get();

        let totalQuestions = 0;
        let correctAnswers = 0;
        const quizSessions = new Set<string>(); // Track unique quiz sessions by date
        const subjectProgress: { [subject: string]: { total: number; correct: number; accuracy: number } } = {};
        // One entry per study pack, with a readable name + exam board + level —
        // what the Profile page's "Progress by Subject" cards display.
        const packProgress: {
            packId: string;
            subject: string;
            examBoard: string | null;
            level: string | null;
            tier: string | null;
            total: number;
            correct: number;
            accuracy: number;
        }[] = [];

        // Look every pack up at once (this used to wait for each one in turn),
        // and use the student's enrolments we already loaded as a fallback for
        // names.
        const packSnaps = await Promise.all(
            subjectsSnapshot.docs.map((d) => db.collection("study_packs").doc(d.id).get())
        );
        const enrolById = new Map(packSnapshot.docs.map((d) => [d.id, d.data()]));

        for (let i = 0; i < subjectsSnapshot.docs.length; i++) {
            const subjectDoc = subjectsSnapshot.docs[i];
            const packId = subjectDoc.id;
            const subjectData = subjectDoc.data();

            const packDoc = packSnaps[i];
            const packData = packDoc.exists ? packDoc.data() ?? null : null;

            // Keep the level filter exactly as before: only a pack whose own
            // level is known and differs from the student's is hidden.
            const packLevel = packData?.level;
            if (level && packLevel && packLevel !== level)
                continue;

            // Readable name / exam board / level. Falls back from study_packs
            // to the student's enrolment to the id itself, so a pack whose
            // study_packs record is missing no longer shows up as a raw id
            // like "a_level_cambridge_cie_english_literature".
            const meta = resolvePackMeta(packId, packData, enrolById.get(packId));

            // subjectProgress is keyed by the normalized subject name — the
            // Plan page's findQuizStat looks up "biology" etc. Using the
            // readable subject here (not the raw id) keeps that matching.
            const subjectKey = meta.subject.toLowerCase().replace(/\s+/g, '_');

            let packTotal = 0;
            let packCorrect = 0;

            for (const [questionId, progressData] of Object.entries(subjectData)) {
                if (typeof progressData === 'object' && progressData !== null) {
                    const data = progressData as any;
                    totalQuestions++;
                    packTotal++;

                    // Initialize subject tracking if needed
                    if (!subjectProgress[subjectKey]) {
                        subjectProgress[subjectKey] = { total: 0, correct: 0, accuracy: 0 };
                    }
                    subjectProgress[subjectKey].total++;

                    // Check if answer was correct (using 'correct' field)
                    if (data.correct === true) {
                        correctAnswers++;
                        packCorrect++;
                        subjectProgress[subjectKey].correct++;
                    }

                    // Track quiz sessions using quizId if available, or create session ID from timestamp
                    if (data.quizId) {
                        quizSessions.add(data.quizId);
                    } else if (data.answeredAt) {
                        // Group questions answered within 1 hour as a single quiz session
                        const timestamp = data.answeredAt.toDate ? data.answeredAt.toDate() : new Date(data.answeredAt);
                        const sessionKey = `${packId}-${Math.floor(timestamp.getTime() / (60 * 60 * 1000))}`; // Hour-based grouping
                        quizSessions.add(sessionKey);
                    }
                }
            }

            if (packTotal > 0) {
                packProgress.push({
                    packId,
                    subject: meta.subject,
                    examBoard: meta.examBoard,
                    level: meta.level,
                    tier: meta.tier,
                    total: packTotal,
                    correct: packCorrect,
                    accuracy: Math.round((packCorrect / packTotal) * 100),
                });
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
                packProgress: packProgress.sort((x, y) => y.total - x.total),
                aiInteractions: aiInteractions
            }
        };

        return NextResponse.json(profileData);

    } catch (err: any) {
        console.error("Profile fetch error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}