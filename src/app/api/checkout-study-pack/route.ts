import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2025-08-27.basil",
});

export async function POST(req: Request) {
    try {
        const body = await req.json();

        console.log("📥 Received request body:", body);

        // Extract parameters - check both userId and user_id for compatibility
        const userId = body.userId || body.user_id;
        const packId = body.packId || body.pack_id;
        const subject = body.subject;

        if (!userId || !packId) {
            console.error("❌ Missing required fields:", { userId, packId });
            return NextResponse.json(
                { error: "User ID and Pack ID are required" },
                { status: 400 }
            );
        }

        // Your study pack price ID
        const priceId = process.env.STRIPE_PACK_PRICE_ID || "price_1SUU5xLkvi7Txyt7p60mLM6H";

        console.log("📦 Creating pack checkout for:", { userId, packId, subject, priceId });

        // Encode payload for client_reference_id
        const payload = {
            userId,
            packId,
            subject,
        };
        const clientReferenceId = Buffer.from(JSON.stringify(payload)).toString("base64");

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            mode: "payment", // One-time payment
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            client_reference_id: clientReferenceId,
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard?pack_purchased=true&subject=${encodeURIComponent(subject || 'Unknown')}`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/subjects?canceled=true`,
            metadata: {
                userId,
                packId,
                subject: subject || "Unknown",
            },
        });

        console.log("✅ Pack checkout session created:", session.id);

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error("❌ Error creating pack checkout session:", error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}