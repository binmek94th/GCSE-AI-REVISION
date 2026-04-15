import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, billing, redirectTo } = body;

        if (!userId) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400 }
            );
        }

        const priceId = billing === "month"
            ? process.env.STRIPE_PRICE_MONTHLY!
            : process.env.STRIPE_PRICE_YEARLY!;

        if (!priceId) {
            return NextResponse.json(
                { error: `Missing price ID for billing: ${billing}` },
                { status: 500 }
            );
        }

        const payload = { userId, billing, redirectTo: redirectTo || null };
        const clientReferenceId = Buffer.from(JSON.stringify(payload)).toString("base64");

        console.log(redirectTo);

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            client_reference_id: clientReferenceId,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${redirectTo || "/dashboard"}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/token?canceled=true`,
            metadata: { userId, billing },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("❌ Error creating checkout session:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}