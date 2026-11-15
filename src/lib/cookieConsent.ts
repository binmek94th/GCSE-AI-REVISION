// src/lib/cookieConsent.ts
//
// The visitor's cookie choice, stored in a first-party cookie called `cookie_consent`
// (1 year) — the name and lifetime our Cookie Policy (/cookies) already publishes.
//
// Only analytics is optional: the site sets no advertising cookies. "Essential" cookies
// (sign-in, security) don't need consent and aren't covered here.

export const CONSENT_COOKIE = 'cookie_consent';
export const CONSENT_VERSION = 1; // bump to ask everyone again (e.g. if a new kind of cookie is added)
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Fired (on window) after a choice is saved, so banner and analytics react at once. */
export const CONSENT_CHANGED_EVENT = 'studycedo:cookie-consent-changed';
/** Fired to open the cookie settings again ("Cookie settings" in the footer). */
export const OPEN_SETTINGS_EVENT = 'studycedo:open-cookie-settings';

export interface ConsentChoice {
    v: number;
    analytics: boolean;
    at: string; // when they chose (ISO), for our records
}

/** The raw cookie string for `name`, or null. */
export function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    for (const part of document.cookie.split(';')) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
    }
    return null;
}

/** Reads a stored choice. Anything missing, corrupted or from an older version counts as "not chosen yet". */
export function parseConsent(raw: string | null | undefined): ConsentChoice | null {
    if (!raw) return null;
    try {
        const data = JSON.parse(decodeURIComponent(raw));
        if (data && data.v === CONSENT_VERSION && typeof data.analytics === 'boolean') {
            return { v: data.v, analytics: data.analytics, at: typeof data.at === 'string' ? data.at : '' };
        }
    } catch {
        /* fall through */
    }
    return null;
}

export const readConsent = (): ConsentChoice | null => parseConsent(getCookie(CONSENT_COOKIE));

/** Saves the choice for a year and tells the rest of the page. */
export function saveConsent(analytics: boolean): ConsentChoice {
    const choice: ConsentChoice = { v: CONSENT_VERSION, analytics, at: new Date().toISOString() };
    const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
    document.cookie =
        `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(choice))}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax${secure}`;
    window.dispatchEvent(new Event(CONSENT_CHANGED_EVENT));
    return choice;
}

export const openCookieSettings = () => window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));

// Google Analytics cookies: _ga, _ga_<ID>, _gid, _gat, _gat_gtag_<ID>
const ANALYTICS_COOKIE_RE = /^(_ga(_.+)?|_gid|_gat(_.+)?)$/;

/**
 * Removes the Google Analytics cookies already on the visitor's browser (used when they
 * withdraw consent). Google sets them on the registrable domain (e.g. .studycedo.com), so each
 * is expired for the host and every parent domain.
 */
export function clearAnalyticsCookies() {
    if (typeof document === 'undefined') return;
    const names = document.cookie
        .split(';')
        .map((c) => c.split('=')[0].trim())
        .filter((n) => ANALYTICS_COOKIE_RE.test(n));
    if (names.length === 0) return;

    const host = location.hostname;
    const parts = host.split('.');
    const domains = new Set<string | undefined>([undefined, host, '.' + host]);
    for (let i = 1; i < parts.length - 1; i++) {
        const parent = parts.slice(i).join('.');
        domains.add(parent);
        domains.add('.' + parent);
    }
    for (const name of names) {
        for (const domain of domains) {
            document.cookie = `${name}=; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Path=/${domain ? `; Domain=${domain}` : ''}`;
        }
    }
}
