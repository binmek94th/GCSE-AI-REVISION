// src/lib/commission.ts
//
// The tutor commission rate, read from the COMMISSION_RATE environment variable.
//
// This used to be `parseInt(process.env.COMMISSION_RATE)`, which cannot hold a
// percentage: "0.3" became 0 (so no commission was ever recorded) and "30" would have
// paid 3000%. If the variable was missing it was NaN, which sailed past the
// `commissionAmount <= 0` check and wrote NaN commission events.
//
// Accepted forms (all mean 30%):   0.3    0.30    30    30%
//   - a plain number up to 1 is a fraction  (0.3 = 30%, 1 = 100%)
//   - a plain number above 1 is a percentage (30 = 30%)
//   - a trailing % is always a percentage     (0.3% = 0.3%)
//   - not set / blank -> 30%, the rate we advertise to tutors (see tutors/signup and track-signup)
//   - 0 -> commissions switched off
// Anything else (letters, negatives, over 100%) THROWS, so a typo is loud instead of
// quietly mis-paying tutors. The webhook turns that into a 500 and Stripe retries the
// event until the setting is fixed, so no commission is lost.

export const DEFAULT_COMMISSION_RATE = 0.3;

export function parseCommissionRate(raw: string | null | undefined): number {
    if (raw === undefined || raw === null || raw.trim() === '') return DEFAULT_COMMISSION_RATE;

    const text = raw.trim();
    const isPercent = text.endsWith('%');
    const number = isPercent ? text.slice(0, -1).trim() : text;

    if (!/^(\d+(\.\d*)?|\.\d+)$/.test(number)) {
        throw new Error(`COMMISSION_RATE must be a number such as 0.3 or 30 (meaning 30%), got "${raw}"`);
    }

    const value = parseFloat(number);
    const rate = isPercent || value > 1 ? value / 100 : value;

    if (!(rate >= 0 && rate <= 1)) {
        throw new Error(`COMMISSION_RATE must be between 0% and 100%, got "${raw}"`);
    }
    return rate;
}

/** The current commission rate as a fraction (0.3 = 30%). Throws if COMMISSION_RATE is set to something unusable. */
export function getCommissionRate(): number {
    return parseCommissionRate(process.env.COMMISSION_RATE);
}
