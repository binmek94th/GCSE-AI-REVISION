import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function GET(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decoded = await admin.auth().verifyIdToken(idToken);
        const uid = decoded.uid;

        const db = admin.firestore();
        const userRef = db.collection("users").doc(uid);
        const userDoc = await userRef.get();

        if (!userDoc.exists)
            return NextResponse.json({ error: "User not found" }, { status: 404 });

        const data = userDoc.data();
        const badges = data?.badges || {};

        return NextResponse.json({
            success: true,
            badges,
        });
    } catch (err: any) {
        console.error("Error fetching badges:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
