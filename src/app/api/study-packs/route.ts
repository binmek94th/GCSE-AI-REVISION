import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";
import {EXAM_DATA} from "@/app/onboarding/exam_data";

export async function GET(req: Request) {
    try {
        const idToken = req.headers
            .get("Authorization")
            ?.split("Bearer ")[1];

        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const userDoc = await admin.firestore()
            .collection("users")
            .doc(userId)
            .get();

        if (!userDoc.exists) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }
        const examBoard = userDoc.data()?.preferences?.examBoard;

        if (!examBoard) {
            return NextResponse.json(
                { error: "Exam board not set in preferences" },
                { status: 400 }
            );
        }

        const allowedCombos = EXAM_DATA.filter(
            (item) => item.exam_board === examBoard
        );

        const snapshot = await admin.firestore()
            .collection("study_packs")
            .where("exam_board", "==", examBoard)
            .get();

        const studyPacks = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }))
            .filter((pack: any) =>
                allowedCombos.some(
                    (combo) =>
                        combo.subject === pack.subject &&
                        combo.tier === pack.tier
                )
            );

        const boughtSnapshot = await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("boughtPacks")
            .get();

        const boughtIds = new Set(
            boughtSnapshot.docs.map((doc) => doc.id)
        );

        const result = studyPacks.map((pack: any) => ({
            ...pack,
            bought: boughtIds.has(pack.id),
        }));

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error fetching study packs:", error);
        return NextResponse.json(
            { error: "Failed to fetch study packs." },
            { status: 500 }
        );
    }
}
