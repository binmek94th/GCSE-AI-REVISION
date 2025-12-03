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

        // Extract price IDs from your payment links
        // Monthly: https://buy.stripe.com/test_cNi6oIfuxeeVaoecs51VK01
        // Yearly: https://buy.stripe.com/test_cNi9AUaadgn3fIydw91VK00

        // These are the price IDs embedded in your payment links
        // You can also find them in your Stripe Dashboard under Products
        const priceId = billing === "month"
            ? "price_1SUP1ELkvi7Txyt7Pgv4tscx"  // Replace with your actual monthly price ID
            : "price_1SUP1ELkvi7Txyt7Pgv4tscx"; // Replace with your actual yearly price ID

        // Encode payload for client_reference_id
        const payload = {
            userId,
            billing,
            redirectTo: redirectTo || null,
        };
        const clientReferenceId = Buffer.from(JSON.stringify(payload)).toString("base64");

        console.log(redirectTo)

        const session = await stripe.checkout.sessions.create({
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            client_reference_id: clientReferenceId,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}${redirectTo || "/dashboard"}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/token?canceled=true`,
            metadata: {
                userId,
                billing,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("❌ Error creating checkout session:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}