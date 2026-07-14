import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { sendBrevoEmail } from '@/lib/brevo';

const CODE_EXPIRY_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_REQUESTS_PER_DAY = 5;

/** Sanitise an email into a safe Firestore document ID (mirrors the login page's helper). */
function emailToDocId(email: string): string {
    return email.toLowerCase().trim().replace(/\./g, '_dot_').replace(/@/g, '_at_');
}

function generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

function buildResetCodeEmailHtml(name: string, code: string): string {
    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 12px;">Reset your password</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Hi ${name || 'there'},
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            We received a request to reset your StudyCedo password. Enter this code to continue:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; background: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 10px; padding: 16px 32px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0F172A;">
                ${code}
            </span>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.6;">
            This code expires in ${CODE_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email — your password won't be changed.
        </p>
    </div>`;
}

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
        return NextResponse.json({ error: 'Missing email' }, { status: 400 });
    }

    const db = admin.firestore();
    const rateLimitDocId = emailToDocId(email);
    const rateLimitRef = db.collection('password_reset_requests').doc(rateLimitDocId);

    // ✅ Rate limiting — applied BEFORE checking whether the account exists,
    // and using the exact same code path/response regardless of existence,
    // so the rate-limit response itself can never be used to enumerate
    // valid accounts.
    const rateLimitSnap = await rateLimitRef.get();
    const now = new Date();

    if (rateLimitSnap.exists) {
        const data = rateLimitSnap.data()!;
        const lastRequestAt: Date | null = data.lastRequestAt?.toDate?.() ?? null;
        const dailyWindowStart: Date | null = data.dailyWindowStart?.toDate?.() ?? null;
        const dailyCount: number = data.dailyCount ?? 0;

        if (lastRequestAt) {
            const secondsSinceLastRequest = (now.getTime() - lastRequestAt.getTime()) / 1000;
            if (secondsSinceLastRequest < RESEND_COOLDOWN_SECONDS) {
                return NextResponse.json(
                    { error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastRequest)}s before requesting another code` },
                    { status: 429 }
                );
            }
        }

        const withinDailyWindow = dailyWindowStart && (now.getTime() - dailyWindowStart.getTime()) < 24 * 60 * 60 * 1000;
        if (withinDailyWindow && dailyCount >= MAX_REQUESTS_PER_DAY) {
            return NextResponse.json(
                { error: 'Too many reset requests today. Please try again tomorrow.' },
                { status: 429 }
            );
        }
    }

    // Record this request attempt regardless of whether the account
    // exists below — keeps timing/behavior identical either way.
    const priorData = rateLimitSnap.exists ? rateLimitSnap.data()! : null;
    const dailyWindowStart: Date = priorData?.dailyWindowStart?.toDate?.() ?? now;
    const withinExistingWindow = priorData && (now.getTime() - dailyWindowStart.getTime()) < 24 * 60 * 60 * 1000;

    await rateLimitRef.set({
        lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
        dailyWindowStart: withinExistingWindow ? dailyWindowStart : now,
        dailyCount: withinExistingWindow ? admin.firestore.FieldValue.increment(1) : 1,
    }, { merge: true });

    // ── Custom reset-code logic (no Firebase-generated link) ───────────────
    try {
        const userRecord = await admin.auth().getUserByEmail(email).catch(() => null);

        if (userRecord) {
            const code = generateCode();
            const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

            await db.collection('password_reset_codes').doc(userRecord.uid).set({
                code,
                email,
                expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                attempts: 0,
            });

            let name = userRecord.displayName ?? '';
            if (!name) {
                try {
                    const userDoc = await db.collection('users').doc(userRecord.uid).get();
                    name = userDoc.data()?.name ?? '';
                } catch {
                    // non-fatal
                }
            }

            const result = await sendBrevoEmail({
                to: [{ email, name }],
                subject: 'Your StudyCedo password reset code',
                htmlContent: buildResetCodeEmailHtml(name, code),
                tags: ['password-reset-code'],
            });

            if (!result.ok) {
                console.error('Brevo password-reset send failed:', result.error);
            }
        } else {
            console.log(`Password reset requested for non-existent email: ${email}`);
        }
    } catch (err) {
        console.error('Password reset error:', err);
    }

    // Always the same generic response, whether or not the account exists.
    return NextResponse.json({ message: 'If an account exists for that email, a reset code has been sent.' });
}