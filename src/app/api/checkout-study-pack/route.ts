import {NextResponse} from "next/server";
import admin from "../../../lib/firebaseAdmin";
import {stripe} from "@/app/api/create-subscription/route";

export async function POST(req: Request) {
    try {
        const idToken = req.headers.get("Authorization")?.split("Bearer ")[1];
        if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { packId } = await req.json();
        if (!packId) return NextResponse.json({ error: "Missing packId" }, { status: 400 });

        const packDoc = await admin.firestore().collection("study_packs").doc(packId).get();
        if (!packDoc.exists) return NextResponse.json({ error: "Study pack not found" }, { status: 404 });

        const packData = packDoc.data();
        const price = packData?.price * 100 || 0;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: packData?.subject,
                        },
                        unit_amount: price,
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard?tab=studypack`,
            cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/study-packs?canceled=true`,
            metadata: {
                userId,
                packId,
            },
        });

        return NextResponse.json({ sessionId: session.id });
    } catch (error) {
        console.error("Error creating checkout session:", error);
        return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
    }
}