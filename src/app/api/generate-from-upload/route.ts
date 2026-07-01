import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import admin from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const client = new Anthropic();

const MAX_PDF_PAGES = 80;
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;

// ─── PDF page counter ─────────────────────────────────────────────────────────
function countPdfPages(base64Data: string): number {
    try {
        const buf = Buffer.from(base64Data, 'base64');
        const text = buf.toString('binary');
        const matches = text.match(/\/Type\s*\/Page[^s]/g);
        return matches ? matches.length : 0;
    } catch {
        return 0;
    }
}

const FREE_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT = 15;

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
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

        if (used >= limit) return { allowed: false, remaining: 0, limit };

        tx.set(
            limitRef,
            { count: FieldValue.increment(1), lastUsed: FieldValue.serverTimestamp() },
            { merge: true }
        );

        return { allowed: true, remaining: limit - used - 1, limit };
    });
}

// ─── JSON repair ──────────────────────────────────────────────────────────────
/**
 * If Claude's response was cut off mid-JSON (stop_reason === 'max_tokens'),
 * this attempts to close any open arrays/objects so JSON.parse has a chance.
 * It is a best-effort heuristic — it handles the most common truncation points.
 */
function repairTruncatedJson(raw: string): string {
    // Strip any markdown fences Claude may have included
    let text = raw.replace(/```json|```/g, '').trim();

    // Track open brackets/braces to know what needs closing
    const stack: string[] = [];
    let inString = false;
    let escape = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];

        if (escape) { escape = false; continue; }
        if (ch === '\\' && inString) { escape = true; continue; }
        if (ch === '"') { inString = !inString; continue; }
        if (inString) continue;

        if (ch === '{' || ch === '[') stack.push(ch);
        else if (ch === '}' || ch === ']') stack.pop();
    }

    // If we're still inside a string, close it
    if (inString) text += '"';

    // Remove any trailing incomplete key or value (e.g. `,"term":` with no value)
    // This catches the most common truncation pattern: a key without its value
    text = text.replace(/,\s*"[^"]*"\s*:\s*$/, '');
    // Also remove a trailing comma before we close
    text = text.replace(/,\s*$/, '');

    // Close any open arrays/objects in reverse order
    for (let i = stack.length - 1; i >= 0; i--) {
        text += stack[i] === '[' ? ']' : '}';
    }

    return text;
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

    // 3. Rate limit
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
        questionCount?: number;
    };

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { system: clientSystem, messages, difficulty, mode, questionCount = 5 } = body;

    const difficultyLabels: Record<string, string> = {
        gcse_foundation: 'GCSE Foundation',
        gcse_higher: 'GCSE Higher',
        a_level: 'A Level',
    };

    const modeText: Record<string, string> = {
        both:       `Create BOTH 3-5 study note sections AND ${questionCount} MCQ questions.`,
        materials:  `Create 3-5 detailed study note sections only.`,
        questions:  `Create ${questionCount} MCQ quiz questions only.`,
        flashcards: `Create ${questionCount} flashcard pairs (term + definition) only.`,
    };

    // Use client-supplied system prompt if present, otherwise build one server-side
    const systemPrompt = clientSystem ?? `You are StudyCedo's AI tutor for UK ${difficultyLabels[difficulty] ?? 'GCSE Higher'} students. ${modeText[mode] ?? ''}
Respond ONLY with valid, COMPLETE JSON — no markdown, no backticks, no preamble, no trailing text.
CRITICAL: You MUST close every JSON array and object. The response must end with }}.
Schema: {"subject":"","topics":[],"materials":[{"title":"","content":""}],"questions":[{"text":"","choices":[{"option":"A","text":"","isCorrect":false}],"explanation":""}],"flashcards":[{"term":"","definition":""}]}
Return empty arrays [] for unused modes. Calibrate to ${difficultyLabels[difficulty] ?? 'GCSE Higher'}.`;

    // 5. Validate PDF page count
    for (const msg of messages) {
        const parts = Array.isArray(msg.content) ? msg.content : [];
        for (const part of parts) {
            if (
                part &&
                typeof part === 'object' &&
                (part as unknown as Record<string, unknown>).type === 'document'
            ) {
                const docPart = part as { type: string; source: { type: string; media_type: string; data: string } };
                if (docPart.source?.media_type === 'application/pdf' && docPart.source?.data) {
                    const pageCount = countPdfPages(docPart.source.data);
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
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            messages,
        });

        const rawText = response.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as Anthropic.TextBlock).text)
            .join('');

        // 7. Detect truncation
        if (response.stop_reason === 'max_tokens') {
            console.warn(`[generate] Response truncated for uid=${uid}, mode=${mode}. Attempting JSON repair.`);

            const repaired = repairTruncatedJson(rawText);

            // Verify the repair actually produced valid JSON before sending it
            try {
                JSON.parse(repaired);
                // Repair succeeded — return it with a warning flag so the client can show a notice
                return NextResponse.json(
                    { content: repaired, remaining, truncated: true },
                    { status: 200 }
                );
            } catch {
                // Repair failed — tell the client to try with fewer items/shorter notes
                return NextResponse.json(
                    {
                        error: 'The generated content was too long to complete. Try reducing the number of questions, or paste a shorter excerpt of your notes.',
                        truncated: true,
                    },
                    { status: 422 }
                );
            }
        }

        return NextResponse.json({ content: rawText, remaining }, { status: 200 });

    } catch (err: unknown) {
        console.error('Anthropic API error:', err);

        let message = 'AI generation failed. Please try again.';
        if (err && typeof err === 'object') {
            const apiErr = err as { error?: { message?: string }; message?: string };
            if (apiErr.error?.message) message = apiErr.error.message;
            else if (apiErr.message) message = apiErr.message;
        }

        return NextResponse.json({ error: message }, { status: 500 });
    }
}