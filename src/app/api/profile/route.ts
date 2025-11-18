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

        // Get user metadata from Firebase Auth
        const userRecord = await admin.auth().getUser(uid);

        // Fetch study packs
        const studyPacks = userData?.studyPacks || [];

        // Calculate quiz statistics
        const questionProgressRef = db.collection("question_progress");
        const questionProgressQuery = questionProgressRef.where("userId", "==", uid);
        const questionProgressSnapshot = await questionProgressQuery.get();

        let totalQuestions = 0;
        let correctAnswers = 0;
        const uniqueQuizzes = new Set();

        questionProgressSnapshot.forEach((doc) => {
            const data = doc.data();
            totalQuestions++;
            if (data.isCorrect) {
                correctAnswers++;
            }
            if (data.quizId) {
                uniqueQuizzes.add(data.quizId);
            }
        });

        const averageScore = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

        // Get AI interaction stats
        const aiInteractions = userData?.stats?.aiInteractions || { total: 0 };

        // Calculate total study hours
        const totalStudyHours = userData?.stats?.totalStudyHours || 0;

        const profileData = {
            email: userRecord.email || "",
            displayName: userRecord.displayName || userData?.displayName || null,
            createdAt: userRecord.metadata.creationTime,
            tokens: userData?.tokens ?? 1000,
            totalStudyHours: totalStudyHours,
            subscription: subscription ? {
                status: subscription.status,
                plan: subscription.items?.[0]?.price?.product?.name || "Premium",
                currentPeriodEnd: subscription.current_period_end
                    ? new Date(subscription.current_period_end.seconds * 1000).toISOString()
                    : undefined
            } : null,
            studyPacks: studyPacks,
            stats: {
                quizzesCompleted: uniqueQuizzes.size,
                averageScore: Math.round(averageScore * 10) / 10,
                totalQuestions: totalQuestions,
                aiInteractions: aiInteractions
            }
        };

        return NextResponse.json(profileData);

    } catch (err: any) {
        console.error("Profile fetch error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}