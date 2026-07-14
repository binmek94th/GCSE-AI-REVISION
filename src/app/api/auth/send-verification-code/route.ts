import { NextRequest, NextResponse } from 'next/server';
import admin from '@/lib/firebaseAdmin';
import { sendBrevoEmail } from '@/lib/brevo';

const CODE_EXPIRY_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

function buildCodeEmailHtml(name: string, code: string): string {
    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0F172A; font-size: 20px; margin-bottom: 12px;">Verify your email</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Hi ${name || 'there'},
        </p>
        <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            Enter this code to verify your StudyCedo account:
        </p>
        <div style="text-align: center; margin: 28px 0;">
            <span style="display: inline-block; background: #F0F9FF; border: 1.5px solid #BAE6FD; border-radius: 10px; padding: 16px 32px; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0F172A;">
                ${code}
            </span>
        </div>
        <p style="color: #94A3B8; font-size: 12px; line-height: 1.6;">
            This code expires in ${CODE_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore this email.
        </p>
    </div>`;
}

export async function POST(req: NextRequest) {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let decoded;
    try {
        decoded = await admin.auth().verifyIdToken(idToken);
    } catch {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const userRecord = await admin.auth().getUser(decoded.uid);
    if (!userRecord.email) {
        return NextResponse.json({ error: 'User has no email on file' }, { status: 400 });
    }

    if (userRecord.emailVerified) {
        return NextResponse.json({ message: 'Email already verified', alreadyVerified: true });
    }

    const db = admin.firestore();
    const codeRef = db.collection('email_verification_codes').doc(decoded.uid);

    // Simple resend cooldown to prevent spamming Brevo / the user's inbox.
    const existing = await codeRef.get();
    if (existing.exists) {
        const lastSentAt = existing.data()?.createdAt?.toDate?.();
        if (lastSentAt) {
            const secondsSinceLastSend = (Date.now() - lastSentAt.getTime()) / 1000;
            if (secondsSinceLastSend < RESEND_COOLDOWN_SECONDS) {
                return NextResponse.json(
                    { error: `Please wait ${Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLastSend)}s before requesting another code` },
                    { status: 429 }
                );
            }
        }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await codeRef.set({
        code,
        email: userRecord.email,
        expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        attempts: 0,
    });

    let name = userRecord.displayName ?? '';
    if (!name) {
        try {
            const userDoc = await db.collection('users').doc(decoded.uid).get();
            name = userDoc.data()?.name ?? '';
        } catch {
            // non-fatal
        }
    }

    const result = await sendBrevoEmail({
        to: [{ email: userRecord.email, name }],
        subject: 'Your StudyCedo verification code',
        htmlContent: buildCodeEmailHtml(name, code),
        tags: ['email-verification-code'],
    });

    if (!result.ok) {
        console.error('Brevo send failed:', result.error);
        return NextResponse.json({ error: `Failed to send verification code: ${result.error}` }, { status: 502 });
    }

    return NextResponse.json({ message: 'Verification code sent', alreadyVerified: false });
}