import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import admin from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const CREDIT_PACK_SIZE = 10;
const CREDIT_PACK_PRICE_PENCE = 499;
const MAX_PACKS_PER_PURCHASE = 10;

export async function POST(req: NextRequest) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    let body: { packQuantity?: number };
    try {
        body = await req.json();
    } catch {
        body = {};
    }

    const packQuantity = Math.min(
        MAX_PACKS_PER_PURCHASE,
        Math.max(1, Math.floor(body.packQuantity ?? 1))
    );

    const origin = req.nextUrl.origin;

    // client_reference_id alone isn't enough context for the webhook to act
    // on (it needs to know this is specifically an Ask AI credit purchase,
    // as opposed to any other one-off Stripe Checkout Session this app
    // might create), so the credit amount and type both go in metadata too.
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        client_reference_id: decoded.uid,
        customer_email: decoded.email,
        line_items: [
            {
                price_data: {
                    currency: 'gbp',
                    unit_amount: CREDIT_PACK_PRICE_PENCE,
                    product_data: {
                        name: `${CREDIT_PACK_SIZE} Ask AI upload credits`,
                        description: 'Extra Ask AI question uploads for StudyCedo — never expire.',
                    },
                },
                quantity: packQuantity,
            },
        ],
        metadata: {
            uid: decoded.uid,
            type: 'ask_ai_credits',
            creditsPerPack: String(CREDIT_PACK_SIZE),
            packQuantity: String(packQuantity),
        },
        success_url: `${origin}dashboard?tab=ask-ai?creditPurchase=success`,
        cancel_url: `${origin}/dashboard?tab=ask-ai?creditPurchase=cancelled`,
    });

    return NextResponse.json({ url: session.url });
}