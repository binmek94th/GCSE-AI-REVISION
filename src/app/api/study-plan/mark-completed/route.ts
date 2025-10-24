import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import {DateTime} from "luxon";


export async function POST(request: NextRequest) {
    try {
        // Get the authorization token
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify the token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Get the material ID from the request body
        const body = await request.json();
        const { materialId } = body;

        if (!materialId) {
            return NextResponse.json(
                { error: 'Material ID is required' },
                { status: 400 }
            );
        }

        const db = admin.firestore();

        // Get today's date in YYYY-MM-DD format
        const localNow = DateTime.now().setZone("Africa/Addis_Ababa");

        // Find the user's study plan for today
        const dateKey = localNow.toISODate(); // "YYYY-MM-DD"

        const querySnapshot = await db
            .collection("users")
            .doc(uid)
            .collection("dailyStudyPlans")
            .where("date", "==", dateKey)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json(
                { error: 'No study plan found for today' },
                { status: 404 }
            );
        }

        const studyPlanDoc = querySnapshot.docs[0];
        const studyPlanData = studyPlanDoc.data();

        // Update the sessions to mark the material as completed
        const updatedSessions = studyPlanData.plan.sessions.map((session: any) => {
            if (session.materialId === materialId) {
                return {
                    ...session,
                    completed: true,
                };
            }
            return session;
        });

        // Update the study plan document
        await studyPlanDoc.ref.update({
            'plan.sessions': updatedSessions,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return NextResponse.json({
            success: true,
            message: 'Session marked as completed'
        });

    } catch (error) {
        console.error('Error marking session as completed:', error);
        return NextResponse.json(
            { error: 'Failed to mark session as completed' },
            { status: 500 }
        );
    }
}