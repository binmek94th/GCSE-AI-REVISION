import { NextResponse } from "next/server";
import Stripe from "stripe";
import admin  from "@/lib/firebaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
    try {
        const { packageId } = await req.json();
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        if (!packageId) {
            return NextResponse.json({ error: "Package ID is required" }, { status: 400 });
        }

        const pkgDoc = await admin.firestore().collection("packages").doc(packageId).get();
        if (!pkgDoc.exists) {
            return NextResponse.json({ error: "Package not found" }, { status: 404 });
        }

        const pkgData = pkgDoc.data();
        if (!pkgData?.price) {
            return NextResponse.json({ error: "Package price not found" }, { status: 400 });
        }

        const amountInPence = Math.round(pkgData.price * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInPence,
            currency: "GBP",
            automatic_payment_methods: { enabled: true },
            metadata: { userId: uid, packageId: packageId },
        });

        return NextResponse.json({ clientSecret: paymentIntent.client_secret });
    } catch (err: any) {
        console.error("Stripe payment error:", err);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }
}
