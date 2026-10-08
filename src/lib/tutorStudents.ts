// src/lib/tutorStudents.ts
//
// Tutor ↔ student linking and read-only progress aggregation for the tutor
// dashboard. Self-contained on purpose: it only READS existing collections
// (users/*, referrals, study_packs, materials) and only WRITES the new
// `tutor_students` collection, so nothing in the referral / commission
// system is affected.
//
// A student is linked to a tutor when either:
//   • they signed up through the tutor's referral link  (referrals doc), or
//   • they entered the tutor's code in their profile    (tutor_students doc)
// A student can stop sharing at any time; that is stored as a
// tutor_students doc with status "revoked", which hides them from the tutor
// whichever way they were linked.
import admin from '@/lib/firebaseAdmin';
import type { NextRequest } from 'next/server';

export type LinkSource = 'referral_link' | 'code';

const db = () => admin.firestore();

// ─── Helpers ────────────────────────────────────────────────────────────────

function toMillis(v: any): number | null {
    if (!v) return null;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.toDate === 'function') return v.toDate().getTime();
    if (v instanceof Date) return v.getTime();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    if (typeof v._seconds === 'number') return v._seconds * 1000;
    if (typeof v === 'string') {
        const t = Date.parse(v);
        return Number.isFinite(t) ? t : null;
    }
    return null;
}

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

function dayKey(ms: number): string {
    return new Date(ms).toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function isMaterialDone(value: unknown): boolean {
    return value === true || (typeof value === 'object' && value !== null && (value as any).done === true);
}

export const linkDocId = (tutorId: string, studentId: string) => `${tutorId}_${studentId}`;

export function displayNameOf(userData: any, fallbackEmail?: string | null): string {
    const n = [userData?.displayName, userData?.name, userData?.username].find(
        (v) => typeof v === 'string' && v.trim()
    );
    return (n as string | undefined)?.trim() || (fallbackEmail ? fallbackEmail.split('@')[0] : 'Student');
}

// ─── Auth ───────────────────────────────────────────────────────────────────

/** Verifies the bearer token and returns the uid, or null. */
export async function uidFromRequest(req: NextRequest | Request): Promise<string | null> {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return null;
    try {
        return (await admin.auth().verifyIdToken(idToken)).uid;
    } catch {
        return null;
    }
}

/** Returns the tutor doc id if the caller is an ACTIVE tutor, else null. */
export async function requireActiveTutor(req: NextRequest | Request): Promise<string | null> {
    const uid = await uidFromRequest(req);
    if (!uid) return null;
    const snap = await db().collection('tutors').doc(uid).get();
    if (!snap.exists || snap.data()?.status !== 'active') return null;
    return uid;
}

// ─── Linking ────────────────────────────────────────────────────────────────

export interface LinkedStudent {
    studentId: string;
    source: LinkSource;
    linkedAtMs: number | null;
    referredEmail: string | null;
}

/** Everyone currently linked to a tutor (referral link + code), minus revoked. */
export async function getLinkedStudents(tutorId: string): Promise<LinkedStudent[]> {
    const [referralsSnap, codeSnap] = await Promise.all([
        db().collection('referrals').where('tutorId', '==', tutorId).get(),
        db().collection('tutor_students').where('tutorId', '==', tutorId).get(),
    ]);

    const revoked = new Set<string>();
    const byStudent = new Map<string, LinkedStudent>();

    codeSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'revoked') {
            revoked.add(data.studentId);
        } else if (data.studentId) {
            byStudent.set(data.studentId, {
                studentId: data.studentId,
                source: 'code',
                linkedAtMs: toMillis(data.linkedAt),
                referredEmail: data.studentEmail ?? null,
            });
        }
    });

    // Referral-link students. If the same student is also linked by code, the
    // earlier link wins for display purposes.
    referralsSnap.docs.forEach((d) => {
        const data = d.data();
        const studentId = data.referredUserId;
        if (!studentId || revoked.has(studentId)) return;
        const linkedAtMs = toMillis(data.signedUpAt);
        const existing = byStudent.get(studentId);
        if (!existing || (linkedAtMs !== null && (existing.linkedAtMs === null || linkedAtMs < existing.linkedAtMs))) {
            byStudent.set(studentId, {
                studentId,
                source: 'referral_link',
                linkedAtMs,
                referredEmail: data.referredEmail ?? null,
            });
        }
    });

    return Array.from(byStudent.values());
}

/** True if the student is currently linked to the tutor (and hasn't revoked). */
export async function isStudentLinked(tutorId: string, studentId: string): Promise<boolean> {
    const linkSnap = await db().collection('tutor_students').doc(linkDocId(tutorId, studentId)).get();
    if (linkSnap.exists) {
        return linkSnap.data()?.status !== 'revoked';
    }
    const ref = await db()
        .collection('referrals')
        .where('tutorId', '==', tutorId)
        .where('referredUserId', '==', studentId)
        .limit(1)
        .get();
    return !ref.empty;
}

// ─── Pack naming ────────────────────────────────────────────────────────────

export interface PackMeta {
    packId: string;
    subject: string;          // human name, e.g. "English Literature"
    examBoard: string | null; // e.g. "AQA"
    level: string | null;     // "GCSE" | "A-Level"
    tier: string | null;      // e.g. "Higher"; null for untiered packs
    isRealPack: boolean;      // true if subject/level came from study_packs or the student's enrolment
}

const KNOWN_BOARDS = ['Cambridge CIE', 'Edexcel', 'Eduqas', 'WJEC', 'CCEA', 'AQA', 'OCR', 'CIE', 'IB'];

const titleCase = (text: string) =>
    text.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Last-resort naming from the id alone, so the tutor never sees a raw id:
 *   "A_Level_Cambridge_CIE_English_Literature" -> English Literature · Cambridge CIE · A-Level
 *   "art_and_design" / "daily-assessment"       -> Art And Design / Daily Assessment
 */
function parsePackId(packId: string): { subject: string; examBoard: string | null; level: string | null } {
    let rest = packId;
    let level: string | null = null;

    const lvl = rest.match(/^(a[_-]?level|gcse)[_-]+(.*)$/i);
    if (lvl) {
        level = /^gcse$/i.test(lvl[1]) ? 'GCSE' : 'A-Level';
        rest = lvl[2];
    }

    let examBoard: string | null = null;
    if (level) {
        const flat = rest.replace(/[_-]+/g, ' ');
        const board = KNOWN_BOARDS.find((b) => flat.toLowerCase().startsWith(b.toLowerCase() + ' '));
        if (board) {
            examBoard = board;
            rest = flat.slice(board.length + 1);
        }
    }
    return { subject: titleCase(rest) || titleCase(packId), examBoard, level };
}

/** study_packs first, then the student's enrolment doc, then the id itself. */
function resolvePackMeta(packId: string, pack: FirebaseFirestore.DocumentData | null, enrol: FirebaseFirestore.DocumentData | undefined): PackMeta {
    const parsed = parsePackId(packId);
    const subject = (pack?.subject || enrol?.subject || '') as string;
    const tierRaw = typeof pack?.tier === 'string' ? pack.tier.trim() : '';
    return {
        packId,
        subject: subject || parsed.subject,
        examBoard: (pack?.exam_board || enrol?.examBoard || parsed.examBoard || null) as string | null,
        level: (pack?.level || enrol?.level || parsed.level || null) as string | null,
        tier: tierRaw && tierRaw.toLowerCase() !== 'untiered' ? tierRaw : null,
        isRealPack: Boolean(subject),
    };
}

// ─── Progress aggregation (read-only) ───────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface QuestionStats {
    total: number;
    correct: number;
    lastAnsweredMs: number | null;
    last7d: number;
    last7dCorrect: number;
    byDay: Record<string, { answered: number; correct: number }>;
}

function emptyQuestionStats(): QuestionStats {
    return { total: 0, correct: 0, lastAnsweredMs: null, last7d: 0, last7dCorrect: 0, byDay: {} };
}

/** Reads users/{uid}/question_progress/* — one doc per pack, one map field per question. */
async function readQuestionProgress(uid: string, nowMs: number) {
    const perPack = new Map<string, QuestionStats>();
    const overall = emptyQuestionStats();
    const snap = await db().collection('users').doc(uid).collection('question_progress').get();

    for (const packDoc of snap.docs) {
        const stats = emptyQuestionStats();
        for (const attempt of Object.values<any>(packDoc.data() || {})) {
            if (!attempt || typeof attempt !== 'object') continue;
            const ms = toMillis(attempt.answeredAt);
            const correct = attempt.correct === true;
            for (const s of [stats, overall]) {
                s.total++;
                if (correct) s.correct++;
                if (ms !== null) {
                    if (s.lastAnsweredMs === null || ms > s.lastAnsweredMs) s.lastAnsweredMs = ms;
                    if (nowMs - ms <= WEEK_MS) {
                        s.last7d++;
                        if (correct) s.last7dCorrect++;
                        const k = dayKey(ms);
                        s.byDay[k] = s.byDay[k] ?? { answered: 0, correct: 0 };
                        s.byDay[k].answered++;
                        if (correct) s.byDay[k].correct++;
                    }
                }
            }
        }
        perPack.set(packDoc.id, stats);
    }
    return { perPack, overall };
}

/** Latest completedAt across study-material progress docs (for "last active"). */
async function readProgressDocs(uid: string) {
    const snap = await db().collection('users').doc(uid).collection('progress').get();
    return snap.docs.map((d) => ({ packId: d.id, data: d.data() || {} }));
}

async function latestMockTestMs(uid: string): Promise<number | null> {
    try {
        const s = await db().collection('users').doc(uid).collection('mock_tests').orderBy('date', 'desc').limit(1).get();
        return s.empty ? null : toMillis(s.docs[0].data().date);
    } catch {
        return null;
    }
}

export interface StudentSummary {
    studentId: string;
    name: string;
    email: string | null;
    level: string | null;
    examBoard: string | null;
    subjects: string[];
    source: LinkSource;
    linkedAt: string | null;
    lastActiveAt: string | null;
    questionsAnswered: number;
    accuracy: number | null;      // 0..100 over all answered questions
    answeredLast7d: number;
    accuracyLast7d: number | null;
    materialsCompleted: number;
}

/** Light per-student summary for the tutor's roster table. */
export async function buildStudentSummary(link: LinkedStudent): Promise<StudentSummary | null> {
    const userSnap = await db().collection('users').doc(link.studentId).get();
    if (!userSnap.exists) return null;
    const user = userSnap.data() || {};
    const nowMs = Date.now();

    const [{ overall }, progressDocs, mockMs] = await Promise.all([
        readQuestionProgress(link.studentId, nowMs),
        readProgressDocs(link.studentId),
        latestMockTestMs(link.studentId),
    ]);

    let materialsCompleted = 0;
    let lastMaterialMs: number | null = null;
    for (const { data } of progressDocs) {
        for (const v of Object.values<any>(data)) {
            if (!isMaterialDone(v)) continue;
            materialsCompleted++;
            const ms = typeof v === 'object' ? toMillis(v.completedAt) : null;
            if (ms !== null && (lastMaterialMs === null || ms > lastMaterialMs)) lastMaterialMs = ms;
        }
    }

    const lastActive = [overall.lastAnsweredMs, lastMaterialMs, mockMs]
        .filter((v): v is number => v !== null)
        .sort((a, b) => b - a)[0] ?? null;

    const subjectsArr: any[] = Array.isArray(user.subjects) ? user.subjects : [];

    return {
        studentId: link.studentId,
        name: displayNameOf(user, user.email ?? link.referredEmail),
        email: user.email ?? link.referredEmail ?? null,
        level: user.level ?? user.preferences?.level ?? null,
        examBoard: user.preferences?.examBoard ?? user.examBoard ?? null,
        subjects: subjectsArr.map((s) => String(s?.name ?? s?.subject ?? '').trim()).filter(Boolean),
        source: link.source,
        linkedAt: iso(link.linkedAtMs),
        lastActiveAt: iso(lastActive),
        questionsAnswered: overall.total,
        accuracy: overall.total > 0 ? Math.round((overall.correct / overall.total) * 100) : null,
        answeredLast7d: overall.last7d,
        accuracyLast7d: overall.last7d > 0 ? Math.round((overall.last7dCorrect / overall.last7d) * 100) : null,
        materialsCompleted,
    };
}

export interface StudentDetail {
    student: {
        studentId: string;
        name: string;
        email: string | null;
        level: string | null;
        examBoard: string | null;
        subjects: { name: string; tier: string | null; targetGrade: string | null }[];
        source: LinkSource;
        linkedAt: string | null;
        lastActiveAt: string | null;
    };
    // Study progress — study materials completed per enrolled pack
    study: {
        packs: {
            packId: string;
            subject: string;
            examBoard: string | null;
            level: string | null;
            tier: string | null;
            totalMaterials: number;
            finishedMaterials: number;
            percent: number;
        }[];
        totalMaterials: number;
        finishedMaterials: number;
        percent: number;
    };
    // Weekly progress — last 7 days
    weekly: {
        from: string;
        to: string;
        questionsAnswered: number;
        questionsCorrect: number;
        accuracy: number | null;
        mockTestsTaken: number;
        materialsCompleted: number;
        sessionsPlanned: number;
        sessionsCompleted: number;
        days: {
            date: string;
            questionsAnswered: number;
            questionsCorrect: number;
            materialsCompleted: number;
            sessionsPlanned: number;
            sessionsCompleted: number;
        }[];
    };
    // Quiz progress — accuracy per subject + recent mock exams
    quiz: {
        questionsAnswered: number;
        questionsCorrect: number;
        accuracy: number | null;
        outstandingMistakes: number;
        subjects: {
            packId: string;
            subject: string;
            examBoard: string | null;
            level: string | null;
            tier: string | null;
            answered: number;
            correct: number;
            accuracy: number;
            outstandingMistakes: number;
            lastAnsweredAt: string | null;
        }[];
        recentMockTests: {
            subject: string;
            score: number;
            correctCount: number;
            totalCount: number;
            date: string | null;
        }[];
    };
}

/** Full progress view for one student: study, weekly and quiz. */
export async function buildStudentDetail(link: LinkedStudent): Promise<StudentDetail | null> {
    const uid = link.studentId;
    const userSnap = await db().collection('users').doc(uid).get();
    if (!userSnap.exists) return null;
    const user = userSnap.data() || {};

    const nowMs = Date.now();
    const weekStartMs = nowMs - WEEK_MS;
    const weekStart = new Date(weekStartMs);

    const [questionProgress, progressDocs, enrolSnap, mockSnap, plansSnap] = await Promise.all([
        readQuestionProgress(uid, nowMs),
        readProgressDocs(uid),
        db().collection('users').doc(uid).collection('subjects').get(),
        db().collection('users').doc(uid).collection('mock_tests').orderBy('date', 'desc').limit(10).get().catch(() => null),
        db().collection('users').doc(uid).collection('dailyStudyPlans').where('date', '>=', weekStart).get().catch(() => null),
    ]);

    // ── Which packs does this student have? (enrolled ∪ has any progress)
    const packIds = new Set<string>();
    enrolSnap.docs.forEach((d) => packIds.add(d.id));
    progressDocs.forEach((p) => packIds.add(p.packId));
    questionProgress.perPack.forEach((_, id) => packIds.add(id));

    const progressByPack = new Map(progressDocs.map((p) => [p.packId, p.data]));

    // ── Resolve a display name / board / level for EVERY pack id (quiz rows
    //    included), falling back from study_packs -> enrolment -> the id itself
    const enrolById = new Map(enrolSnap.docs.map((d) => [d.id, d.data()]));
    const metas = await Promise.all(
        Array.from(packIds).map(async (packId) => {
            const packSnap = await db().collection('study_packs').doc(packId).get();
            return resolvePackMeta(packId, packSnap.exists ? packSnap.data() ?? null : null, enrolById.get(packId));
        })
    );
    const metaById = new Map(metas.map((m) => [m.packId, m]));

    // ── Count materials for real packs only (level-aware collection). Old
    //    progress keys like "biology" / "daily-assessment" have no materials.
    const packInfos = await Promise.all(
        metas
            .filter((m) => m.isRealPack && m.level)
            .map(async (meta) => {
                const isALevel = ['A-Level', 'alevel', 'a-level'].includes(meta.level as string);
                let q: FirebaseFirestore.Query = db()
                    .collection(isALevel ? 'alevel_study_materials' : 'study_materials')
                    .where('subject', '==', meta.subject)
                    .where('moderation_status', '==', 'approved');
                if (meta.examBoard) q = q.where('exam_board', '==', meta.examBoard);

                const matSnap = await q.select().get();
                const valid = new Set(matSnap.docs.map((d) => d.id));
                const progressData = progressByPack.get(meta.packId) ?? {};
                const finished = Object.keys(progressData).filter((k) => isMaterialDone(progressData[k]) && valid.has(k)).length;

                return {
                    packId: meta.packId,
                    subject: meta.subject,
                    examBoard: meta.examBoard,
                    level: meta.level,
                    tier: meta.tier,
                    totalMaterials: matSnap.size,
                    finishedMaterials: finished,
                    percent: matSnap.size > 0 ? Math.round((finished / matSnap.size) * 100) : 0,
                    validIds: valid,
                };
            })
    );
    const packsWithIds = packInfos;
    const validIdsByPack = new Map(packsWithIds.map((p) => [p.packId, p.validIds]));
    // Strip the internal id set before it goes anywhere near the response.
    const packs = packsWithIds.map(({ validIds: _validIds, ...rest }) => rest);

    const totalMaterials = packs.reduce((s, p) => s + p.totalMaterials, 0);
    const finishedMaterials = packs.reduce((s, p) => s + p.finishedMaterials, 0);

    // ── Weekly: materials completed per day (from progress docs' completedAt)
    const matByDay: Record<string, number> = {};
    let materialsThisWeek = 0;
    let lastMaterialMs: number | null = null;
    for (const { packId, data } of progressDocs) {
        const validIds = validIdsByPack.get(packId);
        if (!validIds) continue; // pack no longer exists
        for (const [materialId, v] of Object.entries<any>(data)) {
            // Same rule as the study % above: only real, approved materials count.
            if (!validIds.has(materialId) || !isMaterialDone(v) || typeof v !== 'object') continue;
            const ms = toMillis(v.completedAt);
            if (ms === null) continue;
            if (lastMaterialMs === null || ms > lastMaterialMs) lastMaterialMs = ms;
            if (ms >= weekStartMs) {
                materialsThisWeek++;
                const k = dayKey(ms);
                matByDay[k] = (matByDay[k] ?? 0) + 1;
            }
        }
    }

    // ── Weekly: study-plan sessions (planned vs completed) per day
    const sessByDay: Record<string, { planned: number; completed: number }> = {};
    let sessionsPlanned = 0;
    let sessionsCompleted = 0;
    plansSnap?.docs.forEach((doc) => {
        const sessions = (doc.data() || {})?.plan?.sessions;
        if (!Array.isArray(sessions)) return;
        // doc id is YYYY-MM-DD
        const k = /^\d{4}-\d{2}-\d{2}$/.test(doc.id) ? doc.id : dayKey(toMillis(doc.data().date) ?? nowMs);
        for (const s of sessions) {
            if (!s || typeof s !== 'object') continue;
            // Breaks aren't study sessions
            if (typeof s.subject === 'string' && /break/i.test(s.subject)) continue;
            sessByDay[k] = sessByDay[k] ?? { planned: 0, completed: 0 };
            sessByDay[k].planned++;
            sessionsPlanned++;
            if (s.completed === true) {
                sessByDay[k].completed++;
                sessionsCompleted++;
            }
        }
    });

    // ── Weekly: mock tests this week
    const mockDocs = mockSnap?.docs ?? [];
    const mockThisWeek = mockDocs.filter((d) => (toMillis(d.data().date) ?? 0) >= weekStartMs);

    // ── Build the 7 daily rows (oldest → newest, ending today)
    const days: StudentDetail['weekly']['days'] = [];
    for (let i = 6; i >= 0; i--) {
        const k = dayKey(nowMs - i * 24 * 60 * 60 * 1000);
        const q = questionProgress.overall.byDay[k];
        days.push({
            date: k,
            questionsAnswered: q?.answered ?? 0,
            questionsCorrect: q?.correct ?? 0,
            materialsCompleted: matByDay[k] ?? 0,
            sessionsPlanned: sessByDay[k]?.planned ?? 0,
            sessionsCompleted: sessByDay[k]?.completed ?? 0,
        });
    }

    const overall = questionProgress.overall;

    // ── Quiz: per-subject accuracy
    const quizSubjects = Array.from(questionProgress.perPack.entries())
        .map(([packId, s]) => ({
            packId,
            subject: metaById.get(packId)?.subject ?? packId,
            examBoard: metaById.get(packId)?.examBoard ?? null,
            level: metaById.get(packId)?.level ?? null,
            tier: metaById.get(packId)?.tier ?? null,
            answered: s.total,
            correct: s.correct,
            accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
            outstandingMistakes: s.total - s.correct,
            lastAnsweredAt: iso(s.lastAnsweredMs),
        }))
        .filter((s) => s.answered > 0)
        .sort((a, b) => b.answered - a.answered);

    const mockMs = mockDocs.length ? toMillis(mockDocs[0].data().date) : null;
    const lastActive = [overall.lastAnsweredMs, lastMaterialMs, mockMs]
        .filter((v): v is number => v !== null)
        .sort((a, b) => b - a)[0] ?? null;

    const subjectsArr: any[] = Array.isArray(user.subjects) ? user.subjects : [];

    return {
        student: {
            studentId: uid,
            name: displayNameOf(user, user.email ?? link.referredEmail),
            email: user.email ?? link.referredEmail ?? null,
            level: user.level ?? user.preferences?.level ?? null,
            examBoard: user.preferences?.examBoard ?? user.examBoard ?? null,
            subjects: subjectsArr
                .map((s) => ({
                    name: String(s?.name ?? s?.subject ?? '').trim(),
                    tier: s?.tier ? String(s.tier) : null,
                    targetGrade: s?.targetGrade ? String(s.targetGrade) : null,
                }))
                .filter((s) => s.name),
            source: link.source,
            linkedAt: iso(link.linkedAtMs),
            lastActiveAt: iso(lastActive),
        },
        study: {
            packs,
            totalMaterials,
            finishedMaterials,
            percent: totalMaterials > 0 ? Math.round((finishedMaterials / totalMaterials) * 100) : 0,
        },
        weekly: {
            from: iso(weekStartMs)!,
            to: iso(nowMs)!,
            questionsAnswered: overall.last7d,
            questionsCorrect: overall.last7dCorrect,
            accuracy: overall.last7d > 0 ? Math.round((overall.last7dCorrect / overall.last7d) * 100) : null,
            mockTestsTaken: mockThisWeek.length,
            materialsCompleted: materialsThisWeek,
            sessionsPlanned,
            sessionsCompleted,
            days,
        },
        quiz: {
            questionsAnswered: overall.total,
            questionsCorrect: overall.correct,
            accuracy: overall.total > 0 ? Math.round((overall.correct / overall.total) * 100) : null,
            outstandingMistakes: overall.total - overall.correct,
            subjects: quizSubjects,
            recentMockTests: mockDocs.slice(0, 5).map((d) => {
                const m = d.data();
                return {
                    subject: String(m.subject ?? ''),
                    score: Number(m.score) || 0,
                    correctCount: Number(m.correctCount) || 0,
                    totalCount: Number(m.totalCount) || 0,
                    date: iso(toMillis(m.date)),
                };
            }),
        },
    };
}
