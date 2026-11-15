'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { GA_MEASUREMENT_ID, buildGaInitScript, isExcludedPath, isValidMeasurementId, setGaDisabled } from '@/lib/analytics';
import { clearAnalyticsCookies } from '@/lib/cookieConsent';
import { useCookieConsent } from './useCookieConsent';

/**
 * Google Analytics, loaded ONLY after the visitor has accepted analytics cookies.
 *  - Before a choice (and after "Reject"), Google's script isn't even requested and no analytics
 *    cookies are set. The server never sends it either: consent lives in the browser.
 *  - Page views for every page and navigation come from GA4's built-in "Enhanced measurement".
 *  - Staff pages (/admin) are never measured.
 *  - If the visitor later withdraws consent, sending stops at once and the Google cookies are removed.
 */
export default function Analytics() {
    const consent = useCookieConsent();
    const pathname = usePathname();

    const id = GA_MEASUREMENT_ID;
    const configured = isValidMeasurementId(id);
    const allowed = configured && consent?.analytics === true;
    const excluded = isExcludedPath(pathname);

    // Keep Google's own switches in step with the choice and the page we're on.
    useEffect(() => {
        if (!configured) return;
        setGaDisabled(id, !allowed || excluded);
        const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
        gtag?.('consent', 'update', { analytics_storage: allowed ? 'granted' : 'denied' });
    }, [configured, id, allowed, excluded]);

    // Withdrawn (or rejected): remove any Google cookies that are already there.
    useEffect(() => {
        if (configured && consent && consent.analytics === false) clearAnalyticsCookies();
    }, [configured, consent]);

    if (!allowed || excluded) return null;

    return (
        <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
                {buildGaInitScript(id)}
            </Script>
        </>
    );
}
