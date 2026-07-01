import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1000;

// Bounds on the client-supplied conversation history. Without these, input
// tokens (and cost) scale unboundedly with how long the support chat runs.
const MAX_HISTORY_MESSAGES = 12;
const MAX_MESSAGE_CHARS = 4000;

// Daily per-user limits. Separate collection from the AI tutor and study-
// generation limits — this is a distinct feature with its own usage pattern.
const FREE_DAILY_LIMIT = 20;
const PRO_DAILY_LIMIT = 60;

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

async function checkAndIncrementLimit(uid: string, isPro: boolean): Promise<{
    allowed: boolean;
    remaining: number;
    limit: number;
}> {
    const limit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;
    const limitRef = admin.firestore()
        .collection('users')
        .doc(uid)
        .collection('supportChatLimits')
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

    // 2. Subscription tier
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
                error: `Daily support chat limit reached (${limit}/day). ${isPro ? 'Limit resets at midnight.' : 'Upgrade to Pro for more messages.'}`,
                limitReached: true,
                limit,
            },
            { status: 429 }
        );
    }

    // 4. Parse + validate body
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

    // 5. Call Claude
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