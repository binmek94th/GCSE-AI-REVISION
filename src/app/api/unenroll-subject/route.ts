import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import {generateStudyPlanForUser} from "@/lib/services/studyPlanGenerator";

export async function POST(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { subjectId } = await req.json();

        if (!subjectId)
            return NextResponse.json({ error: "Missing subjectId" }, { status: 400 });

        await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("subjects")
            .doc(subjectId)
            .delete();

        generateStudyPlanForUser(userId)

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error unenrolling subject:", error);
        return NextResponse.json({ error: "Failed to unenroll subject" }, { status: 500 });
    }
}