// src/lib/brevo.ts
// Thin wrapper over Brevo's transactional email API that reports real failures.

type BrevoRecipient = { email: string; name?: string };

interface SendArgs {
    to: BrevoRecipient[];
    subject: string;
    htmlContent: string;
    tags?: string[];
    replyTo?: BrevoRecipient;
}

interface SendResult {
    ok: boolean;
    messageId?: string;
    error?: string;
    status?: number;
}

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export async function sendBrevoEmail(args: SendArgs): Promise<SendResult> {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    const senderName = process.env.BREVO_SENDER_NAME || "StudyCeDo";

    if (!apiKey) return { ok: false, error: "BREVO_API_KEY not set" };
    if (!senderEmail) return { ok: false, error: "BREVO_SENDER_EMAIL not set" };
    if (!args.to?.length || !args.to[0]?.email) {
        return { ok: false, error: "no recipient" };
    }

    const payload: Record<string, unknown> = {
        sender: { email: senderEmail, name: senderName },
        to: args.to.map((r) => ({ email: r.email, name: r.name })),
        subject: args.subject,
        htmlContent: args.htmlContent,
    };
    if (args.tags?.length) payload.tags = args.tags;
    if (args.replyTo?.email) payload.replyTo = args.replyTo;

    let res: Response;
    try {
        res = await fetch(BREVO_ENDPOINT, {
            method: "POST",
            headers: {
                "api-key": apiKey,
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify(payload),
        });
    } catch (err: any) {
        return { ok: false, error: `network: ${err?.message || err}` };
    }

    const text = await res.text();
    let body: any = null;
    try {
        body = text ? JSON.parse(text) : null;
    } catch {
        // non-JSON body; keep the raw text for the error
    }

    // Brevo returns 201 with { messageId } on success.
    if (!res.ok) {
        const reason =
            body?.message || body?.code || text || `HTTP ${res.status}`;
        // Common: 400 "Sender ... not valid" → verify the sender in Brevo.
        return { ok: false, status: res.status, error: String(reason) };
    }

    return { ok: true, status: res.status, messageId: body?.messageId };
}