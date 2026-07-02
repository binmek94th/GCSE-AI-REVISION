import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import admin from '@/lib/firebaseAdmin';

// ⚠️ Assumption: no shared Stripe client was visible to me. If you already
// have one (e.g. `@/lib/stripe`), replace this with that import instead of
// instantiating a second client here.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Credit pack definitions — adjust pricing/quantities to match what you
// actually want to sell. Amount is in the smallest currency unit (pence).
const CREDIT_PACKS: Record<string, { credits: number; amount: number; label: string }> = {
    pack_5:  { credits: 5,  amount: 499,  label: '5 upload credits' },
    pack_15: { credits: 15, amount: 999,  label: '15 upload credits' },
};

async function getUidFromRequest(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7);
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        return decoded.uid;
    } catch {
        return null;
    }
}

export async function POST(req: NextRequest) {
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    let body: { packId?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const packId = body.packId ?? 'pack_5';
    const pack = CREDIT_PACKS[packId];
    if (!pack) {
        return NextResponse.json({ error: 'Unknown credit pack' }, { status: 400 });
    }

    const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? '';

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        unit_amount: pack.amount,
                        product_data: {
                            name: pack.label,
                            description: 'StudyCedo upload credits — extra document uploads beyond your monthly free limit.',
                        },
                    },
                    quantity: 1,
                },
            ],
            // ✅ This metadata is what your Stripe webhook needs to read on
            // `checkout.session.completed` to know which user to credit and
            // how many credits to add. See the webhook snippet below.
            metadata: {
                uid,
                credits: String(pack.credits),
                packId,
            },
            success_url: `${origin}/dashboard?tab=upload&creditsPurchase=success`,
            cancel_url: `${origin}/dashboard?tab=upload&creditsPurchase=cancelled`,
        });

        return NextResponse.json({ url: session.url }, { status: 200 });
    } catch (err) {
        console.error('Failed to create credit-purchase checkout session:', err);
        return NextResponse.json({ error: 'Failed to start checkout. Please try again.' }, { status: 500 });
    }
}