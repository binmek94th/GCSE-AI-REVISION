import { NextRequest, NextResponse } from 'next/server';
import {DateTime} from "luxon";
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

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const db = admin.firestore();
        const moodRef = db.collection('users').doc(userId).collection('mood_history');

        // Compute start and end of today in local timezone
        const localNow = DateTime.now().setZone("Africa/Addis_Ababa");
        const startOfDay = localNow.startOf("day").toJSDate();
        const endOfDay = localNow.endOf("day").toJSDate();

        // Query mood_history for today
        const moodSnapshot = await moodRef
            .where('timestamp', '>=', startOfDay)
            .where('timestamp', '<=', endOfDay)
            .limit(1)
            .get();

        let shouldShowMoodChecker = true;
        let lastMoodDate: string | null = null;
        let lastMood: string | null = null;

        if (!moodSnapshot.empty) {
            const moodData = moodSnapshot.docs[0].data();
            shouldShowMoodChecker = false;
            lastMoodDate = moodData.timestamp?.toDate?.().toISOString() || null;
            lastMood = moodData.mood || null;
        }

        return NextResponse.json({
            shouldShowMoodChecker,
            lastMoodDate,
            lastMood
        });

    } catch (error) {
        console.error('Error checking mood status:', error);
        return NextResponse.json(
            { error: 'Failed to check mood status' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const idToken = request.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken) {
            return NextResponse.json(
                { error: 'Missing authorization token' },
                { status: 401 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { mood, note } = body;

        if (!mood) {
            return NextResponse.json(
                { error: 'Mood is required' },
                { status: 400 }
            );
        }

        // Get today's date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0];

        const userRef = admin.firestore().collection('users').doc(userId);

        // Save mood to user document
        await userRef.set({
            mood: {
                lastMood: mood,
                lastMoodDate: todayString,
                lastNote: note || '',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
        }, { merge: true });

        await admin.firestore().collection('users').doc(userId).collection('mood_history').add({
            mood,
            note: note || '',
            date: todayString,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        await checkMoodBadges(userId, mood)

        return NextResponse.json({
            success: true,
            message: 'Mood logged successfully',
            mood,
            date: todayString
        });

    } catch (error) {
        console.error('Error logging mood:', error);
        return NextResponse.json(
            { error: 'Failed to log mood' },
            { status: 500 }
        );
    }
}


export async function checkMoodBadges(userId: string, mood: string) {
    // ✅ Fixed: use Admin SDK throughout (this runs server-side inside an
    // API route) instead of the client SDK's `doc`/`getDoc`/`updateDoc`,
    // which was the source of the "Expected first argument to collection()..."
    // error — the client `db` instance isn't valid in this server context.
    const userRef = admin.firestore().collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) return;

    const data = userSnap.data();
    const badges = data?.badges?.mood || [];
    const newBadges = [...badges];

    const lowMoods = ["okay", "stressed", "bad"];
    const neutralMood = "okay";

    // 🧠 Keep a mood history (for average tracking)
    const moodHistory = data?.stats?.moodHistory || [];
    const updatedHistory = [...moodHistory.slice(-6), mood]; // keep last 7 moods

    // Convert moods to numeric scale for averaging
    const moodScale: Record<string, number> = {
        great: 5,
        good: 4,
        okay: 3,
        stressed: 2,
        bad: 1,
    };

    const average = (arr: string[]) =>
        arr.length > 0
            ? arr.map((m) => moodScale[m] || 0).reduce((a, b) => a + b, 0) / arr.length
            : 0;

    const oldAverage = average(moodHistory);
    const newAverage = average(updatedHistory);

    // ✅ Mood Manager: 5 sessions logged with low mood
    if (lowMoods.includes(mood)) {
        const lowMoodCount = (data?.stats?.lowMoodSessions || 0) + 1;
        await userRef.update({
            "stats.lowMoodSessions": lowMoodCount,
            "stats.moodHistory": updatedHistory,
        });

        if (lowMoodCount >= 5 && !badges.includes("Mood Manager")) {
            newBadges.push("Mood Manager");
        }
    } else {
        await userRef.update({ "stats.moodHistory": updatedHistory });
    }

    if (mood === neutralMood) {
        const neutralStreak = (data?.stats?.neutralStreak || 0) + 1;
        await userRef.update({ "stats.neutralStreak": neutralStreak });

        if (neutralStreak >= 7 && !badges.includes("Calm Climber")) {
            newBadges.push("Calm Climber");
        }
    } else {
        await userRef.update({ "stats.neutralStreak": 0 });
    }

    if (moodHistory.length >= 7 && newAverage - oldAverage >= 2 && !badges.includes("Bounce-Back Boss")) {
        newBadges.push("Bounce-Back Boss");
    }

    if (newBadges.length > badges.length) {
        await userRef.update({ "badges.mood": newBadges });
    }
}