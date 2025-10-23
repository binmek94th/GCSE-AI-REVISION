import { NextRequest, NextResponse } from 'next/server';
import {DateTime} from "luxon";
import admin from "../../../lib/firebaseAdmin";


export async function GET(req: NextRequest) {
    try {
        // Verify authentication
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const db = admin.firestore();

        // Fetch user document
        const userDoc = await db.collection('users').doc(userId).get();

        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data();

        // Fetch study packs (assuming they're stored in a subcollection or array)
        const studyPacksSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('boughtPacks')
            .get();

        const studyPacks = studyPacksSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            purchasedAt: doc.data().purchasedAt?.toDate().toISOString(),
        }));

        const localNow = DateTime.now().setZone("Africa/Addis_Ababa");
        const startOfDay = localNow.startOf("day").toJSDate();
        const endOfDay = localNow.endOf("day").toJSDate();

        const moodSnapshot = await db
            .collection('users')
            .doc(userId)
            .collection('mood_history')
            .where('timestamp', '>=', startOfDay)
            .where('timestamp', '<=', endOfDay)
            .limit(1)
            .get();

        let moodStatus = {
            hasSentToday: false,
            lastSent: null,
        };

        if (!moodSnapshot.empty) {
            const moodData = moodSnapshot.docs[0].data();

            moodStatus = {
                hasSentToday: true,
                lastSent: moodData.timestamp?.toDate?.().toISOString() || null,
            };
        }
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayString = yesterday.toISOString().split("T")[0];

        const dashboardData = {
            streak: userData?.streak
                ? {
                    ...userData.streak,
                    currentStreak:
                        userData.streak.lastActivityDate === today ||
                        userData.streak.lastActivityDate === yesterdayString
                            ? userData.streak.currentStreak
                            : 0,
                }
                : {
                    activityDates: [],
                    currentStreak: 0,
                    lastActivityDate: null,
                    longestStreak: 0,
                    totalActiveDays: 0,
                },
            studyPacks: studyPacks,
            totalStudyHours: userData?.totalStudyHours || 0,
            completedSessions: userData?.completedSessions || 0,
            lastActivity: userData?.lastActivity?.toDate().toISOString() || null,
        };

        return NextResponse.json({
            dashboard: dashboardData,
            moodStatus: moodStatus,
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);

        if (error instanceof Error && error.message.includes('auth')) {
            return NextResponse.json(
                { error: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to fetch dashboard data' },
            { status: 500 }
        );
    }
}