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

const COMMISSION_RATE = parseInt(process.env.COMMISSION_RATE);

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

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Resolves a Stripe customer ID to a Firebase UID via customer metadata,
 * retrying with backoff since Stripe does NOT guarantee webhook delivery
 * order. `checkout.session.completed` is what attaches firebaseUID to the
 * customer — if invoice.payment_succeeded / customer.subscription.created
 * for the SAME new subscription is delivered before that metadata write
 * lands, a single immediate lookup can return null even though the
 * customer is correctly linked moments later.
 *
 * Throws if the uid still can't be resolved after all retries — this is
 * intentional: letting the error propagate makes the webhook handler
 * return a non-2xx response, which makes Stripe automatically retry
 * delivery of this event later (its own retry schedule spans hours/days),
 * by which point the race will have resolved. Silently returning null
 * here was the original bug — it made failures invisible and unrecoverable.
 */
async function getFirebaseUidFromCustomerWithRetry(
    customerId: string,
    { retries = 4, baseDelayMs = 1000 }: { retries?: number; baseDelayMs?: number } = {}
): Promise<string> {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const customer = await stripe.customers.retrieve(customerId);
        const uid = "metadata" in customer ? (customer.metadata as any).firebaseUID : undefined;

        if (uid) return uid;

        if (attempt < retries) {
            const delay = baseDelayMs * Math.pow(2, attempt); // 1s, 2s, 4s, 8s
            console.warn(`⏳ firebaseUID not yet set on customer ${customerId}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`);
            await sleep(delay);
        }
    }

    throw new Error(`firebaseUID never resolved for customer ${customerId} after ${retries} retries`);
}

/** Handle subscription created/updated */
const handleSubscriptionUpdate = async (subscription: Stripe.Subscription) => {
    const customerId = subscription.customer as string;
    console.log("🔍 handleSubscriptionUpdate called:", {
        subscriptionId: subscription.id,
        status: subscription.status,
        customerId,
    });

    const uid = await getFirebaseUidFromCustomerWithRetry(customerId);
    console.log("🔑 firebaseUID resolved:", uid);

    const interval = subscription.items.data[0]?.price?.recurring?.interval;
    const intervalCount = subscription.items.data[0]?.price?.recurring?.interval_count || 1;

    const startDate = new Date(subscription.created * 1000);
    const endDate = new Date(startDate);

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

    await admin.firestore().collection("users").doc(uid).collection("subscriptions")
        .doc(subscription.id).set({
            subscriptionId: subscription.id,
            status: subscription.status,
            currentPeriodEnd: currentPeriodEnd,
            currentPeriodStart: currentPeriodStart,
            priceId: subscription.items.data[0]?.price?.id ?? null,
            planInterval: interval,
            planAmount: subscription.items.data[0]?.price?.unit_amount ?? null,
            currency: subscription.currency,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

    // Referral churn tracking — if this user was referred by a tutor
    // and their subscription has now ended, mark the referral as
    // churned so no further commission events get generated for them.
    const terminalStatuses = ["canceled", "unpaid", "incomplete_expired"];
    if (terminalStatuses.includes(subscription.status)) {
        const referralSnap = await admin.firestore()
            .collection("referrals")
            .where("referredUserId", "==", uid)
            .limit(1)
            .get();

        if (!referralSnap.empty) {
            const referralDoc = referralSnap.docs[0];
            if (referralDoc.data().status === "subscribed") {
                await referralDoc.ref.update({
                    status: "churned",
                    churnedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`📉 Referral ${referralDoc.id} marked churned for user ${uid}`);
            }
        }
    }
};

/**
 * Referral commission generation — called on every successful invoice
 * payment. If the paying customer was referred by a tutor, and is still
 * within their first-year rev-share window, creates a pending
 * commission_events doc worth 30% of the amount paid. On the FIRST
 * successful payment for a referral, also flips the referral to
 * 'subscribed' and locks in the one-year window.
 *
 * Called from TWO places:
 *   1. The invoice.payment_succeeded webhook event (subsequent renewals)
 *   2. Directly from checkout.session.completed's session.invoice (the
 *      first invoice) as a safety net, since that event is proven to
 *      fire reliably for this app while invoice.payment_succeeded's
 *      subscription on the Stripe Dashboard should be double-checked.
 * Idempotent via the stripeInvoiceId check below, so being called twice
 * for the same invoice (e.g. both paths firing) never double-counts.
 */
const handleInvoicePaymentSucceeded = async (invoice: Stripe.Invoice) => {
    const customerId = invoice.customer as string;
    if (!customerId) return;

    const uid = await getFirebaseUidFromCustomerWithRetry(customerId);

    const db = admin.firestore();
    const referralSnap = await db.collection("referrals").where("referredUserId", "==", uid).limit(1).get();
    if (referralSnap.empty) {
        return; // this user wasn't referred by a tutor — nothing to do
    }

    // Idempotency guard — Stripe explicitly documents that webhook events
    // can be delivered more than once, and this function can also be
    // called twice for the same invoice (once via checkout.session.completed's
    // safety net, once via the actual invoice.payment_succeeded event).
    const existingCommission = await db.collection("commission_events")
        .where("stripeInvoiceId", "==", invoice.id)
        .limit(1)
        .get();
    if (!existingCommission.empty) {
        console.log(`ℹ Commission already recorded for invoice ${invoice.id} — skipping duplicate`);
        return;
    }

    const referralDoc = referralSnap.docs[0];
    let referral = referralDoc.data();

    if (referral.status === "churned") {
        console.log(`ℹ Referral ${referralDoc.id} is churned — not generating commission`);
        return;
    }

    // First successful payment for this referral: lock in the
    // one-year rev-share window and mark as subscribed.
    if (referral.status !== "subscribed") {
        const subscribedAt = new Date();
        const firstYearEndsAt = new Date(subscribedAt);
        firstYearEndsAt.setFullYear(firstYearEndsAt.getFullYear() + 1);

        await referralDoc.ref.update({
            status: "subscribed",
            subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
            firstYearEndsAt: admin.firestore.Timestamp.fromDate(firstYearEndsAt),
        });

        await db.collection("tutors").doc(referral.tutorId).update({
            totalSubscribed: admin.firestore.FieldValue.increment(1),
        });

        referral = { ...referral, firstYearEndsAt: admin.firestore.Timestamp.fromDate(firstYearEndsAt) };
        console.log(`✅ Referral ${referralDoc.id} marked subscribed for user ${uid}`);
    }

    const now = new Date();
    const firstYearEndsAt: Date | null = referral.firstYearEndsAt?.toDate?.() ?? null;
    const withinWindow = !firstYearEndsAt || now < firstYearEndsAt;

    if (!withinWindow) {
        console.log(`ℹ Referral ${referralDoc.id} is past its first-year window — not generating commission`);
        return;
    }

    const amountPaid = invoice.amount_paid / 100; // Stripe amounts are in the smallest currency unit
    const commissionAmount = Math.round(amountPaid * COMMISSION_RATE * 100) / 100;

    if (commissionAmount <= 0) return;

    await db.collection("commission_events").add({
        tutorId: referral.tutorId,
        referralId: referralDoc.id,
        referredUserId: uid,
        stripeInvoiceId: invoice.id,
        periodStart: admin.firestore.Timestamp.fromDate(new Date(invoice.period_start * 1000)),
        periodEnd: admin.firestore.Timestamp.fromDate(new Date(invoice.period_end * 1000)),
        subscriptionAmount: amountPaid,
        commissionRate: COMMISSION_RATE,
        commissionAmount,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        paidAt: null,
        paidBy: null,
        payoutNote: null,
    });

    await db.collection("tutors").doc(referral.tutorId).update({
        totalCommissionEarned: admin.firestore.FieldValue.increment(commissionAmount),
    });

    console.log(`💰 Commission event created: tutor ${referral.tutorId} earned ${commissionAmount} from invoice ${invoice.id}`);
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
                await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
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

                    // ✅ Safety net: process the referral commission for the
                    // FIRST invoice right here, using data we already know
                    // is reliably present on checkout.session.completed —
                    // rather than depending entirely on the separate
                    // invoice.payment_succeeded event (verify in Stripe
                    // Dashboard → Developers → Webhooks → this endpoint's
                    // "Events to send" that it's actually enabled).
                    // Subsequent renewal invoices still rely on
                    // invoice.payment_succeeded/invoice.paid firing
                    // correctly — this only guarantees the first one.
                    if (session.invoice) {
                        try {
                            const invoice = await stripe.invoices.retrieve(session.invoice as string);
                            await handleInvoicePaymentSucceeded(invoice);
                        } catch (err) {
                            console.error("❌ Failed to process referral commission from checkout session invoice:", err);
                        }
                    }
                }

                if (session.mode === 'payment' && session.metadata?.credits) {
                    const uid = session.metadata.uid;
                    const creditsToAdd = parseInt(session.metadata.credits, 10);

                    await admin.firestore().collection('users').doc(uid).update({
                        uploadCredits: admin.firestore.FieldValue.increment(creditsToAdd),
                    });
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
        // Errors from handleSubscriptionUpdate / handleInvoicePaymentSucceeded
        // (e.g. firebaseUID never resolved) now reach here instead of being
        // swallowed internally, causing a 500 response — which makes Stripe
        // automatically retry delivering this event later per its own
        // retry schedule, self-healing once the underlying race has resolved.
        console.error("❌ Webhook processing error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}