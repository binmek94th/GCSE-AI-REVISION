import { NextRequest, NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getUidFromRequest(req: NextRequest): Promise<string | null> {
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

// Fields that make up a completed free-assessment/onboarding session. We only
// ever copy from this fixed list — never the whole guest doc — so nothing
// unexpected rides along into the real account.
const ONBOARDING_FIELDS = [
    "level",
    "examBoard",
    "subjects",
    "preferences",
    "onboardingComplete",
    "quizPlan",
    "quizMetadata",
] as const;

// ─── POST handler ───────────────────────────────────────────────────────────
// Body: { guestUid: string }
// Auth: Authorization: Bearer <idToken of the REAL account to merge into>
//
// This only runs the flow where a guest took the free assessment under an
// anonymous Firebase Auth uid, then tried to register with an email that
// already has a real account — so `linkWithCredential` on the client failed
// with `auth/email-already-in-use`. Once they log in to that real account,
// we bring the guest's assessment data over here, server-side, so we can
// verify the guest doc actually belongs to them before touching anything.
export async function POST(req: NextRequest) {
    const targetUid = await getUidFromRequest(req);
    if (!targetUid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let guestUid: string | undefined;
    try {
        const body = await req.json();
        guestUid = typeof body?.guestUid === "string" ? body.guestUid : undefined;
    } catch {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!guestUid || guestUid === targetUid) {
        return NextResponse.json({ error: "Invalid guestUid" }, { status: 400 });
    }

    // 1. The guest uid must actually be an anonymous Firebase Auth user —
    //    never merge from an arbitrary/real account.
    let guestAuthUser;
    try {
        guestAuthUser = await admin.auth().getUser(guestUid);
    } catch {
        // No such guest session (already merged, expired, or bogus id) —
        // nothing to do, but don't fail the caller's login over it.
        return NextResponse.json({ merged: false, reason: "guest_not_found" });
    }
    const isAnonymous = guestAuthUser.providerData.length === 0 && !guestAuthUser.email;
    if (!isAnonymous) {
        return NextResponse.json({ error: "guestUid is not an anonymous session" }, { status: 403 });
    }

    const db = admin.firestore();
    const guestSnap = await db.collection("users").doc(guestUid).get();
    if (!guestSnap.exists) {
        await admin.auth().deleteUser(guestUid).catch(() => {});
        return NextResponse.json({ merged: false, reason: "no_guest_data" });
    }
    const guestData = guestSnap.data()!;

    // 2. If the guest captured a lead email during the assessment, it must
    //    match the real account's email — proves this guest session belongs
    //    to the person now logged in, not someone else's abandoned session.
    const targetAuthUser = await admin.auth().getUser(targetUid);
    if (guestData.email && targetAuthUser.email &&
        String(guestData.email).toLowerCase() !== targetAuthUser.email.toLowerCase()) {
        return NextResponse.json({ error: "Email mismatch — refusing to merge" }, { status: 403 });
    }

    // 3. Only fill in onboarding data the real account doesn't already have —
    //    never clobber a real account's own choices with stale guest data.
    const targetRef = db.collection("users").doc(targetUid);
    const targetSnap = await targetRef.get();
    const targetData = targetSnap.exists ? targetSnap.data()! : {};

    if (targetData.onboardingComplete) {
        await admin.auth().deleteUser(guestUid).catch(() => {});
        await guestSnap.ref.delete().catch(() => {});
        return NextResponse.json({ merged: false, reason: "target_already_onboarded" });
    }

    const toMerge: Record<string, unknown> = {};
    for (const field of ONBOARDING_FIELDS) {
        if (guestData[field] !== undefined) toMerge[field] = guestData[field];
    }

    if (Object.keys(toMerge).length > 0) {
        await targetRef.set(toMerge, { merge: true });
    }

    // 4. Clean up the guest session — its data now lives on the real account.
    await admin.auth().deleteUser(guestUid).catch(() => {});
    await guestSnap.ref.delete().catch(() => {});

    return NextResponse.json({ merged: true });
}
