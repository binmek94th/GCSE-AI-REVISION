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

        const userRef = admin.firestore().collection("users").doc(userId);

        const userSnap = await userRef.get();
        const userData = userSnap.data();
        const level = userData?.level ?? userData?.preferences?.level ?? null;
        // ✅ Resolve exam board with the same fallback chain used for level
        const examBoard = userData?.preferences?.examBoard ?? null;

        console.log(examBoard);
        console.log(level)

        const subjectsSnapshot = await userRef.collection("subjects").get();

        if (subjectsSnapshot.empty) {
            return NextResponse.json({ packs: [], level, examBoard }, { status: 200 });
        }

        const packs = subjectsSnapshot.docs
            .map((doc) => ({
                id: doc.id,
                subject: doc.data().subject,
                examBoard: doc.data().examBoard,
                level: doc.data().level,
            }))

            .filter((pack) => !level || pack.level === level)
            .filter((pack) => !examBoard || pack.examBoard === examBoard);


        return NextResponse.json({ packs, level, examBoard }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user subjects:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}