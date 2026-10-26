// src/lib/grades.ts
//
// Target-grade scales, shared by onboarding, the Study Pack "Add to Plan" step
// and the enrol API so they always agree on what a valid grade is.

export const GCSE_GRADES = ['9', '8', '7', '6', '5', '4'] as const;
export const ALEVEL_GRADES = ['A*', 'A', 'B', 'C', 'D', 'E'] as const;

export const isALevelName = (level?: string | null) =>
    ['a-level', 'alevel', 'a level'].includes(String(level ?? '').trim().toLowerCase());

export function gradeOptionsFor(level?: string | null): string[] {
    return isALevelName(level) ? [...ALEVEL_GRADES] : [...GCSE_GRADES];
}

export const defaultGradeFor = (level?: string | null) => (isALevelName(level) ? 'A' : '7');

export const isValidGrade = (level: string | null | undefined, grade: unknown): grade is string =>
    typeof grade === 'string' && gradeOptionsFor(level).includes(grade.trim());
