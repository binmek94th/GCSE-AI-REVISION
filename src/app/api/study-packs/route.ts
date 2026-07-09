import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";


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
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const examBoard = userData?.preferences?.examBoard;

        // Level the user is studying (GCSE / A-Level). Onboarding stores it
        // top-level; fall back to preferences for safety.
        const level: string =
            userData?.level ?? userData?.preferences?.level ?? "GCSE";

        if (!examBoard) {
            return NextResponse.json(
                { error: "Exam board not set in preferences" },
                { status: 400 }
            );
        }

        // ✅ study_packs is now the source of truth — query it directly by
        // exam_board and level instead of cross-referencing a static
        // EXAM_DATA/A_Level_EXAM_DATA combo list. Any pack seeded into the
        // collection is automatically valid; no separate allow-list to
        // keep in sync.
        const snapshot = await admin.firestore()
            .collection("study_packs")
            .where("exam_board", "==", examBoard)
            .where("level", "==", level)
            .get();

        const studyPacks = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Check which subjects the user is actively learning
        const subjectsSnapshot = await admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("subjects")
            .get();

        // Build a set of subject names the user is enrolled in (lowercase for safe comparison)
        const enrolledSubjects = new Set(
            subjectsSnapshot.docs.map((doc) => doc.data().subject?.toLowerCase())
        );

        const result = studyPacks.map((pack: any) => ({
            ...pack,
            enrolled: enrolledSubjects.has(pack.subject?.toLowerCase()),
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


export async function POST(req: Request) {
    try {
        const idToken = req.headers
            .get("Authorization")
            ?.split("Bearer ")[1];

        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await req.json();
        const { id, ...data } = body;

        if (!id)
            return NextResponse.json({ error: "Missing subject id" }, { status: 400 });

        const subjectRef = admin.firestore()
            .collection("users")
            .doc(userId)
            .collection("subjects")
            .doc(id);

        const docSnap = await subjectRef.get();

        if (!docSnap.exists) {
            await subjectRef.set({
                id,
                ...data,
                createdAt: new Date(),
            });

            return NextResponse.json({
                message: "Subject created",
                created: true,
            });
        }
        return NextResponse.json({
            message: "Subject already exists",
            created: false,
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}