import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function PUT(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await req.json().catch(() => ({}));
        let parentEmail = body?.parentEmail;

        // Normalise: null / "" clears the field; otherwise must be a valid email.
        if (parentEmail === undefined || parentEmail === null || parentEmail === "") {
            parentEmail = null;
        } else if (typeof parentEmail !== "string") {
            return NextResponse.json({ error: "Invalid parent email" }, { status: 400 });
        } else {
            parentEmail = parentEmail.trim().toLowerCase();
            if (!EMAIL_RE.test(parentEmail)) {
                return NextResponse.json({ error: "Invalid parent email" }, { status: 400 });
            }
        }

        await admin.firestore().collection("users").doc(userId).set(
            {
                parent_email: parentEmail,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return NextResponse.json({ success: true, parentEmail });
    } catch (error) {
        console.error("Error updating parent email:", error);
        return NextResponse.json(
            { error: "Failed to update parent email" },
            { status: 500 }
        );
    }
}