import { NextRequest, NextResponse } from 'next/server';
import admin from "firebase-admin";
// import {doc, getDoc, updateDoc} from "@firebase/firestore";
// import {db} from "@/lib/firebase";

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

        const userRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return NextResponse.json({
                currentStreak: 0,
                longestStreak: 0,
                lastActivityDate: null,
                totalActiveDays: 0
            });
        }

        const userData = userDoc.data();
        const streakData = userData?.streak || {};

        const currentStreak = await calculateCurrentStreak(userId);

        return NextResponse.json({
            currentStreak: currentStreak,
            longestStreak: streakData.longestStreak || 0,
            lastActivityDate: streakData.lastActivityDate,
            totalActiveDays: streakData.totalActiveDays || 0
        });

    } catch (error) {
        console.error('Error fetching streak:', error);
        return NextResponse.json(
            { error: 'Failed to fetch streak data' },
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD

        const userRef = admin.firestore().collection('users').doc(userId);
        const userDoc = await userRef.get();

        const streakData = userDoc.exists ? (userDoc.data()?.streak || {}) : {};
        const activityDates: string[] = streakData.activityDates || [];

        if (!activityDates.includes(todayString)) {
            activityDates.push(todayString);
            activityDates.sort();

            const currentStreak = calculateStreakFromDates(activityDates);
            const longestStreak = Math.max(currentStreak, streakData.longestStreak || 0);

            await userRef.set({
                streak: {
                    activityDates: activityDates,
                    lastActivityDate: todayString,
                    currentStreak: currentStreak,
                    longestStreak: longestStreak,
                    totalActiveDays: activityDates.length,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            }, { merge: true });

            return NextResponse.json({
                success: true,
                currentStreak: currentStreak,
                longestStreak: longestStreak,
                totalActiveDays: activityDates.length
            });
        }
        await checkConsistencyBadges(userId, streakData.currentStreak);

        return NextResponse.json({
            success: true,
            message: 'Activity already recorded for today',
            currentStreak: streakData.currentStreak || 0,
            longestStreak: streakData.longestStreak || 0,
            totalActiveDays: activityDates.length
        });

    } catch (error) {
        console.error('Error updating streak:', error);
        return NextResponse.json(
            { error: 'Failed to update streak data' },
            { status: 500 }
        );
    }
}

async function calculateCurrentStreak(userId: string): Promise<number> {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) return 0;

    const streakData = userDoc.data()?.streak;
    if (!streakData || !streakData.activityDates) return 0;

    const activityDates: string[] = streakData.activityDates;
    return calculateStreakFromDates(activityDates);
}

function calculateStreakFromDates(dates: string[]): number {
    if (dates.length === 0) return 0;

    const sortedDates = [...dates].sort((a, b) => b.localeCompare(a));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayString = today.toISOString().split('T')[0];

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toISOString().split('T')[0];

    const mostRecentDate = sortedDates[0];
    if (mostRecentDate !== todayString && mostRecentDate !== yesterdayString) {
        return 0;
    }

    let streak = 1;
    let currentDate = new Date(sortedDates[0]);

    for (let i = 1; i < sortedDates.length; i++) {
        const previousDate = new Date(currentDate);
        previousDate.setDate(previousDate.getDate() - 1);
        const previousDateString = previousDate.toISOString().split('T')[0];

        if (sortedDates[i] === previousDateString) {
            streak++;
            currentDate = new Date(sortedDates[i]);
        } else {
            break;
        }
    }

    return streak;
}

async function checkConsistencyBadges(userId: string, currentStreak: number) {
    const db = admin.firestore();

    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) return;

    const badges: string[] =
        userSnap.data()?.badges?.consistency || [];

    const newBadges = [...badges];

    if (currentStreak >= 3 && !badges.includes("Streak Starter"))
        newBadges.push("Streak Starter");

    if (currentStreak >= 7 && !badges.includes("Momentum Master"))
        newBadges.push("Momentum Master");

    if (currentStreak >= 14 && !badges.includes("Two-Week Titan"))
        newBadges.push("Two-Week Titan");

    if (currentStreak >= 30 && !badges.includes("Month-Long Marvel"))
        newBadges.push("Month-Long Marvel");

    if (newBadges.length > badges.length) {
        await userRef.set(
            {
                badges: {
                    consistency: newBadges
                }
            },
            { merge: true }
        );
    }
}
