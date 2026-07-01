import { NextResponse } from "next/server";
import OpenAI from "openai";
import admin from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Chat replies don't need anywhere near gpt-4o-mini's 16,384-token ceiling —
// capping here bounds worst-case cost per call and stops a runaway/repetitive
// generation from silently consuming the full output budget.
const MAX_OUTPUT_TOKENS = 2000;

// Bounds on the client-supplied conversation history. Without these, input
// tokens grow unboundedly with conversation length since (per standard chat
// pattern) the client resends full history on every turn.
const MAX_HISTORY_MESSAGES = 12;       // only the most recent N turns are sent
const MAX_MESSAGE_CHARS = 4000;        // guards against a single giant paste

// Daily per-user limits for this endpoint. Kept separate from the study-
// material generation route's limits (different feature, different usage
// pattern — this is a multi-turn chat, so limits are per-message not
// per-generation and are set higher accordingly).
const FREE_DAILY_LIMIT = 30;
const PRO_DAILY_LIMIT = 150;

function todayKey(): string {
    return new Date().toISOString().slice(0, 10);
}

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getUidFromRequest(req: Request): Promise<string | null> {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;
    const idToken = authHeader.slice(7);
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
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
        .collection("users")
        .doc(uid)
        .collection("aiTutorLimits")
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
    role: "user" | "assistant";
    content: string;
}

function isChatMessage(m: unknown): m is ChatMessage {
    return (
        !!m &&
        typeof m === "object" &&
        ((m as Record<string, unknown>).role === "user" || (m as Record<string, unknown>).role === "assistant") &&
        typeof (m as Record<string, unknown>).content === "string"
    );
}

/**
 * Validates the client-supplied history is well-formed, then bounds it:
 *  - keeps only the most recent MAX_HISTORY_MESSAGES turns (oldest dropped)
 *  - truncates any individual message beyond MAX_MESSAGE_CHARS
 * Throws a user-facing error string on malformed input.
 */
function validateAndBoundMessages(raw: unknown): ChatMessage[] {
    if (!Array.isArray(raw) || raw.length === 0) {
        throw new Error("messages must be a non-empty array");
    }

    const valid = raw.filter(isChatMessage);
    if (valid.length !== raw.length) {
        throw new Error("messages contains invalid entries — each must have role ('user'|'assistant') and string content");
    }

    const trimmed = valid.slice(-MAX_HISTORY_MESSAGES);

    return trimmed.map((m) => ({
        role: m.role,
        content: m.content.length > MAX_MESSAGE_CHARS
            ? m.content.slice(0, MAX_MESSAGE_CHARS) + "\n[...truncated]"
            : m.content,
    }));
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    // 1. Auth (checked before touching the body)
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Subscription tier
    const userSnap = await admin.firestore().collection("users").doc(uid).get();
    if (!userSnap.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = userSnap.data()!;
    const isPro = userData.subscriptionStatus === "active";

    // 3. Rate limit
    const { allowed, remaining, limit } = await checkAndIncrementLimit(uid, isPro);
    if (!allowed) {
        return NextResponse.json(
            {
                error: `Daily message limit reached (${limit}/day). ${isPro ? "Limit resets at midnight." : "Upgrade to Pro for more messages."}`,
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
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    let boundedMessages: ChatMessage[];
    try {
        boundedMessages = validateAndBoundMessages(body.messages);
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Invalid messages" },
            { status: 400 }
        );
    }

    // 5. Call OpenAI
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            max_tokens: MAX_OUTPUT_TOKENS,
            messages: [
                {
                    role: "system",
                    content: `
            You are a school assistant AI.  
            Rules:
            1. Only respond if the user's question is school-related (math, physics, chemistry, biology, history, geography, literature, science, exams, essays, homework, etc).  
            2. If the question is NOT school-related, politely decline: "I can only help with school-related questions. 📚"  
            3. Always return JSON:
            {
              "title": "string",
              "sections": [
                { "heading": "string", "content": ["bullet", "points"] }
              ]
            }
          `,
                },
                ...boundedMessages,
            ],
            response_format: { type: "json_object" },
        });

        const tokensUsed = completion.usage?.total_tokens ?? 0;

        // Badge tracking is a nice-to-have — don't let a failure here break
        // the chat response the user is waiting on.
        try {
            await checkAITutorBadges(uid);
        } catch (badgeErr) {
            console.error("Badge check failed (non-fatal):", badgeErr);
        }

        return NextResponse.json({
            allowed: true,
            data: completion.choices[0].message,
            tokensUsed,
            remaining,
        });

    } catch (err: any) {
        console.error("AI Chat Error:", err);
        return NextResponse.json({ error: err.message ?? "AI generation failed. Please try again." }, { status: 500 });
    }
}

async function checkAITutorBadges(userId: string) {
    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    const data = userSnap.data();

    const badges = data?.badges?.tutor || [];
    const aiStats = data?.stats?.aiInteractions || { total: 0, weekCount: 0, lastInteraction: null };
    const newBadges = [...badges];

    const now = new Date();
    const lastInteraction = aiStats.lastInteraction ? new Date(aiStats.lastInteraction) : null;

    const daysSinceLast = lastInteraction
        ? Math.floor((now.getTime() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const weekCount = daysSinceLast !== null && daysSinceLast <= 7 ? aiStats.weekCount + 1 : 1;

    if (weekCount >= 10 && !badges.includes("Tutor Whisperer")) {
        newBadges.push("Tutor Whisperer");
    }

    await userRef.update({
        "stats.aiInteractions": {
            total: (aiStats.total || 0) + 1,
            weekCount,
            lastInteraction: now.toISOString(),
        },
        ...(newBadges.length > badges.length && { "badges.tutor": newBadges }),
    });
}