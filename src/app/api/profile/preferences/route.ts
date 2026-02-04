import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

export async function PUT(request: NextRequest) {
    try {
        // Get the authorization header
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const idToken = authHeader.split("Bearer ")[1];

        // Verify the token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Get the preferences from the request body
        const body = await request.json();
        const { examBoard, hoursPerWeek, targetGrade } = body;

        // Validate preferences
        const validExamBoards = ["AQA", "OCR", "Edexcel", "WJEC", "CCEA"];
        const validHoursPerWeek = ["0-5", "5-10", "10-15", "15-20", "20+"];
        const validTargetGrades = ["4", "5", "6", "7", "8", "9"];

        if (!validExamBoards.includes(examBoard)) {
            return NextResponse.json(
                { error: "Invalid exam board" },
                { status: 400 }
            );
        }

        if (!validHoursPerWeek.includes(hoursPerWeek)) {
            return NextResponse.json(
                { error: "Invalid hours per week" },
                { status: 400 }
            );
        }

        if (!validTargetGrades.includes(targetGrade)) {
            return NextResponse.json(
                { error: "Invalid target grade" },
                { status: 400 }
            );
        }

        // Update user preferences in Firestore
        const userRef = admin.firestore().collection("users").doc(userId);

        await userRef.update({
            "preferences.examBoard": examBoard,
            "preferences.hoursPerWeek": hoursPerWeek,
            "preferences.targetGrade": targetGrade,
            updatedAt: new Date().toISOString()
        });

        return NextResponse.json({
            success: true,
            preferences: {
                examBoard,
                hoursPerWeek,
                targetGrade
            }
        });

    } catch (error) {
        console.error("Error updating preferences:", error);
        return NextResponse.json(
            { error: "Failed to update preferences" },
            { status: 500 }
        );
    }
}