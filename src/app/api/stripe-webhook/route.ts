import { NextResponse } from "next/server";
import Stripe from "stripe";
import admin from "@/lib/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error("Webhook signature verification failed.", err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const userId = paymentIntent.metadata.userId;
        const packageId = paymentIntent.metadata.packageId;

        if (userId && packageId) {
            try {
                const userRef = admin.firestore().collection("users").doc(userId);
                const userDoc = await userRef.get();
                if (!userDoc.exists) {
                    console.error("User not found:", userId);
                    return NextResponse.json({ error: "User not found" }, { status: 404 });
                }

                const packageRef = admin.firestore().collection("packages").doc(packageId);
                const packageDoc = await packageRef.get();
                if (!packageDoc.exists) {
                    console.error("Package not found:", packageId);
                    return NextResponse.json({ error: "Package not found" }, { status: 404 });
                }

                const pkgData = packageDoc.data();
                const tokensToAdd = pkgData?.tokens || 0;

                const userData = userDoc.data();
                const currentTokens = userData?.tokens || 0;

                await userRef.update({
                    tokens: currentTokens + tokensToAdd,
                });

                console.log(`Added ${tokensToAdd} tokens to user ${userId}`);
            } catch (err) {
                console.error("Failed to update user tokens:", err);
            }
        }
    }

    return NextResponse.json({ received: true });
}
