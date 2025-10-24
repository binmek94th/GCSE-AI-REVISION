import { NextRequest, NextResponse } from 'next/server';
import admin from "../../../lib/firebaseAdmin";
import { DateTime } from "luxon";

export async function GET(req: NextRequest) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const db = admin.firestore();

        // ---- Get Mood for Today ----
        const localNow = DateTime.now().setZone("Africa/Addis_Ababa");
        const startOfDay = localNow.startOf("day").toJSDate();
        const endOfDay = localNow.endOf("day").toJSDate();

        const moodSnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("mood_history")
            .where("timestamp", ">=", startOfDay)
            .where("timestamp", "<=", endOfDay)
            .limit(1)
            .get();

        let mood = "neutral";
        if (!moodSnapshot.empty) {
            const moodDoc = moodSnapshot.docs[0].data();
            mood = moodDoc.mood || "neutral";
        }

        // ---- Get Study Plan ----
        const dateKey = localNow.toISODate(); // "YYYY-MM-DD"

        const querySnapshot = await db
            .collection("users")
            .doc(userId)
            .collection("dailyStudyPlans")
            .where("date", "==", dateKey)
            .limit(1)
            .get();

        if (querySnapshot.empty) {
            return NextResponse.json(
                { error: "No study plan found for today" },
                { status: 404 }
            );
        }

        const doc = querySnapshot.docs[0];
        const data = doc.data();

        const moodMultiplierMap: Record<string, number> = {
            great: 1.0,
            good: 0.8,
            neutral: 0.7,
            tired: 0.4,
            bad: 0.3,
        };
        const multiplier = moodMultiplierMap[mood] ?? 0.7;

        const adjustedPlan = { ...data.plan };
        if (Array.isArray(adjustedPlan.sessions)) {
            const count = Math.ceil(adjustedPlan.sessions.length * multiplier);
            adjustedPlan.sessions = adjustedPlan.sessions.slice(0, count);
            adjustedPlan.breaks = adjustedPlan.breaks.slice(0, Math.max(0, count - 1));
        }

        // ---- Fetch Material Details ----
        const allMaterialIds = adjustedPlan.sessions
            ?.map((s: any) => s.materialId)
            .filter(Boolean) || [];

        const materialDocs: Record<string, any> = {};

        if (allMaterialIds.length > 0) {
            const materialPromises = allMaterialIds.map((id: string) =>
                db.collection("study_materials").doc(id).get()
            );
            const materialSnapshots = await Promise.all(materialPromises);

            for (const snap of materialSnapshots) {
                if (snap.exists) {
                    materialDocs[snap.id] = { id: snap.id, ...snap.data() };
                }
            }
        }

        adjustedPlan.sessions = adjustedPlan.sessions?.map((session: any) => ({
            ...session,
            material: materialDocs[session.materialId] || null,
        }));

        const studyPlan = {
            id: doc.id,
            ...data,
            plan: adjustedPlan,
            createdAt: data.createdAt?.toDate?.().toISOString?.() || data.createdAt,
            date:
                typeof data.date === "string"
                    ? data.date
                    : data.date?.toDate?.().toISOString(),
            mood,
        };

        return NextResponse.json(studyPlan);
    } catch (error) {
        console.error("Error fetching study plan:", error);

        if (error instanceof Error && error.message.includes("auth")) {
            return NextResponse.json(
                { error: "Invalid or expired token" },
                { status: 401 }
            );
        }

        return NextResponse.json(
            { error: "Failed to fetch study plan" },
            { status: 500 }
        );
    }
}
