import admin from "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization") || "";
        const idToken = authHeader.startsWith("Bearer ")
            ? authHeader.split("Bearer ")[1]
            : null;

        if (!idToken) {
            return NextResponse.json({ message: "Missing ID token" }, { status: 400 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const subjectsSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("subjects")
            .get();

        if (subjectsSnapshot.empty) {
            return NextResponse.json({ packs: [] }, { status: 200 });
        }

        const packs = subjectsSnapshot.docs.map((doc) => ({
            id: doc.id,
            subject: doc.data().subject,
            examBoard: doc.data().examBoard,
        }));

        return NextResponse.json({ packs }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user subjects:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}