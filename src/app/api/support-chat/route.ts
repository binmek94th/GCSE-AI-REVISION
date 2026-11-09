import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1000;

// Bounds on the client-supplied conversation history. Without these, input
// tokens (and cost) scale unboundedly with how long the support chat runs.
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4000;

// Rate limits, the same for every signed-in user (no free/pro tiers). Separate
// from the AI tutor and study-generation limits — this is a distinct feature
// with its own usage pattern.
//  - Daily cap: bounds the total cost one account can run up in a day.
//  - Burst limit: at most BURST_LIMIT messages in any BURST_WINDOW_MS, which stops
//    a script (or a stuck retry loop) from spending the whole daily cap in seconds.
const DAILY_LIMIT = 30;
const BURST_LIMIT = 5;
const BURST_WINDOW_MS = 60_000;

const SYSTEM_PROMPT = `You are the StudyCedo support assistant — a friendly, knowledgeable helper for students aged 13–18 and their parents using the StudyCedo GCSE AI revision platform.

ABOUT StudyCedo:
- An AI-powered GCSE revision platform for students aged 13–18
- Subjects: Maths, Biology, Chemistry, Physics, English, Art & Design, Drama, Music, Geography, PE and more
- Exam boards supported: AQA, OCR, Edexcel, WJEC
- Features: AI tutor chat, personalised study plans, quizzes, progress tracking, mock tests, past paper questions
- Pricing: £16.99/month OR £89/year (saves ~56% vs monthly)
- Free trial available before subscribing

YOUR ROLE — Handle these yourself (do NOT escalate):
1. LOGIN ISSUES: Help with password resets (Settings → Forgot Password), email verification, browser cache clears, incognito mode suggestion, account not found
2. ONBOARDING CONFUSION: Explain how to pick subjects, select exam board, complete onboarding quiz, navigate the dashboard
3. BILLING FAQs: Explain £16.99/month and £89/year plans, what's included, how to upgrade/downgrade, cancellation steps (Settings → Subscription → Cancel)
4. AI TUTOR QUESTIONS: Explain how to use the AI tutor, what it can help with (explanations, practice questions, exam technique), subject coverage, limitations
5. STUDY PLAN QUESTIONS: Explain how personalised study plans are generated, how to adjust them, what daily/weekly plans include, how progress is tracked
6. FEATURE EXPLANATIONS: Mock tests, quizzes, past paper questions, progress tracking, subject packs

ESCALATE ONLY for (flag clearly):
- Refund requests → "I'll connect you with our billing team"
- Bugs that completely block access → "I'll raise this with our tech team right away"
- Safeguarding or abuse concerns → immediately refer to safeguarding contact
- Angry parent or school/academy inquiries → "I'll have a senior team member contact you"

TONE & STYLE:
- Warm, encouraging, concise. You are talking to GCSE students and parents.
- Use bullet points for steps or lists
- Keep responses under 120 words unless a detailed walkthrough is needed
- Never be dismissive. Students are often stressed about exams.

ESCALATION FORMAT:
If you must escalate, end your response with exactly this on its own line (no markdown):
ESCALATE:{"reason":"<short reason>","contact":"support@StudyCedo.com"}

If NOT escalating, do not include any ESCALATE tag.`;

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getUidFromRequest(req: NextRequest): Promise<string | null> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    const idToken = authHeader.slice(7);
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        return decoded.uid;
    } catch {
        return null;
    }
}

// ─── Rate limit check + increment ─────────────────────────────────────────────
function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

// A string `status` (not a true/false field) so TypeScript can narrow the union however strict the project settings are.
type LimitResult =
    | { status: 'ok'; remaining: number; limit: number }
    | { status: 'daily'; limit: number }
    | { status: 'burst'; retryAfterSeconds: number };

// One document per user per day holds both counters, and a transaction checks and
// updates them together, so concurrent requests can't slip past either limit.
// A blocked request never uses up any of the allowance.
async function checkAndIncrementLimit(uid: string): Promise<LimitResult> {
    const limitRef = admin.firestore()
        .collection('users')
        .doc(uid)
        .collection('supportChatLimits')
        .doc(todayKey());
    const now = Date.now();

    return admin.firestore().runTransaction(async (tx): Promise<LimitResult> => {
        const snap = await tx.get(limitRef);
        const data = snap.exists ? snap.data()! : {};
        const used = (data.count as number | undefined) ?? 0;
        const windowStart = (data.windowStart as number | undefined) ?? 0;
        const windowCount = (data.windowCount as number | undefined) ?? 0;

        if (used >= DAILY_LIMIT) {
            return { status: 'daily', limit: DAILY_LIMIT };
        }

        // Fixed one-minute window: it starts with the first message and resets once it has passed.
        const inWindow = now - windowStart < BURST_WINDOW_MS;
        if (inWindow && windowCount >= BURST_LIMIT) {
            const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + BURST_WINDOW_MS - now) / 1000));
            return { status: 'burst', retryAfterSeconds };
        }

        tx.set(
            limitRef,
            {
                count: used + 1,
                windowStart: inWindow ? windowStart : now,
                windowCount: inWindow ? windowCount + 1 : 1,
                lastUsed: FieldValue.serverTimestamp(),
            },
            { merge: true }
        );

        return { status: 'ok', remaining: DAILY_LIMIT - used - 1, limit: DAILY_LIMIT };
    });
}

// ─── Message validation + bounding ─────────────────────────────────────────────
interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

function isChatMessage(m: unknown): m is ChatMessage {
    return (
        !!m &&
        typeof m === 'object' &&
        ((m as Record<string, unknown>).role === 'user' || (m as Record<string, unknown>).role === 'assistant') &&
        typeof (m as Record<string, unknown>).content === 'string'
    );
}

function validateAndBoundMessages(raw: unknown): ChatMessage[] {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error('messages must be a non-empty array');
    }

    const valid = raw.filter(isChatMessage);
    if (valid.length !== raw.length) {
        throw new Error("messages contains invalid entries — each must have role ('user'|'assistant') and string content");
    }

    // Anthropic requires the first message to have role 'user'. If truncating
    // history leaves an 'assistant' message first, drop it.
    let trimmed = valid.slice(-MAX_HISTORY_MESSAGES);
    while (trimmed.length > 0 && trimmed[0].role !== 'user') {
        trimmed = trimmed.slice(1);
    }
    if (trimmed.length === 0) {
        throw new Error('messages must contain at least one user message');
    }

    return trimmed.map((m) => ({
        role: m.role,
        content: m.content.length > MAX_MESSAGE_CHARS
            ? m.content.slice(0, MAX_MESSAGE_CHARS) + '\n[...truncated]'
            : m.content,
    }));
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    // 1. Auth
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Rate limit (same for everyone)
    const result = await checkAndIncrementLimit(uid);
    if (result.status === 'burst') {
        return NextResponse.json(
            {
                error: `You're sending messages too quickly. Please wait ${result.retryAfterSeconds} seconds and try again.`,
                rateLimited: true,
                retryAfterSeconds: result.retryAfterSeconds,
            },
            { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
        );
    }
    if (result.status === 'daily') {
        return NextResponse.json(
            {
                error: `Daily support chat limit reached (${result.limit}/day). Please try again tomorrow.`,
                limitReached: true,
                limit: result.limit,
            },
            { status: 429 }
        );
    }
    const remaining = result.remaining;

    // 3. Parse + validate body
    let body: { messages: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    let boundedMessages: ChatMessage[];
    try {
        boundedMessages = validateAndBoundMessages(body.messages);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Invalid messages' },
            { status: 400 }
        );
    }

    // 4. Call Claude
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY!,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                system: SYSTEM_PROMPT,
                messages: boundedMessages,
            }),
        });

        const data = await response.json();

        // Log failures for debugging, but never log the response body
        // unconditionally in production — it contains raw student/parent
        // conversation content from users aged 13-18.
        if (!response.ok) {
            console.error('Anthropic API error:', data?.error ?? data);
            return NextResponse.json({ error: 'AI service error' }, { status: 500 });
        }
        if (process.env.NODE_ENV !== 'production') {
            console.log(data);
        }

        const reply = data.content?.[0]?.text ?? "I'm sorry, something went wrong. Please try again.";
        return NextResponse.json({ reply, remaining });
    } catch (err) {
        console.error('Support chat error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}