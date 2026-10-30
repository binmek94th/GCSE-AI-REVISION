import { NextResponse } from "next/server";
import Stripe from "stripe";
import admin from "@/lib/firebaseAdmin";

// The embedded checkout page sends `billing` ("monthly" | "yearly"). This used to read
// `duration`, which that page never sends, so EVERY subscription was created on the
// monthly price — even when yearly was chosen. `duration` is still accepted for older callers.
const wantsYearly = (value: unknown) =>
    ["yearly", "year", "annual", "annually"].includes(String(value ?? "").toLowerCase());

/**
 * The Stripe customer for this student: reuse the saved one, or create one.
 *  - The customer now carries the student's email. It was created with no email at all,
 *    so Stripe had nowhere to send receipts or failed-payment emails. Customers that were
 *    already created without one get it filled in here.
 *  - If the saved customer id no longer exists in Stripe (e.g. it was made with test keys
 *    and we are now on live keys, or it was deleted) a new customer is created instead of
 *    failing with "No such customer" on every attempt.
 */
async function getOrCreateCustomer(
    stripe: Stripe,
    uid: string,
    email: string | undefined,
    savedCustomerId: string | undefined
): Promise<string> {
    if (savedCustomerId) {
        try {
            const existing = await stripe.customers.retrieve(savedCustomerId);
            if (!existing.deleted) {
                if (email && !existing.email) {
                    await stripe.customers.update(savedCustomerId, { email });
                }
                return savedCustomerId;
            }
        } catch (err: any) {
            if (err?.code !== "resource_missing") throw err;
        }
    }

    const customer = await stripe.customers.create({
        ...(email && { email }),
        metadata: { firebaseUID: uid },
    });
    await admin.firestore().collection("users").doc(uid).set({ stripeCustomerId: customer.id }, { merge: true });
    return customer.id;
}

export async function POST(req: Request) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-08-27.basil",
    });
    try {
        const { packageId, billing, duration } = await req.json();
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        if (!packageId) return NextResponse.json({ error: "Package ID is required" }, { status: 400 });

        const pkgDoc = await admin.firestore().collection("packages").doc(packageId).get();
        if (!pkgDoc.exists) return NextResponse.json({ error: "Package not found" }, { status: 404 });
        const pkgData = pkgDoc.data();

        if (!pkgData?.monthly_price || !pkgData?.yearly_price) {
            return NextResponse.json({ error: "Package price not found" }, { status: 400 });
        }
        const priceId = wantsYearly(billing ?? duration) ? pkgData.yearly_price_id : pkgData.monthly_price_id;
        if (!priceId) return NextResponse.json({ error: "Stripe Price ID not found" }, { status: 400 });

        const userDoc = await admin.firestore().collection("users").doc(uid).get();
        const customerId = await getOrCreateCustomer(
            stripe,
            uid,
            decodedToken.email,
            userDoc.data()?.stripeCustomerId
        );

        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            // Keep the card used for the first payment as the subscription's default, so
            // renewals can charge it. Without this the first payment works and the first
            // renewal fails because Stripe has no card to use.
            payment_settings: { save_default_payment_method: "on_subscription" },
            // `latest_invoice.payment_intent` no longer exists in the Stripe API version we use
            // (2025-08-27.basil) — asking for it fails. The payment secret now lives on
            // `latest_invoice.confirmation_secret`. A subscription that needs no payment up
            // front (trial / 100% coupon) has a setup intent instead.
            expand: ["latest_invoice.confirmation_secret", "pending_setup_intent"],
        });

        let clientSecret: string | null = null;
        let subscriptionRequiresSetup = false; // true -> the page confirms a SetupIntent, not a PaymentIntent

        const invoice = subscription.latest_invoice;
        if (invoice && typeof invoice !== "string") {
            clientSecret = invoice.confirmation_secret?.client_secret ?? null;
        }
        if (!clientSecret) {
            const setupIntent = subscription.pending_setup_intent;
            if (setupIntent && typeof setupIntent !== "string") {
                clientSecret = setupIntent.client_secret;
                subscriptionRequiresSetup = true;
            }
        }

        return NextResponse.json({
            subscriptionId: subscription.id,
            clientSecret,
            subscriptionRequiresSetup,
        });

    } catch (err: any) {
        console.error("Stripe subscription error:", err);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
