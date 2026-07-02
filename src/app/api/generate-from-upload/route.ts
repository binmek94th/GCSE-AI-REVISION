import { NextRequest, NextResponse } from 'next/server';
import Anthropic, { toFile } from '@anthropic-ai/sdk';
import { PDFDocument } from 'pdf-lib';
import admin from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const client = new Anthropic();

const MAX_PDF_PAGES = 80;
const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50MB

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;
const FILES_API_BETA = 'files-api-2025-04-14';

// ✅ Monthly upload limit (replaces the old daily Free/Pro limit for this
// route). Flat 5/month for every user; beyond that, purchased credits are
// consumed one-per-upload. Adjust MONTHLY_UPLOAD_LIMIT if Pro users should
// get a higher baseline — currently flat for all tiers per this request.
const MONTHLY_UPLOAD_LIMIT = 5;

// ─── Accurate PDF page counter ─────────────────────────────────────────────────
async function getAccuratePdfPageCount(buffer: Buffer): Promise<number> {
    const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    return doc.getPageCount();
}

function monthKey(): string {
    // "YYYY-MM" — one usage doc per calendar month
    return new Date().toISOString().slice(0, 7);
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

// ─── Monthly upload allowance check + consume ──────────────────────────────────
/**
 * Checks the user's monthly upload usage. If under MONTHLY_UPLOAD_LIMIT,
 * consumes one free monthly upload. If the monthly limit is exhausted,
 * falls back to consuming one purchased credit (users/{uid}.uploadCredits)
 * if available. Fails closed (not allowed) only if both are exhausted.
 */
async function checkAndConsumeUploadAllowance(uid: string): Promise<{
    allowed: boolean;
    usedCredit: boolean;
    remainingThisMonth: number;
    credits: number;
}> {
    const limitRef = admin.firestore()
        .collection('users')
        .doc(uid)
        .collection('uploadLimits')
        .doc(monthKey());

    const userRef = admin.firestore().collection('users').doc(uid);

    return admin.firestore().runTransaction(async (tx) => {
        const [limitSnap, userSnap] = await Promise.all([tx.get(limitRef), tx.get(userRef)]);

        const used = limitSnap.exists ? (limitSnap.data()!.count as number) : 0;
        const credits = userSnap.exists ? (userSnap.data()!.uploadCredits as number) || 0 : 0;

        if (used < MONTHLY_UPLOAD_LIMIT) {
            tx.set(
                limitRef,
                { count: FieldValue.increment(1), lastUsed: FieldValue.serverTimestamp() },
                { merge: true }
            );
            return {
                allowed: true,
                usedCredit: false,
                remainingThisMonth: MONTHLY_UPLOAD_LIMIT - used - 1,
                credits,
            };
        }

        if (credits > 0) {
            tx.set(
                limitRef,
                { count: FieldValue.increment(1), lastUsed: FieldValue.serverTimestamp() },
                { merge: true }
            );
            tx.update(userRef, { uploadCredits: FieldValue.increment(-1) });
            return {
                allowed: true,
                usedCredit: true,
                remainingThisMonth: 0,
                credits: credits - 1,
            };
        }

        return { allowed: false, usedCredit: false, remainingThisMonth: 0, credits: 0 };
    });
}

/** Read-only status check (no consumption) — used by GET for the frontend to show usage before generating. */
async function getUploadAllowanceStatus(uid: string): Promise<{
    remainingThisMonth: number;
    usedThisMonth: number;
    credits: number;
    limit: number;
}> {
    const limitRef = admin.firestore()
        .collection('users')
        .doc(uid)
        .collection('uploadLimits')
        .doc(monthKey());

    const userRef = admin.firestore().collection('users').doc(uid);

    const [limitSnap, userSnap] = await Promise.all([limitRef.get(), userRef.get()]);
    const used = limitSnap.exists ? (limitSnap.data()!.count as number) : 0;
    const credits = userSnap.exists ? (userSnap.data()!.uploadCredits as number) || 0 : 0;

    return {
        remainingThisMonth: Math.max(0, MONTHLY_UPLOAD_LIMIT - used),
        usedThisMonth: used,
        credits,
        limit: MONTHLY_UPLOAD_LIMIT,
    };
}

// ─── JSON repair ──────────────────────────────────────────────────────────────
function repairTruncatedJson(raw: string): string {
    let text = raw.replace(/```json|```/g, '').trim();

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

    if (inString) text += '"';

    text = text.replace(/,\s*"[^"]*"\s*:\s*$/, '');
    text = text.replace(/,\s*$/, '');

    for (let i = stack.length - 1; i >= 0; i--) {
        text += stack[i] === '[' ? ']' : '}';
    }

    return text;
}

// ─── Document source types ─────────────────────────────────────────────────────
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

interface OtherContentPart {
    type: string;
    [key: string]: unknown;
}

type IncomingContentPart = DocumentPart | OtherContentPart;

interface IncomingMessage {
    role: 'user' | 'assistant';
    content: string | IncomingContentPart[];
}

function isDocumentPart(part: IncomingContentPart): part is DocumentPart {
    return part.type === 'document';
}

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
            if (part.source.type === 'file') continue;

            const isPdf =
                (part.source.type === 'base64' || part.source.type === 'firebase_storage') &&
                part.source.media_type === 'application/pdf';

            if (!isPdf) continue;

            let buffer: Buffer;

            if (part.source.type === 'base64') {
                buffer = Buffer.from(part.source.data, 'base64');
            } else {
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

// ─── GET handler — read-only usage/credit status for the frontend ─────────────
export async function GET(req: NextRequest) {
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const status = await getUploadAllowanceStatus(uid);
    return NextResponse.json(status, { status: 200 });
}

// ─── POST handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    // 1. Auth
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // 2. Confirm user exists
    const userSnap = await admin.firestore().collection('users').doc(uid).get();
    if (!userSnap.exists) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Monthly upload limit + credit fallback
    const { allowed, usedCredit, remainingThisMonth, credits } = await checkAndConsumeUploadAllowance(uid);
    if (!allowed) {
        return NextResponse.json(
            {
                error: `You've used your ${MONTHLY_UPLOAD_LIMIT} free uploads this month and have no credits left.`,
                limitReached: true,
                limit: MONTHLY_UPLOAD_LIMIT,
                credits: 0,
                needsCredits: true,
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

    const systemPrompt = clientSystem ?? `You are StudyCedo's AI tutor for UK ${difficultyLabels[difficulty] ?? 'GCSE Higher'} students. ${modeText[mode] ?? ''}
Respond ONLY with valid, COMPLETE JSON — no markdown, no backticks, no preamble, no trailing text.
CRITICAL: You MUST close every JSON array and object. The response must end with }}.
Schema: {"subject":"","topics":[],"materials":[{"title":"","content":""}],"questions":[{"text":"","choices":[{"option":"A","text":"","isCorrect":false}],"explanation":""}],"flashcards":[{"term":"","definition":""}]}
Return empty arrays for unused modes. Calibrate to ${difficultyLabels[difficulty] ?? 'GCSE Higher'}.`;

    // 5. Validate + resolve PDF document parts
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
            messages: resolvedMessages as unknown as Anthropic.MessageParam[],
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

            try {
                JSON.parse(repaired);
                return NextResponse.json(
                    { content: repaired, remainingThisMonth, usedCredit, credits, truncated: true },
                    { status: 200 }
                );
            } catch {
                return NextResponse.json(
                    {
                        error: 'The generated content was too long to complete. Try reducing the number of questions, or paste a shorter excerpt of your notes.',
                        truncated: true,
                    },
                    { status: 422 }
                );
            }
        }

        return NextResponse.json(
            { content: rawText, remainingThisMonth, usedCredit, credits },
            { status: 200 }
        );

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