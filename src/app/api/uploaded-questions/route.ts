import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import admin from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const client = new Anthropic();

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 3000;
// Single-question uploads should always be small (one page / one photo) —
// this is a much tighter cap than the multi-page study-material upload flow.
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

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

function stripMarkdownFences(text: string): string {
    return text.replace(/```json|```/g, '').trim();
}

interface SolvedQuestion {
    subject: string;
    topic: string;
    questionText: string;
    difficulty: 'easy' | 'medium' | 'hard';
    solution: string;
    shortAnswer: string;
}

function buildSolvePrompt(level: string): string {
    return `You are StudyCedo's AI tutor for a UK ${level} student. The attached file is a photo or PDF of an exam question or homework problem the student is stuck on.

1. Transcribe the question exactly as shown.
2. Identify the subject (e.g. "Biology", "Maths") and the specific topic (e.g. "Cell Division", "Quadratic Equations") using standard UK ${level} curriculum terminology.
3. Solve the question fully, showing clear worked steps.
4. Give a short one-sentence summary of the final answer.
5. Estimate difficulty as "easy", "medium", or "hard".

Respond ONLY with valid JSON — no markdown fences, no preamble, no trailing text:
{
  "subject": "",
  "topic": "",
  "questionText": "",
  "difficulty": "easy" | "medium" | "hard",
  "solution": "",
  "shortAnswer": ""
}`;
}

export async function POST(req: NextRequest) {
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    let body: { storagePath?: string; fileUrl?: string; contentType?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { storagePath, fileUrl, contentType } = body;
    if (!storagePath || !contentType) {
        return NextResponse.json({ error: 'Missing storagePath or contentType' }, { status: 400 });
    }

    const isImage = contentType.startsWith('image/');
    const isPdf = contentType === 'application/pdf';
    if (!isImage && !isPdf) {
        return NextResponse.json({ error: 'Only images and PDFs are supported' }, { status: 400 });
    }

    // Resolve the student's level so the AI calibrates to GCSE vs A-Level
    // terminology and difficulty.
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const userData = userDoc.data();
    const level: string = userData?.level ?? userData?.preferences?.level ?? 'GCSE';

    // Download the uploaded file from Storage (server-side, Admin SDK only).
    let buffer: Buffer;
    try {
        const bucket = admin.storage().bucket();
        const [contents] = await bucket.file(storagePath).download();
        buffer = contents;
    } catch (err) {
        console.error(`Failed to download uploaded question from "${storagePath}":`, err);
        return NextResponse.json({ error: 'Could not read the uploaded file. Please try again.' }, { status: 400 });
    }

    if (buffer.byteLength > MAX_FILE_BYTES) {
        return NextResponse.json(
            { error: `File is too large (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB). Max size is 15MB.` },
            { status: 400 }
        );
    }

    const base64Data = buffer.toString('base64');

    const contentBlock = isImage
        ? { type: 'image' as const, source: { type: 'base64' as const, media_type: contentType as any, data: base64Data } }
        : { type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64Data } };

    let solved: SolvedQuestion;
    try {
        const response = await client.messages.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            messages: [
                {
                    role: 'user',
                    content: [
                        contentBlock,
                        { type: 'text', text: buildSolvePrompt(level) },
                    ],
                },
            ],
        });

        const rawText = response.content
            .filter((b) => b.type === 'text')
            .map((b) => (b as Anthropic.TextBlock).text)
            .join('');

        solved = JSON.parse(stripMarkdownFences(rawText));
    } catch (err) {
        console.error('Failed to solve uploaded question:', err);
        return NextResponse.json(
            { error: 'Could not solve this question. Please try a clearer photo or a different file.' },
            { status: 500 }
        );
    }

    // Save to users/{uid}/uploaded_question — the collection the daily
    // study-plan generator reads from to fold this topic into future plans.
    const docRef = admin
        .firestore()
        .collection('users')
        .doc(uid)
        .collection('uploaded_question')
        .doc();

    await docRef.set({
        subject: solved.subject || 'Unknown',
        topic: solved.topic || 'General',
        questionText: solved.questionText || '',
        difficulty: solved.difficulty || 'medium',
        solution: solved.solution || '',
        shortAnswer: solved.shortAnswer || '',
        sourceType: isImage ? 'image' : 'pdf',
        storagePath,
        fileUrl: fileUrl ?? null,
        level,
        // Student can mark this as understood/practiced once ready — until
        // then, it keeps recurring in daily plan generation. See
        // generateStudyPlanForUser's uploaded_question integration.
        completed: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
        id: docRef.id,
        ...solved,
    });
}

// ── GET: list the student's uploaded-question history ─────────────────────────
export async function GET(req: NextRequest) {
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const snapshot = await admin
        .firestore()
        .collection('users')
        .doc(uid)
        .collection('uploaded_question')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

    const questions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() ?? null,
    }));

    return NextResponse.json({ questions });
}

// ── PATCH: mark a question as understood/practiced ─────────────────────────────
// Once marked completed, it stops being pulled into future daily study plans.
export async function PATCH(req: NextRequest) {
    const uid = await getUidFromRequest(req);
    if (!uid) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    let body: { id?: string; completed?: boolean };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.id) {
        return NextResponse.json({ error: 'Missing question id' }, { status: 400 });
    }

    await admin
        .firestore()
        .collection('users')
        .doc(uid)
        .collection('uploaded_question')
        .doc(body.id)
        .set({ completed: body.completed ?? true }, { merge: true });

    return NextResponse.json({ message: 'Updated' });
}