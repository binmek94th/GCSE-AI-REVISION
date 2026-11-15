'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { CONSENT_CHANGED_EVENT, CONSENT_COOKIE, ConsentChoice, getCookie, parseConsent } from '@/lib/cookieConsent';

const subscribe = (onChange: () => void) => {
    window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
};
// The raw cookie text is the snapshot: a plain string compares by value, so React only re-renders
// when the choice actually changes. On the server there's no cookie to read, so nobody has chosen.
const getSnapshot = () => getCookie(CONSENT_COOKIE) ?? '';
const getServerSnapshot = () => '';

/** The visitor's current cookie choice (null = hasn't chosen yet), kept up to date as it changes. */
export function useCookieConsent(): ConsentChoice | null {
    const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    return useMemo(() => parseConsent(raw), [raw]);
}
