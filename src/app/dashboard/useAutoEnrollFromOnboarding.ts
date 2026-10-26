'use client';

import { useEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase';

interface Args {
    /** What /api/dashboard returned (null until it has loaded). */
    dashboardData: { studyPacks: unknown[] } | null;
    /** Re-reads the dashboard after packs were added. */
    refreshDashboard: () => Promise<void>;
    /** Nothing could be added from onboarding — send the student to pick packs themselves. */
    onNothingEnrolled: () => void;
}

/**
 * A student with no study packs yet is normally sent to the Study Pack tab to
 * add some. But if they already chose their subjects in onboarding, those ARE
 * their study packs — so enrol them (and build the plan) first, and only fall
 * back to the Study Pack tab if there was nothing to add.
 *
 * Returns true while that set-up is running.
 */
export function useAutoEnrollFromOnboarding({ dashboardData, refreshDashboard, onNothingEnrolled }: Args): boolean {
    const [settingUp, setSettingUp] = useState(false);
    // idle -> running -> done. Kept in a ref so React's development double-run of
    // effects can't start it twice or jump ahead while it's still working.
    const phase = useRef<'idle' | 'running' | 'done'>('idle');
    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!dashboardData || dashboardData.studyPacks.length > 0) return;
        if (phase.current === 'running') return; // already working on it

        // Tried already and there's still nothing: the normal behaviour.
        if (phase.current === 'done') {
            onNothingEnrolled();
            return;
        }

        phase.current = 'running';
        (async () => {
            setSettingUp(true);
            let added = 0;
            try {
                const user = auth.currentUser;
                if (user) {
                    const idToken = await user.getIdToken();
                    const res = await fetch('/api/onboarding/enroll', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${idToken}` },
                    });
                    if (res.ok) added = (await res.json()).enrolled ?? 0;
                }
            } catch (err) {
                console.error('Could not set up study packs from onboarding:', err);
            }
            phase.current = 'done';

            if (added > 0) {
                try {
                    // New data arrives with the packs in it, so this effect then stops early.
                    await refreshDashboard();
                } catch (err) {
                    console.error('Could not refresh the dashboard:', err);
                }
            }
            if (mounted.current) {
                setSettingUp(false);
                if (added === 0) onNothingEnrolled();
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dashboardData]);

    return settingUp;
}
