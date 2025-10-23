import admin from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        // Get ID token from Authorization header
        const authHeader = req.headers.get("authorization") || "";
        const idToken = authHeader.startsWith("Bearer ")
            ? authHeader.split("Bearer ")[1]
            : null;

        if (!idToken) {
            return NextResponse.json({ message: "Missing ID token" }, { status: 400 });
        }

        // Verify Firebase ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Fetch user's bought packs
        const boughtPacksSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("boughtPacks")
            .get();

        if (boughtPacksSnapshot.empty) {
            return NextResponse.json({ packs: [] }, { status: 200 });
        }

        // Map pack IDs and fetch details from study_packs collection
        const packs = await Promise.all(
            boughtPacksSnapshot.docs.map(async (doc) => {
                const packId = doc.id;
                const packDoc = await admin
                    .firestore()
                    .collection("study_packs")
                    .doc(packId)
                    .get();
                const packData = packDoc.exists ? packDoc.data() : {};
                return {
                    id: packId,
                };
            })
        );

        return NextResponse.json({ packs }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user packs:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
