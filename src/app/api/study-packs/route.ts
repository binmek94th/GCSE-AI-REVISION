import { NextResponse } from "next/server";
import admin from "../../../lib/firebaseAdmin";
import { EXAM_DATA } from "@/app/onboarding/exam_data";
import {A_Level_EXAM_DATA} from "@/app/onboarding/a-levelExamData";

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

        console.log(level, examBoard);

        // A-Level subjects are untiered, so they use a separate combo list.
        const examData = level === "A-Level" ? A_Level_EXAM_DATA : EXAM_DATA;
        const allowedCombos = examData.filter(
            (item) => item.exam_board === examBoard
        );

        // Match a pack against the allowed combos for this level. Subject match is
        // case-insensitive (folder-derived casing varies); tier is only checked
        // for GCSE since A-Level has no tier.
        const matchesCombo = (pack: any) =>
            allowedCombos.some((combo: any) => {
                if (combo.subject?.toLowerCase() !== pack.subject?.toLowerCase()) return false;
                if (level === "A-Level") return true;
                return combo.tier === pack.tier;
            });

        const snapshot = await admin.firestore()
            .collection("study_packs")
            .where("exam_board", "==", examBoard)
            .get();

        const studyPacks = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .filter((pack: any) => {

                if (pack.level && pack.level !== level) return false;
                return matchesCombo(pack);
            });

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