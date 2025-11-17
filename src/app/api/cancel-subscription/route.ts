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

        // Get user's active subscription from subcollection
        const subscriptionsRef = admin.firestore()
            .collection("users")
            .doc(uid)
            .collection("subscriptions");

        const activeSubscriptions = await subscriptionsRef
            .where("subscriptionStatus", "==", "active")
            .limit(1)
            .get()

        if (activeSubscriptions.empty) {
            return NextResponse.json(
                { error: "No active subscription found" },
                { status: 404 }
            );
        }

        const subscriptionDoc = activeSubscriptions.docs[0];
        const subscriptionId = subscriptionDoc.id;

        console.log(`🔄 Canceling subscription ${subscriptionId} for user ${uid}`);

        // Cancel subscription at period end (don't immediately cancel)
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true,
        });

        // Update Firestore subscription document
        await subscriptionsRef.doc(subscriptionId).update({
            cancelAtPeriodEnd: true,
            status: subscription.status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Subscription ${subscriptionId} set to cancel at period end for user ${uid}`);

        return NextResponse.json({
            success: true,
            message: "Subscription will be canceled at the end of the billing period",
            cancelAt: subscription.cancel_at,
            // currentPeriodEnd: subscription.currentPeriodEnd,
        });
    } catch (error: any) {
        console.error("❌ Error canceling subscription:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}