import { NextResponse } from "next/server";
import Stripe from "stripe";
import admin from "@/lib/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature")!

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        console.error("Webhook signature verification failed.", err.message);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    const handleSubscriptionCreatedOrUpdated = async (subscription: Stripe.Subscription) => {
        try {
            const customerId = subscription.customer as string;

            // Retrieve customer and type guard
            const stripeUser = await stripe.customers.retrieve(customerId);
            if (!("metadata" in stripeUser)) {
                console.warn(`Customer ${customerId} is deleted or missing metadata`);
                return;
            }

            const uid = (stripeUser.metadata as any).firebaseUID;
            if (!uid) return;


            await admin.firestore().collection("users").doc(uid).update({
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                currentPeriodEnd: "current_period_end" in subscription ?  subscription.current_period_end : null, // safe access
                priceId: subscription.items.data[0]?.price.id ?? null,
            });

            console.log(`Updated subscription info for user ${uid}`);
        } catch (err) {
            console.error("Failed to update user subscription:", err);
        }
    };

    switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated":
            await handleSubscriptionCreatedOrUpdated(event.data.object as Stripe.Subscription);
            break;

        case "invoice.payment_succeeded":
            console.log("Payment succeeded for invoice:", (event.data.object as Stripe.Invoice).id);
            break;

        case "invoice.payment_failed":
            console.log("Payment failed for invoice:", (event.data.object as Stripe.Invoice).id);
            break;

        case "checkout.session.completed":
            const session = event.data.object as Stripe.Checkout.Session;
            if (session.mode === "payment") {
                await handleStudyPackPurchase(session);
            }
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }


    return NextResponse.json({ received: true });
}


const handleStudyPackPurchase = async (session: Stripe.Checkout.Session) => {
    try {
        const uid = session.metadata?.userId;
        const packId = session.metadata?.packId;

        console.log("Handling study pack purchase for session:", session.id, "User ID:", uid, "Pack ID:", packId);
        if (!uid || !packId) {
            console.warn("Checkout session missing userId or packId in metadata");
            return;
        }

        await admin.firestore()
            .collection("users")
            .doc(uid)
            .collection("boughtPacks")
            .doc(packId)
            .set({
                boughtAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        console.log(`User ${uid} bought pack ${packId}`);
    } catch (err) {
        console.error("Failed to add bought study pack:", err);
    }
};
