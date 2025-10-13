import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const snapshot = await admin.firestore().collection("study_packs").get();
        const studyPacks = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));

        const boughtSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("boughtPacks")
            .get();

        const boughtIds = new Set(boughtSnapshot.docs.map((doc) => doc.id));

        const result = studyPacks.map((pack) => ({
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
