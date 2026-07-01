import { NextRequest, NextResponse } from 'next/server';
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import admin from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const client = new Anthropic();

const MAX_PDF_PAGES = 80;
// Hard cap on raw PDF bytes before we even attempt to parse. Prevents wasting
// time/memory on pathological uploads; well above what a legitimate 80-page
// revision PDF should be.
const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50MB

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;
const FILES_API_BETA = 'files-api-2025-04-14';

const FREE_DAILY_LIMIT = 3;
const PRO_DAILY_LIMIT = 15;

// ─── Accurate PDF page counter ─────────────────────────────────────────────────
/**
 * Parses the PDF structure with pdf-lib to get a real page count.
 * Replaces the old regex-on-raw-bytes approach, which silently undercounted
 * (often returning 0) on PDFs using compressed object streams / xref streams —
 * common output from Word, Google Docs, and most modern PDF producers.
 *
 * Fails CLOSED: if the PDF can't be parsed at all (corrupted, encrypted with
 * restrictions pdf-lib can't work around, etc.), we reject rather than let it
 * through — the old behavior of defaulting to a page count of 0 on parse
 * failure meant unparseable files bypassed the limit entirely.
 */
async function getAccuratePdfPageCount(buffer: Buffer): Promise<number> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return doc.getPageCount();
}

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

// ─── Document source types ─────────────────────────────────────────────────────
// Two ways a client can supply a PDF:
//  1. base64 (existing) — fine for small inline docs, but bloats the request
//     body ~33% and is subject to platform body-size limits (e.g. Vercel's
//     4.5MB serverless limit) well before hitting MAX_PDF_PAGES.
//  2. firebase_storage (new) — client uploads to Storage first (same pattern
//     already used elsewhere in the app) and sends just the path. Server
//     downloads directly and forwards to Anthropic's Files API. Avoids the
//     body-size ceiling entirely since the request payload is just a string.
interface Base64DocumentSource {
    type: 'base64';
    media_type: string;
    data: string;
}

interface FirebaseStorageDocumentSource {
    type: 'firebase_storage';
    path: string;
    media_type: string;
}

interface FileDocumentSource {
    type: 'file';
    file_id: string;
}

type DocumentPart = {
    type: 'document';
    source: Base64DocumentSource | FirebaseStorageDocumentSource | FileDocumentSource;
    [key: string]: unknown;
};

// Everything else a message part could legitimately be (text, images, etc.)
// We don't care about the exact shape here — we pass these through untouched.
interface OtherContentPart {
    type: string;
    [key: string]: unknown;
}

type IncomingContentPart = DocumentPart | OtherContentPart;

// Local shape for the REQUEST BODY only — deliberately NOT Anthropic.MessageParam.
// The client can send source shapes (firebase_storage) that the SDK's own
// MessageParam type knows nothing about. Typing incoming messages against the
// SDK type causes TypeScript to narrow `part.source` as an intersection of the
// SDK's own Base64PDFSource and our custom Base64DocumentSource when using a
// type guard — silently hiding fields like `path` that only exist on ours.
// We stay in this local shape until the very end, then cast once for the
// actual API call.
interface IncomingMessage {
    role: 'user' | 'assistant';
    content: string | IncomingContentPart[];
}

function isDocumentPart(part: IncomingContentPart): part is DocumentPart {
    return part.type === 'document';
}

// ─── Resolve + validate every document part in the incoming messages ──────────
/**
 * Walks all messages, and for each PDF document part:
 *  - downloads the bytes (from Storage, or decodes base64)
 *  - runs the accurate page-count check against MAX_PDF_PAGES
 *  - if the source came from Storage, uploads it to Anthropic's Files API and
 *    rewrites the part to reference the resulting file_id instead of raw bytes
 *
 * Throws a `ValidationError` (with a user-facing message) on any failure, so
 * the route handler can return a clean 400 rather than letting a parse
 * exception surface as a raw 500.
 */
class ValidationError extends Error {}

async function resolveDocumentParts(
    messages: IncomingMessage[]
): Promise<{ messages: IncomingMessage[]; usedFilesApi: boolean }> {
    let usedFilesApi = false;
    const bucket = admin.storage().bucket();

    for (const msg of messages) {
        if (!Array.isArray(msg.content)) continue;

        for (let i = 0; i < msg.content.length; i++) {
            const part = msg.content[i];
            if (!isDocumentPart(part)) continue;
            if (part.source.type === 'file') continue; // already resolved

            const isPdf =
                (part.source.type === 'base64' || part.source.type === 'firebase_storage') &&
                part.source.media_type === 'application/pdf';

            if (!isPdf) continue;

            let buffer: Buffer;

            if (part.source.type === 'base64') {
                buffer = Buffer.from(part.source.data, 'base64');
            } else {
                // firebase_storage
                const { path } = part.source;
                try {
                    const [contents] = await bucket.file(path).download();
                    buffer = contents;
                } catch (err) {
                    console.error(`Failed to download PDF from storage path "${path}":`, err);
                    throw new ValidationError(
                        'Could not read the uploaded PDF from storage. Please try uploading again.'
                    );
                }
            }

            if (buffer.byteLength > MAX_PDF_BYTES) {
                throw new ValidationError(
                    `Your PDF is too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Please upload a smaller file.`
                );
            }

            let pageCount: number;
            try {
                pageCount = await getAccuratePdfPageCount(buffer);
            } catch (err) {
                console.error('Failed to parse PDF for page count:', err);
                throw new ValidationError(
                    'Your PDF could not be read — it may be corrupted or password-protected. Please try a different file.'
                );
            }

            if (pageCount > MAX_PDF_PAGES) {
                throw new ValidationError(
                    `Your PDF has ${pageCount} pages — the maximum is ${MAX_PDF_PAGES}. Please upload a shorter document or paste the key sections as text instead.`
                );
            }

            // For storage-sourced PDFs, hand the bytes to Anthropic's Files API
            // and rewrite the part to reference the file_id. Base64 parts are
            // left as-is (already small enough to have arrived inline) but have
            // now had their page count verified accurately.
            if (part.source.type === 'firebase_storage') {
                try {
                    const uploaded = await client.beta.files.upload({
                        file: await toFile(buffer, 'document.pdf', { type: 'application/pdf' }),
                    });
                    msg.content[i] = {
                        type: 'document',
                        source: { type: 'file', file_id: uploaded.id },
                    };
                    usedFilesApi = true;
                } catch (err) {
                    console.error('Failed to upload PDF to Anthropic Files API:', err);
                    throw new ValidationError('Failed to process your PDF. Please try again.');
                }
            }
        }
    }

    return { messages, usedFilesApi };
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
        messages: IncomingMessage[];
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

    // 5. Validate + resolve PDF document parts (accurate page count; Files API
    // upload for storage-sourced PDFs to sidestep base64 body-size limits)
    let resolvedMessages: IncomingMessage[];
    let usedFilesApi = false;
    try {
        const result = await resolveDocumentParts(messages);
        resolvedMessages = result.messages;
        usedFilesApi = result.usedFilesApi;
    } catch (err) {
        if (err instanceof ValidationError) {
            return NextResponse.json({ error: err.message }, { status: 400 });
        }
        console.error('Unexpected error resolving document parts:', err);
        return NextResponse.json({ error: 'Failed to process the uploaded document.' }, { status: 500 });
    }

    // 6. Call Claude
    try {
        const response = await client.beta.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            system: systemPrompt,
            // Cast at the boundary: resolvedMessages is now guaranteed to only
            // contain source shapes the SDK understands ('base64' or 'file'),
            // since resolveDocumentParts rewrites every 'firebase_storage'
            // source before returning. Everything else (text parts, etc.) was
            // passed through untouched from the client.
            messages: resolvedMessages as unknown as Anthropic.MessageParam[],
            // Only needed when a message references a file_id, but harmless to
            // include unconditionally — the beta flag is a no-op otherwise.
            betas: usedFilesApi ? [FILES_API_BETA] : undefined,
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