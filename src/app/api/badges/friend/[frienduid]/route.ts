import { NextRequest, NextResponse } from "next/server";
import admin  from "@/lib/firebaseAdmin";

export async function GET(
    req: NextRequest,
    { params }: { params: { friendUid: string } }
) {
    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];

        // Verify the token
        const decodedToken = await admin.auth().verifyIdToken(token);
        const currentUserUid = decodedToken.uid;

        const { friendUid } = params;
        console.log("Current user:", currentUserUid);
        console.log("Friend UID:", friendUid);

        // Check if they are friends
        const friendshipsSnapshot = await admin
            .firestore()
            .collection("friendships")
            .where("status", "==", "accepted")
            .get();

        console.log("Total friendships found:", friendshipsSnapshot.size);

        const isFriend = friendshipsSnapshot.docs.some(doc => {
            const data = doc.data();
            const users = data.users || [];
            const hasBothUsers = users.includes(currentUserUid) && users.includes(friendUid);
            console.log("Checking friendship:", { users, hasBothUsers });
            return hasBothUsers;
        });

        console.log("Is friend:", isFriend);

        if (!isFriend) {
            return NextResponse.json(
                { success: false, error: "Not friends with this user" },
                { status: 403 }
            );
        }

        // Fetch friend's badges
        const friendDoc = await admin
            .firestore()
            .collection("users")
            .doc(friendUid)
            .get();

        console.log("Friend doc exists:", friendDoc.exists);

        if (!friendDoc.exists) {
            return NextResponse.json(
                { success: false, error: "User not found" },
                { status: 404 }
            );
        }

        const friendData = friendDoc.data();
        const badges = friendData?.badges || {};

        console.log("Badges found:", badges);

        return NextResponse.json({ success: true, badges });
    } catch (error) {
        console.error("Error fetching friend badges:", error);
        return NextResponse.json(
            { success: false, error: "Internal server error" },
            { status: 500 }
        );
    }
}