import { NextResponse } from "next/server";
import Stripe from "stripe";
import admin from "@/lib/firebaseAdmin";


export async function POST(req: Request) {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: "2025-08-27.basil",
    });
    try {
        const { packageId, duration } = await req.json();
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
        const priceId = duration === 'yearly' ? pkgData.yearly_price_id : pkgData.monthly_price_id;
        if (!priceId) return NextResponse.json({ error: "Stripe Price ID not found" }, { status: 400 });

        const userDoc = await admin.firestore().collection("users").doc(uid).get();
        let customerId = userDoc.data()?.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({ metadata: { firebaseUID: uid } });
            customerId = customer.id;
            await admin.firestore().collection("users").doc(uid).update({ stripeCustomerId: customerId });
        }

        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: "default_incomplete",
            expand: ["latest_invoice.payment_intent"],
        });

        let clientSecret: string | null = null;
        let subscriptionRequiresSetup = false;

        if (subscription.latest_invoice && typeof subscription.latest_invoice !== "string" &&
        "payment_intent" in subscription.latest_invoice) {
            const paymentIntent = subscription.latest_invoice.payment_intent as Stripe.PaymentIntent;

            clientSecret = paymentIntent?.client_secret ?? null;
            subscriptionRequiresSetup = paymentIntent?.setup_future_usage === "off_session";
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
