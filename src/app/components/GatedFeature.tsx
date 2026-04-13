'use client';

import { useState } from 'react';
import { useSubscriptionGate } from '@/hooks/useSubscriptionGate';
import { PaywallModal } from '@/app/components/PaywallModal';
import { Lock, Clock } from 'lucide-react';

interface GatedFeatureProps {
    children: React.ReactNode;
    featureName?: string;
    mode?: 'block' | 'modal';
}

export function GatedFeature({ children, featureName, mode = 'block' }: GatedFeatureProps) {
    const { isLoading, hasAccess, isTrialing, trialDaysRemaining } = useSubscriptionGate();
    const [showPaywall, setShowPaywall] = useState(false);

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                <div style={{
                    width: '32px', height: '32px',
                    border: '3px solid #e2e8f0', borderTopColor: '#0EA5E9',
                    borderRadius: '50%', animation: 'spin 0.7s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>
        );
    }

    if (hasAccess) {
        return (
            <>
                {/* Trial banner — shown only during the free trial period */}
                {isTrialing && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: '0.75rem', padding: '0.65rem 1rem',
                        background: 'linear-gradient(90deg, #f0f9ff, #e0f2fe)',
                        border: '1px solid #bae6fd', borderRadius: '10px',
                        marginBottom: '1rem', flexWrap: 'wrap',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Clock size={15} color="#0284C7" />
                            <span style={{ fontSize: '0.8rem', color: '#0369a1', fontWeight: 600 }}>
                                Free trial — {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
                            </span>
                        </div>
                        <button
                            onClick={() => setShowPaywall(true)}
                            style={{
                                padding: '0.35rem 0.9rem', fontSize: '0.78rem', fontWeight: 700,
                                background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                                color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
                            }}
                        >
                            Upgrade now
                        </button>
                    </div>
                )}
                {children}
                <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} featureName={featureName} />
            </>
        );
    }

    // --- NO ACCESS ---

    if (mode === 'modal') {
        return (
            <>
                <div onClick={() => setShowPaywall(true)}
                     style={{ cursor: 'pointer', position: 'relative', userSelect: 'none' }}>
                    <div style={{ pointerEvents: 'none', opacity: 0.4, filter: 'blur(1px)' }}>
                        {children}
                    </div>
                    <div style={{
                        position: 'absolute', inset: 0, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(255,255,255,0.6)', borderRadius: '12px',
                    }}>
                        <Lock size={24} color="#0EA5E9" />
                    </div>
                </div>
                <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} featureName={featureName} />
            </>
        );
    }

    return (
        <>
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center',
                background: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0',
                minHeight: '280px',
            }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                    marginBottom: '1rem', boxShadow: '0 6px 20px rgba(14,165,233,0.25)',
                }}>
                    <Lock size={24} color="#fff" />
                </div>
                <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' }}>
                    {featureName ? `${featureName} — Premium Only` : 'Premium Feature'}
                </h3>
                <p style={{ margin: '0 0 1.5rem', color: '#64748b', fontSize: '0.875rem', maxWidth: '300px' }}>
                    Your free trial has ended. Upgrade to continue using {featureName ?? 'this feature'}.
                </p>
                <button
                    onClick={() => setShowPaywall(true)}
                    style={{
                        padding: '0.75rem 1.75rem',
                        background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                        color: '#fff', border: 'none', borderRadius: '10px',
                        fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
                    }}
                >
                    Upgrade Now
                </button>
            </div>
            <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} featureName={featureName} />
        </>
    );
}