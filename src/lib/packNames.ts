// src/lib/packNames.ts
//
// One place that turns a study-pack id into something a person can read:
// "English Literature" + exam board + level (+ tier for Foundation/Higher).
//
// Order of preference:
//   1. the study_packs document      (the real record)
//   2. the student's own enrolment   (users/{uid}/subjects/{packId})
//   3. the id itself, parsed         ("A_Level_Cambridge_CIE_English_Literature")
// so a pack whose study_packs record is missing never shows up as a raw id.
// Used by the tutor's student view and the student's Profile page.


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
export function parsePackId(packId: string): { subject: string; examBoard: string | null; level: string | null } {
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
export function resolvePackMeta(packId: string, pack: FirebaseFirestore.DocumentData | null, enrol: FirebaseFirestore.DocumentData | undefined): PackMeta {
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
