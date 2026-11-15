'use client';

import { openCookieSettings } from '@/lib/cookieConsent';

/** "Cookie settings" — reopens the cookie banner so a visitor can change their choice (footer, cookie policy). */
export default function CookieSettingsButton({ className, children }: { className?: string; children?: React.ReactNode }) {
    return (
        <button type="button" onClick={openCookieSettings} className={className ?? 'cursor-pointer'}>
            {children ?? 'Cookie settings'}
        </button>
    );
}
