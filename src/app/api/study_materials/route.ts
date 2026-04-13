import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// ------------------------
// Fetch materials with pagination
// ------------------------
async function getMaterialsByPack(packId: string, examBoard: string, limit: number, page: number) {
    console.log(packId)
    const collectionRef = admin
        .firestore()
        .collection("study_materials")
        .where("exam_board", "==", examBoard)
        .where("moderation_status", "==", "approved")
        .where("subject", "==", packId)
        .orderBy("title");

    const allDocsSnapshot = await collectionRef.get();
    const allDocs = allDocsSnapshot.docs;

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedDocs = allDocs.slice(startIndex, endIndex);

    const materials = paginatedDocs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
    }));

    return {
        materials,
        total: allDocs.length,
        hasMore: endIndex < allDocs.length,
    };
}

// ------------------------
// GET: Fetch materials + progress
// ------------------------
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const packId = searchParams.get("packId");
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        const limit = parseInt(searchParams.get("limit") || "10", 10);
        const page = parseInt(searchParams.get("page") || "1", 10);

        if (!idToken || !packId) {
            return NextResponse.json(
                { message: "Missing ID token or pack ID" },
                { status: 400 }
            );
        }

        // Verify auth
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const studyPack = await admin.firestore().collection("study_packs")
            .doc(packId).get();

        const userDoc = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .get();

        const userData = userDoc.data();
        const examBoard = userData?.preferences?.examBoard;

        if (!examBoard) {
            return NextResponse.json(
                { message: "User exam board preference not set" },
                { status: 400 }
            );
        }


        // Fetch materials
        const { materials, total, hasMore } = await getMaterialsByPack(studyPack.data().subject, examBoard, limit, page);

        // Fetch user progress
        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("progress")
            .doc(packId);

        const progressDoc = await progressDocRef.get();
        const progressData = progressDoc.exists ? progressDoc.data() : {};

        // Merge progress info
        const materialsWithProgress = materials.map((m) => ({
            ...m,
            done: !!progressData?.[m.id],
        }));

        return NextResponse.json(
            { materials: materialsWithProgress, total, page, limit, hasMore },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching materials:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { packId, materialId, done } = body;
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];

        if (!idToken || !packId || !materialId) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;
        const userRef = admin.firestore().collection("users").doc(userId);

        const progressDocRef = admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("progress")
            .doc(packId);

        await progressDocRef.set(
            { [materialId]: done ?? true },
            { merge: true }
        );
        const userSnap = await userRef.get();
        const userData = userSnap.data() || {};

        const currentBadges = userData.badges?.milestone || [];

        // ✅ Step 3: Count total finished materials across all packs
        const progressDocs = await userRef.collection("progress").get();
        let totalCompleted = 0;

        progressDocs.forEach((doc) => {
            const data = doc.data();
            totalCompleted += Object.values(data).filter((v) => v === true).length;
        });

        const newBadges = [...currentBadges];
        if (totalCompleted > 1 && !currentBadges.includes("First Steps")) {
            newBadges.push("First Steps");

            await userRef.update({
                "badges.milestone": newBadges,
            });

            console.log(`🎉 User ${userId} earned the "First Steps" badge`);
        }

        return NextResponse.json({ message: "Progress updated" }, { status: 200 });
    } catch (error) {
        console.error("Error updating progress:", error);
        return NextResponse.json(
            { message: "Internal server error" },
            { status: 500 }
        );
    }
}
