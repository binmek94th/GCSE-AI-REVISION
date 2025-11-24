import { NextResponse } from "next/server";
import Stripe from "stripe";
import admin from "@/lib/firebaseAdmin";
import { generateStudyPlanForUser } from "@/lib/services/studyPlanGenerator";

// This is CRITICAL - tells Next.js not to parse the body
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/** Decode your encoded client_reference_id (Payment Links) */
function decodeClientReferenceId(encoded: string | null): any | null {
    if (!encoded) return null;
    try {
        return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
    } catch (e) {
        console.error("❌ Failed to decode client_reference_id", e);
        return null;
    }
}

/** Handle subscription created/updated */
const handleSubscriptionUpdate = async (subscription: Stripe.Subscription) => {
    try {
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId);

        if (!("metadata" in customer)) {
            console.warn(`⚠ Customer ${customerId} missing metadata`);
            return;
        }

        const uid = (customer.metadata as any).firebaseUID;
        if (!uid) {
            console.warn("⚠ firebaseUID missing in customer metadata");
            return;
        }

        const interval = subscription.items.data[0]?.price?.recurring?.interval;
        const intervalCount = subscription.items.data[0]?.price?.recurring?.interval_count || 1;

        const startDate = new Date(subscription.created * 1000);
        let endDate = new Date(startDate);

        if (interval === "month") {
            endDate.setMonth(endDate.getMonth() + intervalCount);
        } else if (interval === "year") {
            endDate.setFullYear(endDate.getFullYear() + intervalCount);
        } else if (interval === "week") {
            endDate.setDate(endDate.getDate() + (7 * intervalCount));
        } else if (interval === "day") {
            endDate.setDate(endDate.getDate() + intervalCount);
        }

        const currentPeriodEnd = admin.firestore.Timestamp.fromDate(endDate);
        const currentPeriodStart = admin.firestore.Timestamp.fromDate(startDate);

        console.log("📋 Subscription details:", {
            id: subscription.id,
            status: subscription.status,
            interval: `${intervalCount} ${interval}(s)`,
            startDate: startDate.toISOString(),
            calculatedEndDate: endDate.toISOString(),
        });

        await admin.firestore().collection("users").doc(uid).collection("subscriptions")
            .doc(subscription.id).set({
                subscriptionId: subscription.id,
                subscriptionStatus: subscription.status,
                currentPeriodEnd: currentPeriodEnd,
                currentPeriodStart: currentPeriodStart,
                priceId: subscription.items.data[0]?.price?.id ?? null,
                planInterval: interval,
                planAmount: subscription.items.data[0]?.price?.unit_amount ?? null,
                currency: subscription.currency,
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

        console.log(`✅ Subscription updated for user ${uid} - Status: ${subscription.status}, End: ${endDate.toISOString()}`);
    } catch (err) {
        console.error("❌ Failed to update subscription:", err);
    }
};

/** Handle one-time study pack purchase */
const handleStudyPackPurchaseFromPaymentLink = async (ref: any) => {
    try {
        const uid = ref.userId;
        const packId = ref.packId;

        if (!uid || !packId) {
            console.warn("⚠ Missing uid or packId in payload", ref);
            return;
        }

        const packDoc = await admin.firestore()
            .collection("study_packs")
            .doc(packId)
            .get();

        const packData = packDoc.exists ? packDoc.data() : {};
        const subject = packData?.subject || packData?.title || "Unknown";

        await admin.firestore()
            .collection("users")
            .doc(uid)
            .collection("boughtPacks")
            .doc(packId)
            .set({
                boughtAt: admin.firestore.FieldValue.serverTimestamp(),
                subject,
            });

        await generateStudyPlanForUser(uid);

        console.log(`📚 User ${uid} purchased pack ${packId} (${subject})`);
    } catch (err) {
        console.error("❌ Failed to handle pack purchase:", err);
    }
};

export async function POST(req: Request) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get("stripe-signature");

        if (!signature) {
            console.error("❌ Missing stripe-signature header");
            return NextResponse.json(
                { error: "Missing stripe-signature header" },
                { status: 400 }
            );
        }

        console.log("🔍 Webhook Debug Info:", {
            hasBody: !!rawBody,
            bodyLength: rawBody.length,
            hasSignature: !!signature,
            signaturePreview: signature.substring(0, 20) + "...",
            endpointSecretConfigured: !!endpointSecret,
        });

        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(
                rawBody,
                signature,
                endpointSecret
            );
        } catch (err: any) {
            console.error("❌ Webhook signature verification failed:", err.message);
            console.error("Full error:", err);
            return NextResponse.json(
                { error: `Webhook Error: ${err.message}` },
                { status: 400 }
            );
        }

        console.log(`✅ Webhook verified! Event type: ${event.type}`);

        switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted":
                await handleSubscriptionUpdate(
                    event.data.object as Stripe.Subscription
                );
                break;

            case "invoice.payment_succeeded":
                console.log("💚 Invoice successfully paid");
                break;

            case "invoice.payment_failed":
                console.log("💔 Invoice payment failed");
                break;

            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;

                console.log("🔍 Checkout Session:", {
                    mode: session.mode,
                    customer: session.customer,
                    client_reference_id: session.client_reference_id,
                });

                const ref = decodeClientReferenceId(session.client_reference_id || "");

                if (ref) {
                    console.log("🟦 Decoded client_reference_id:", ref);
                }

                if (session.mode === "subscription") {
                    if (ref?.userId && session.customer) {
                        await stripe.customers.update(session.customer as string, {
                            metadata: { firebaseUID: ref.userId },
                        });
                        console.log(`✅ Attached firebaseUID to customer ${session.customer}`);
                    }

                    if (session.subscription) {
                        const subscription = await stripe.subscriptions.retrieve(
                            session.subscription as string
                        );
                        await handleSubscriptionUpdate(subscription);
                    }
                }

                if (session.mode === "payment") {
                    await handleStudyPackPurchaseFromPaymentLink(ref);
                }

                break;
            }

            case "payment_intent.succeeded":
                console.log("💰 PaymentIntent succeeded");
                break;

            default:
                console.log(`ℹ Unhandled Stripe event: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (err: any) {
        console.error("❌ Webhook processing error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}