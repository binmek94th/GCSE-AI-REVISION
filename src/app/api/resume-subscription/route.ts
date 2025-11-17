import { NextResponse } from "next/server";
import Stripe from "stripe";
import admin from "@/lib/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
    try {
        // Get authorization token
        const authHeader = req.headers.get("authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const idToken = authHeader.split("Bearer ")[1];

        // Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Get user's subscription from subcollection
        const subscriptionsRef = admin.firestore()
            .collection("users")
            .doc(uid)
            .collection("subscriptions");

        // Look for active subscription with cancelAtPeriodEnd = true
        const cancelingSubscriptions = await subscriptionsRef
            .where("status", "==", "active")
            .where("cancelAtPeriodEnd", "==", true)
            .limit(1)
            .get();

        if (cancelingSubscriptions.empty) {
            return NextResponse.json(
                { error: "No subscription pending cancellation found" },
                { status: 404 }
            );
        }

        const subscriptionDoc = cancelingSubscriptions.docs[0];
        const subscriptionId = subscriptionDoc.id;

        console.log(`🔄 Resuming subscription ${subscriptionId} for user ${uid}`);

        // Resume subscription (remove cancel_at_period_end)
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false,
        });

        // Update Firestore subscription document
        await subscriptionsRef.doc(subscriptionId).update({
            cancelAtPeriodEnd: false,
            status: subscription.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Subscription ${subscriptionId} resumed for user ${uid}`);

        return NextResponse.json({
            success: true,
            message: "Subscription resumed successfully",
        });
    } catch (error: any) {
        console.error("❌ Error resuming subscription:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}