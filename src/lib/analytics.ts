// src/lib/analytics.ts
//
// Google Analytics 4 setup. The measurement ID comes from NEXT_PUBLIC_GA_MEASUREMENT_ID (e.g.
// "G-ABC123XYZ"); with it unset (local development, preview deployments) nothing is loaded.

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '';

/** A GA4 measurement ID looks like G-XXXXXXXXXX. Anything else is treated as "not configured". */
export const isValidMeasurementId = (id: string) => /^G-[A-Z0-9]{4,20}$/.test(id);

// Staff pages: never measured (and their addresses, which include record ids, never sent to Google).
const EXCLUDED_PREFIXES = ['/admin'];
export const isExcludedPath = (pathname: string | null | undefined) =>
    !!pathname && EXCLUDED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

/**
 * The inline setup that runs after Google's script loads. This is only ever put on the page once a
 * visitor has said yes to analytics cookies, so analytics storage is granted; everything to do with
 * advertising stays denied, and Google signals / ad personalisation are off (students, including
 * under-18s, use this site and we don't advertise).
 */
export function buildGaInitScript(id: string): string {
    const safeId = JSON.stringify(id);
    return `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  analytics_storage: 'granted',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied'
});
gtag('js', new Date());
gtag('config', ${safeId}, {
  allow_google_signals: false,
  allow_ad_personalization_signals: false
});
`;
}

/** Google's documented switch: with this set to true, gtag stops sending data for that ID. */
export function setGaDisabled(id: string, disabled: boolean) {
    (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = disabled;
}
