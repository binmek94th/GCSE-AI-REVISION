import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// ------------------------
// GET: Fetch mock test history
// ------------------------
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const subject = searchParams.get("subject"); // Optional filter by subject
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken) {
            return NextResponse.json(
                { message: "Missing ID token" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        let query = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("mock_tests")
            .orderBy("date", "desc")
            .limit(limit);

        // Filter by subject if provided
        if (subject) {
            query = query.where("subject", "==", subject) as any;
        }

        const snapshot = await query.get();

        const mockTests = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
                id: doc.id,
                subject: data.subject,
                score: data.score,
                correctCount: data.correctCount,
                totalCount: data.totalCount,
                timeTaken: data.timeTaken,
                date: data.date?.toDate().toISOString() || new Date().toISOString(),
            };
        });

        return NextResponse.json(
            { mockTests },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching mock test history:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}