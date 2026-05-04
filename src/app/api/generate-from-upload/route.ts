import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import admin from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const client = new Anthropic();

const MAX_PDF_PAGES = 80; // stay well under Anthropic's 100-page hard limit
const MODEL = 'claude-sonnet-4-6';

// ─── PDF page counter (no extra deps) ─────────────────────────────────────────
// Counts /Type /Page entries in raw PDF bytes — fast, no dependency needed.
function countPdfPages(base64Data: string): number {
    try {
        const buf = Buffer.from(base64Data, 'base64');
        const text = buf.toString('binary');
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        return matches ? matches.length : 0;
    } catch {
        return 0; // if we can't count, let Claude surface its own error
    }
}

const FREE_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT = 15;

function todayKey(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

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

// ─── Rate limit check + increment ─────────────────────────────────────────────

async function checkAndIncrementLimit(uid: string, isPro: boolean): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
}> {
    const limit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
    const limitRef = admin.firestore()
        .collection('users')
        .doc(uid)
        .collection('generationLimits')
        .doc(todayKey());

    return admin.firestore().runTransaction(async (tx) => {
        const snap = await tx.get(limitRef);
        const used = snap.exists ? (snap.data()!.count as number) : 0;

        if (used >= limit) {
            return { allowed: false, remaining: 0, limit };
        }

        tx.set(
            limitRef,
            { count: FieldValue.increment(1), lastUsed: FieldValue.serverTimestamp() },
            { merge: true }
        );

        return { allowed: true, remaining: limit - used - 1, limit };
    });
}

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    // 1. Auth
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // 2. Check subscription tier
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    if (!userSnap.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data()!;
    const isPro = userData.subscriptionStatus === 'active';

    // 3. Rate limit (atomic transaction)
    const { allowed, remaining, limit } = await checkAndIncrementLimit(uid, isPro);

    if (!allowed) {
        return NextResponse.json(
            {
                error: `Daily generation limit reached (${limit}/day). ${isPro ? 'Limit resets at midnight.' : 'Upgrade to Pro for more generations.'}`,
                limitReached: true,
                limit,
            },
            { status: 429 }
        );
    }

    // 4. Parse body
    let body: {
        system?: string;
        messages: Anthropic.MessageParam[];
        difficulty: string;
        mode: string;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { system: clientSystem, messages, difficulty } = body;

    const difficultyLabels: Record<string, string> = {
        gcse_foundation: 'GCSE Foundation',
        gcse_higher: 'GCSE Higher',
        a_level: 'A Level',
    };

    // Use the system prompt built on the client — it already has mode + question count baked in
    const systemPrompt = clientSystem ?? `You are StudyCedo's AI tutor for UK ${difficultyLabels[difficulty] ?? 'GCSE Higher'} students. Respond ONLY with valid JSON. No markdown. Schema: {"subject":"","topics":[],"materials":[{"title":"","content":""}],"questions":[{"text":"","choices":[{"option":"A","text":"","isCorrect":false}],"explanation":""}],"flashcards":[{"term":"","definition":""}]} Return empty arrays for unused modes.`;

    // 5. Validate PDF page count before sending to Claude
    for (const msg of messages) {
        const parts = Array.isArray(msg.content) ? msg.content : [];
        for (const part of parts) {
            if (
                part &&
                typeof part === 'object' &&
                (part as unknown as Record<string, unknown>).type === 'document'
            ) {
                const doc = part as { type: string; source: { type: string; media_type: string; data: string } };
                if (doc.source?.media_type === 'application/pdf' && doc.source?.data) {
                    const pageCount = countPdfPages(doc.source.data);
                    if (pageCount > MAX_PDF_PAGES) {
                        return NextResponse.json(
                            {
                                error: `Your PDF has ${pageCount} pages — the maximum is ${MAX_PDF_PAGES}. Please upload a shorter document or paste the key sections as text instead.`,
                            },
                            { status: 400 }
                        );
                    }
                }
            }
        }
    }

    // 6. Call Claude
    try {
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: 4000,
            system: systemPrompt,
            messages,
        });

        const result = response.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as Anthropic.TextBlock).text)
            .join('');

        return NextResponse.json({ content: result, remaining }, { status: 200 });
    } catch (err: unknown) {
        console.error('Anthropic API error:', err);

        // Surface the actual Anthropic error message so the client gets a useful description
        let message = 'AI generation failed. Please try again.';
        if (err && typeof err === 'object') {
            const apiErr = err as { error?: { message?: string }; message?: string };
            if (apiErr.error?.message) message = apiErr.error.message;
            else if (apiErr.message) message = apiErr.message;
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}