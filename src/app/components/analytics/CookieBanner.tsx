'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { OPEN_SETTINGS_EVENT, saveConsent } from '@/lib/cookieConsent';
import { useCookieConsent } from './useCookieConsent';

// Accept and Reject are the same size and weight on purpose: refusing must be as easy as agreeing.
const BUTTON = 'rounded-lg px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors';

/**
 * The cookie banner (as described in our Cookie Policy): Accept All, Reject Non-Essential, or Customize.
 * Only analytics is optional; the site sets no advertising cookies. It doesn't block the page, only
 * appears once the page is up (so returning visitors never see it flash), and "Cookie settings" in the
 * footer brings it back so a choice can be changed.
 */
export default function CookieBanner() {
    const consent = useCookieConsent();
    const [mounted, setMounted] = useState(false);
    const [reopened, setReopened] = useState(false);
    const [customizing, setCustomizing] = useState(false);
    const [analytics, setAnalytics] = useState(false);

    useEffect(() => setMounted(true), []);

    useEffect(() => {
        const open = () => {
            setReopened(true);
            setCustomizing(true);
            setAnalytics(consent?.analytics ?? false);
        };
        window.addEventListener(OPEN_SETTINGS_EVENT, open);
        return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
    }, [consent]);

    if (!mounted || (consent !== null && !reopened)) return null;

    const choose = (allowAnalytics: boolean) => {
        saveConsent(allowAnalytics);
        setReopened(false);
        setCustomizing(false);
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4">
            <div
                role="region"
                aria-label="Cookie consent"
                className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl sm:p-5"
            >
                <h2 className="text-base font-semibold text-gray-900">Cookies on StudyCedo</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-700">
                    We use essential cookies to keep you signed in and your account secure. With your permission we&#39;d also use
                    analytics cookies (Google Analytics) to see how StudyCedo is used so we can improve it. We don&#39;t use advertising
                    cookies, and you can change your mind at any time. Read our{' '}
                    <Link href="/cookies" className="font-medium text-blue-600 underline">
                        Cookie Policy
                    </Link>
                    .
                </p>

                {customizing && (
                    <div className="mt-4 space-y-3 rounded-xl bg-gray-50 p-4">
                        <label className="flex items-start gap-3 text-sm">
                            <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4" aria-label="Essential cookies (always on)" />
                            <span>
                                <span className="font-semibold text-gray-900">Essential</span>
                                <span className="block text-gray-600">Needed for signing in and keeping your account secure. Always on.</span>
                            </span>
                        </label>
                        <label className="flex cursor-pointer items-start gap-3 text-sm">
                            <input
                                type="checkbox"
                                checked={analytics}
                                onChange={(e) => setAnalytics(e.target.checked)}
                                className="mt-0.5 h-4 w-4 cursor-pointer"
                                aria-label="Analytics cookies"
                            />
                            <span>
                                <span className="font-semibold text-gray-900">Analytics</span>
                                <span className="block text-gray-600">
                                    Google Analytics, to understand how the site is used (anonymised and combined with everyone else&#39;s).
                                </span>
                            </span>
                        </label>
                    </div>
                )}

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button onClick={() => choose(true)} className={`${BUTTON} bg-blue-600 text-white hover:bg-blue-700`}>
                        Accept all
                    </button>
                    <button onClick={() => choose(false)} className={`${BUTTON} bg-gray-900 text-white hover:bg-gray-700`}>
                        Reject non-essential
                    </button>
                    {customizing ? (
                        <button onClick={() => choose(analytics)} className={`${BUTTON} border border-gray-300 bg-white text-gray-900 hover:bg-gray-50`}>
                            Save preferences
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                setAnalytics(false);
                                setCustomizing(true);
                            }}
                            className={`${BUTTON} border border-gray-300 bg-white text-gray-900 hover:bg-gray-50`}
                        >
                            Customize
                        </button>
                    )}
                    {reopened && (
                        <button
                            onClick={() => {
                                setReopened(false);
                                setCustomizing(false);
                            }}
                            className="rounded-lg px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 cursor-pointer sm:ml-auto"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
