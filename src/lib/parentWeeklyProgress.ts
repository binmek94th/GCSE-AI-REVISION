// src/lib/parentWeeklyProgress.ts
// Aggregates a student's week of activity from Firestore and renders a
// parent-facing HTML digest.
//
// Adjust the import path to wherever your Admin Firestore instance lives.
import { adminDb } from "@/lib/firebaseAdmin";

// ============================================================
//  SCHEMA — matched to the real data model.
//  Reads fail soft: a wrong path degrades gracefully rather
//  than killing the whole batch.
// ============================================================
const STUDENT_NAME_FIELDS = ["displayName", "firstName", "name"]; // first non-empty wins
// Stored as `parent_email`; parentEmail kept as a fallback for legacy docs.
const PARENT_EMAIL_FIELDS = ["parent_email", "parentEmail"]; // users/{uid}.* (top-level)

// Per-question attempts. One doc per pack; each FIELD on the doc is a single
// attempt map: { answeredAt: Timestamp, correct: boolean, userAnswer: string }.
const QUESTION_PROGRESS_SUBCOLLECTION = "question_progress"; // users/{uid}/question_progress/{packId}
const QP_ANSWERED_AT = "answeredAt";
const QP_CORRECT = "correct";

// Mock tests. One doc per test taken.
const MOCK_TESTS_SUBCOLLECTION = "mock_tests"; // users/{uid}/mock_tests/{id}
const MOCK_DATE_FIELD = "date";          // Firestore Timestamp
const MOCK_CORRECT_COUNT = "correctCount";
const MOCK_TOTAL_COUNT = "totalCount";

// Daily study plans. One doc per day (id = YYYY-MM-DD). plan.sessions[] each gain
// `completed: true` when finished; the field is absent otherwise.
const DAILY_PLANS_SUBCOLLECTION = "dailyStudyPlans"; // users/{uid}/dailyStudyPlans/{YYYY-MM-DD}
const PLAN_DATE_FIELD = "date";          // Firestore Timestamp

// Study-material completions (optional). Adjust to your schema.
const STUDY_PROGRESS_SUBCOLLECTION = "progress"; // users/{uid}/progress/{id}
const STUDY_COMPLETED_AT_FIELDS = ["completedAt", "updatedAt", "date"];

const ENROLMENT_SUBCOLLECTION = "subjects"; // users/{uid}/subjects/{packId}
const READINESS_FIELD = "readiness";        // 0..100 on enrolment doc (optional)
// ============================================================

export interface SubjectProgress {
    name: string;
    targetGrade?: string | number;
    readiness?: number; // 0..100
}

export interface StudentDigest {
    uid: string;
    studentName: string;
    parentEmail: string;
    parentName?: string;
    weekStart: Date;
    weekEnd: Date;
    questionsAnswered: number;
    mockTestsTaken: number;
    studySessionsCompleted: number;
    studyMaterialsCompleted: number;
    averageScore: number | null; // 0..100 weekly accuracy, or null if nothing answered
    subjects: SubjectProgress[];
    focusAreas: SubjectProgress[]; // lowest-readiness subjects
    hasActivity: boolean;
}

/** Coerce a Firestore Timestamp / Date / {seconds} / ISO string to millis. */
function toMillis(v: any): number | null {
    if (!v) return null;
    if (typeof v.toMillis === "function") return v.toMillis();
    if (typeof v.toDate === "function") return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
    if (typeof v.seconds === "number") return v.seconds * 1000;
    if (typeof v === "string") {
        const t = Date.parse(v);
        return Number.isFinite(t) ? t : null;
    }
    return null;
}

/**
 * Builds a digest for one student. Returns null when there is no parent
 * email (caller skips). Reads fail soft so a wrong field name degrades
 * gracefully rather than killing the whole batch.
 */
export async function buildStudentDigest(
    uid: string,
    userData: any,
    windowDays: number = 7
): Promise<StudentDigest | null> {
    const parentEmail = String(
        PARENT_EMAIL_FIELDS.map((f) => userData?.[f]).find(
            (v) => typeof v === "string" && v.trim()
        ) || ""
    ).trim();
    if (!parentEmail) return null;

    const studentName =
        STUDENT_NAME_FIELDS.map((f) => userData?.[f]).find(
            (v) => typeof v === "string" && v.trim()
        )?.trim() || "your child";

    const now = new Date();
    const days = Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 7;
    const weekStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const weekStartMs = weekStart.getTime();

    // --- Per-question attempts (question_progress/{packId} → map fields) ---
    let questionsAnswered = 0;
    let questionsCorrect = 0;
    try {
        const qpSnap = await adminDb
            .collection("users")
            .doc(uid)
            .collection(QUESTION_PROGRESS_SUBCOLLECTION)
            .get();

        for (const packDoc of qpSnap.docs) {
            const data = packDoc.data() || {};
            for (const attempt of Object.values<any>(data)) {
                if (!attempt || typeof attempt !== "object") continue;
                const ms = toMillis(attempt[QP_ANSWERED_AT]);
                if (ms === null || ms < weekStartMs) continue;
                questionsAnswered++;
                if (attempt[QP_CORRECT] === true) questionsCorrect++;
            }
        }
    } catch (err) {
        console.warn(
            `[parent-weekly] question_progress read failed for ${uid}:`,
            (err as Error)?.message
        );
    }

    // --- Mock tests in the last week ---
    let mockTestsTaken = 0;
    let mockCorrect = 0;
    let mockTotal = 0;
    try {
        const snap = await adminDb
            .collection("users")
            .doc(uid)
            .collection(MOCK_TESTS_SUBCOLLECTION)
            .where(MOCK_DATE_FIELD, ">=", weekStart) // single-field range → auto index
            .get();

        mockTestsTaken = snap.size;
        snap.docs.forEach((doc) => {
            const d = doc.data() || {};
            const cc = Number(d[MOCK_CORRECT_COUNT]);
            const tc = Number(d[MOCK_TOTAL_COUNT]);
            if (Number.isFinite(cc)) mockCorrect += cc;
            if (Number.isFinite(tc)) mockTotal += tc;
        });
    } catch (err) {
        console.warn(
            `[parent-weekly] mock_tests read failed for ${uid}:`,
            (err as Error)?.message
        );
    }

    // --- Completed study-plan sessions in the last week ---
    let studySessionsCompleted = 0;
    try {
        const snap = await adminDb
            .collection("users")
            .doc(uid)
            .collection(DAILY_PLANS_SUBCOLLECTION)
            .where(PLAN_DATE_FIELD, ">=", weekStart) // single-field range → auto index
            .get();

        snap.docs.forEach((doc) => {
            const sessions = (doc.data() || {})?.plan?.sessions;
            if (!Array.isArray(sessions)) return;
            for (const s of sessions) {
                if (s && s.completed === true) studySessionsCompleted++;
            }
        });
    } catch (err) {
        console.warn(
            `[parent-weekly] dailyStudyPlans read failed for ${uid}:`,
            (err as Error)?.message
        );
    }

    // --- Study-material completions in the last week (best effort) ---
    let studyMaterialsCompleted = 0;
    try {
        const snap = await adminDb
            .collection("users")
            .doc(uid)
            .collection(STUDY_PROGRESS_SUBCOLLECTION)
            .get();

        snap.docs.forEach((doc) => {
            const d = doc.data() || {};
            const completed =
                d.completed === true ||
                d.status === "completed" ||
                d.completedAt != null;
            if (!completed) return;
            const ts = STUDY_COMPLETED_AT_FIELDS.map((f) => toMillis(d[f])).find(
                (m) => m !== null
            );
            // Count only completions that fall in the week (when a date exists).
            if (ts != null && ts >= weekStartMs) studyMaterialsCompleted++;
        });
    } catch (err) {
        console.warn(
            `[parent-weekly] study progress read failed for ${uid}:`,
            (err as Error)?.message
        );
    }

    // --- Weekly accuracy across questions + mock tests ---
    const totalAnswered = questionsAnswered + mockTotal;
    const totalCorrect = questionsCorrect + mockCorrect;
    const averageScore =
        totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;

    // --- Per-subject readiness from enrolment docs ---
    const readinessByName = new Map<string, number>();
    try {
        const enrol = await adminDb
            .collection("users")
            .doc(uid)
            .collection(ENROLMENT_SUBCOLLECTION)
            .get();

        enrol.docs.forEach((doc) => {
            const data = doc.data() || {};
            const name = String(data.name || data.subject || data.subjectName || "").trim();
            const r = Number(data[READINESS_FIELD]);
            if (name && Number.isFinite(r)) {
                readinessByName.set(name.toLowerCase(), r);
            }
        });
    } catch (err) {
        console.warn(
            `[parent-weekly] readiness read failed for ${uid}:`,
            (err as Error)?.message
        );
    }

    // --- Subjects come from the array on the user doc ---
    const subjectsArr: any[] = Array.isArray(userData?.subjects)
        ? userData.subjects
        : [];

    const subjects: SubjectProgress[] = subjectsArr.map((s) => {
        const name = String(s?.name || s?.subject || "").trim();
        const readiness = readinessByName.get(name.toLowerCase());
        return {
            name: name || "Subject",
            targetGrade: s?.targetGrade ?? s?.target ?? undefined,
            readiness: Number.isFinite(readiness as number) ? readiness : undefined,
        };
    });

    const focusAreas = subjects
        .filter((s) => typeof s.readiness === "number")
        .sort((a, b) => (a.readiness as number) - (b.readiness as number))
        .slice(0, 3);

    return {
        uid,
        studentName,
        parentEmail,
        weekStart,
        weekEnd: now,
        questionsAnswered,
        mockTestsTaken,
        studySessionsCompleted,
        studyMaterialsCompleted,
        averageScore,
        subjects,
        focusAreas,
        hasActivity:
            questionsAnswered > 0 ||
            mockTestsTaken > 0 ||
            studySessionsCompleted > 0 ||
            studyMaterialsCompleted > 0,
    };
}

// ============================================================
//  Email template (inline-styled, table-based for client safety)
// ============================================================

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

function fmtDate(d: Date): string {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function readinessColor(r?: number): string {
    if (typeof r !== "number") return "#9ca3af";
    if (r < 40) return "#dc2626"; // red
    if (r < 70) return "#d97706"; // amber
    return "#16a34a"; // green
}

function subjectRow(s: SubjectProgress): string {
    const hasR = typeof s.readiness === "number";
    const r = hasR ? Math.max(0, Math.min(100, s.readiness as number)) : 0;
    const color = readinessColor(s.readiness);

    const target =
        s.targetGrade !== undefined && s.targetGrade !== null && s.targetGrade !== ""
            ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">Target grade: <strong style="color:#374151;">${escapeHtml(
                String(s.targetGrade)
            )}</strong></div>`
            : "";

    const right = hasR
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right" style="width:140px;">
         <tr><td style="padding-bottom:4px;text-align:right;font-size:13px;font-weight:600;color:${color};">${r}% ready</td></tr>
         <tr><td>
           <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:140px;background:#e5e7eb;border-radius:9999px;">
             <tr><td style="height:8px;width:${r}%;background:${color};border-radius:9999px;font-size:0;line-height:0;">&nbsp;</td></tr>
           </table>
         </td></tr>
       </table>`
        : `<div style="text-align:right;font-size:12px;color:#9ca3af;">Not enough data yet</div>`;

    return `<tr>
    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;">
      <div style="font-size:15px;font-weight:600;color:#111827;">${escapeHtml(
        s.name
    )}</div>
      ${target}
    </td>
    <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;vertical-align:top;text-align:right;">
      ${right}
    </td>
  </tr>`;
}

/** Joins phrases naturally: "a, b and c". */
function naturalList(parts: string[]): string {
    if (parts.length === 0) return "";
    if (parts.length === 1) return parts[0];
    return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function renderParentWeeklyEmail(d: StudentDigest): {
    subject: string;
    html: string;
} {
    const range = `${fmtDate(d.weekStart)} – ${fmtDate(d.weekEnd)}`;
    const subject = `${d.studentName}'s revision update — ${range}`;
    const greeting = d.parentName ? `Hi ${escapeHtml(d.parentName)},` : "Hello,";
    const name = escapeHtml(d.studentName);

    const bits: string[] = [];
    if (d.questionsAnswered > 0) {
        bits.push(
            `answered <strong>${d.questionsAnswered}</strong> practice ${
                d.questionsAnswered === 1 ? "question" : "questions"
            }`
        );
    }
    if (d.mockTestsTaken > 0) {
        bits.push(
            `completed <strong>${d.mockTestsTaken}</strong> mock ${
                d.mockTestsTaken === 1 ? "test" : "tests"
            }`
        );
    }
    if (d.studySessionsCompleted > 0) {
        bits.push(
            `finished <strong>${d.studySessionsCompleted}</strong> planned study ${
                d.studySessionsCompleted === 1 ? "session" : "sessions"
            }`
        );
    }
    if (d.studyMaterialsCompleted > 0) {
        bits.push(
            `worked through <strong>${d.studyMaterialsCompleted}</strong> study ${
                d.studyMaterialsCompleted === 1 ? "lesson" : "lessons"
            }`
        );
    }

    const quizLine =
        bits.length > 0
            ? `This week ${name} ${naturalList(bits)}${
                d.averageScore !== null
                    ? `, getting <strong>${d.averageScore}%</strong> of questions right`
                    : ""
            }.`
            : `${name} didn't record any revision this week — a short session would be a great nudge.`;

    const subjectRows = d.subjects.length
        ? d.subjects.map(subjectRow).join("")
        : `<tr><td style="padding:12px 0;color:#6b7280;font-size:14px;">No subjects set up yet.</td></tr>`;

    const focusBlock = d.focusAreas.length
        ? `<div style="margin:24px 0 0;padding:16px 18px;background:#eff6ff;border:1px solid #dbeafe;border-radius:10px;">
         <div style="font-size:14px;font-weight:600;color:#1e3a8a;margin-bottom:6px;">Where to focus next week</div>
         <div style="font-size:14px;color:#1e40af;line-height:1.5;">
           ${escapeHtml(d.studentName)} could get the biggest lift from
           ${d.focusAreas
            .map((s) => `<strong>${escapeHtml(s.name)}</strong>`)
            .join(", ")}.
         </div>
       </div>`
        : "";

    const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${name}'s weekly revision progress on StudyCedo (${range}).</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:24px 28px;">
              <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.2px;">StudyCedo</div>
              <div style="font-size:13px;color:#bfdbfe;margin-top:2px;">Weekly progress update · ${range}</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 14px;font-size:15px;color:#111827;">${greeting}</p>
              <p style="margin:0 0 4px;font-size:15px;color:#374151;line-height:1.6;">
                Here's how <strong>${name}</strong> got on this week. ${quizLine}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
                <tr>
                  <td colspan="2" style="font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:#6b7280;padding-bottom:6px;">
                    Subject readiness
                  </td>
                </tr>
                ${subjectRows}
              </table>

              ${focusBlock}

              <p style="margin:26px 0 0;font-size:13px;color:#6b7280;line-height:1.6;">
                Readiness reflects how ${name}'s quiz accuracy is tracking against their target grade. A little regular practice moves these numbers steadily.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 28px;background:#f9fafb;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                You're receiving this because you're listed as ${name}'s parent or guardian on StudyCedo.
                <!-- TODO: swap in a real preferences/unsubscribe link -->
                <a href="{{UNSUBSCRIBE_URL}}" style="color:#6b7280;">Manage email preferences</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return { subject, html };
}