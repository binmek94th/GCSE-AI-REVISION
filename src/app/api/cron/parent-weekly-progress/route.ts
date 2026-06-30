// src/app/api/cron/parent-weekly-progress/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin"; // adjust to your Admin SDK export
import {
    buildStudentDigest,
    renderParentWeeklyEmail,
} from "@/lib/parentWeeklyProgress";
import { sendBrevoEmail } from "@/lib/brevo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Long-running batch. >60s requires a Vercel Pro plan; for large user bases,
// switch to pagination + a queue (see note in the chat).
export const maxDuration = 300;

// Parent email is stored top-level on users/{uid} as `parent_email`.
// (parentEmail kept as a fallback for any legacy docs.)
const PARENT_EMAIL_FIELDS = ["parent_email", "parentEmail"];

// Require an opt-in flag before emailing a parent (recommended for consent).
// Flip to true once you store `parentWeeklyEmails: true` on opted-in users.
const REQUIRE_OPT_IN = false;
const OPT_IN_FIELD = "parentWeeklyEmails";

const DEFAULT_WINDOW_DAYS = 7;
const RATE_DELAY_MS = 250; // gap between sends to stay friendly with Brevo

function authorized(req: NextRequest): boolean {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;
    const header = req.headers.get("authorization") || "";
    return header === `Bearer ${secret}`;
}

function parentEmailOf(userData: any): string | null {
    for (const f of PARENT_EMAIL_FIELDS) {
        const v = userData?.[f];
        if (typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: NextRequest) {
    if (!authorized(req)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dryRun") === "true";
    const onlyUid = url.searchParams.get("uid"); // test a single student
    const limitParam = Number(url.searchParams.get("limit"));
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? limitParam : null;
    // Lookback window in days. Default 7; widen it (e.g. ?days=60) to test
    // against older activity.
    const daysParam = Number(url.searchParams.get("days"));
    const windowDays =
        Number.isFinite(daysParam) && daysParam > 0 ? daysParam : DEFAULT_WINDOW_DAYS;

    const results: Array<{ uid: string; status: string; detail?: string }> = [];
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    try {
        // Build the candidate set of users.
        let userDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
        if (onlyUid) {
            const doc = await adminDb.collection("users").doc(onlyUid).get();
            if (doc.exists) {
                userDocs = [doc as FirebaseFirestore.QueryDocumentSnapshot];
            }
        } else {
            let q: FirebaseFirestore.Query = adminDb.collection("users");
            // Keep a single-field filter so no composite index is required.
            // - opt-in path: filter on the opt-in flag, check parentEmail in code.
            // - default path: narrow to users who have a parent email set.
            //   We can only filter on one field name in the query; the in-loop
            //   check (parentEmailOf) catches the other variant.
            if (REQUIRE_OPT_IN) {
                q = q.where(OPT_IN_FIELD, "==", true);
            } else {
                q = q.where(PARENT_EMAIL_FIELDS[0], "!=", null);
            }
            const snap = await q.get();
            userDocs = snap.docs;
        }

        for (const doc of userDocs) {
            if (limit && sent + skipped + failed >= limit) break;

            const uid = doc.id;
            const userData = doc.data() || {};

            try {
                // Opt-in gate (checked in code so it can combine with the
                // parentEmail requirement without a composite index).
                if (REQUIRE_OPT_IN && userData[OPT_IN_FIELD] !== true) {
                    skipped++;
                    results.push({ uid, status: "skipped", detail: "not opted in" });
                    continue;
                }

                // No parent email → nothing to send (checks both field names).
                if (!parentEmailOf(userData)) {
                    skipped++;
                    results.push({ uid, status: "skipped", detail: "no parent email" });
                    continue;
                }

                const digest = await buildStudentDigest(uid, userData, windowDays);

                if (!digest) {
                    skipped++;
                    results.push({ uid, status: "skipped", detail: "no parent email" });
                    continue;
                }
                // Always send — even with no activity the email renders a
                // "nothing recorded this week" nudge.

                const { subject, html } = renderParentWeeklyEmail(digest);

                if (dryRun) {
                    sent++; // would-send
                    results.push({
                        uid,
                        status: "dry-run",
                        detail: `would email ${digest.parentEmail}${
                            digest.hasActivity ? "" : " (no activity)"
                        }`,
                    });
                    continue;
                }

                const send = await sendBrevoEmail({
                    to: [{ email: digest.parentEmail, name: digest.parentName }],
                    subject,
                    htmlContent: html,
                    tags: ["parent-weekly-progress"],
                });

                if (send.ok) {
                    sent++;
                    results.push({
                        uid,
                        status: "sent",
                        detail: digest.hasActivity ? send.messageId : "sent (no activity)",
                    });
                } else {
                    failed++;
                    results.push({ uid, status: "failed", detail: send.error });
                }

                await sleep(RATE_DELAY_MS);
            } catch (err: any) {
                failed++;
                results.push({ uid, status: "error", detail: err?.message });
            }
        }

        return NextResponse.json({
            ok: true,
            dryRun,
            windowDays,
            total: userDocs.length,
            sent,
            skipped,
            failed,
            results,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: err?.message || "Batch failed",
                sent,
                skipped,
                failed,
                results,
            },
            { status: 500 }
        );
    }
}