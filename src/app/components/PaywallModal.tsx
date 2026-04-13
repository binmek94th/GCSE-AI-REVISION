'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { Lock, Zap, BookOpen, Brain, ClipboardList, X } from 'lucide-react';

interface PaywallModalProps {
    isOpen: boolean;
    onClose: () => void;
    featureName?: string; // e.g. "Study Plans", "Quizzes"
}

const FEATURES = [
    { icon: BookOpen, label: 'Unlimited Study Packs' },
    { icon: Brain,     label: 'AI Tutor — ask anything' },
    { icon: ClipboardList, label: 'Quizzes & Mock Tests' },
    { icon: Zap,       label: 'Personalised Study Plans' },
];

export function PaywallModal({ isOpen, onClose, featureName }: PaywallModalProps) {
    const router = useRouter();
    const overlayRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Lock scroll
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleUpgrade = () => {
        onClose();
        router.push('/dashboard/subscription');
    };

    return (
        <div
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                padding: '1rem',
                animation: 'fadeIn 0.15s ease',
            }}
        >
            <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>

            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '2.5rem 2rem 2rem',
                    maxWidth: '440px',
                    width: '100%',
                    position: 'relative',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
                    animation: 'slideUp 0.2s ease',
                }}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: '#f1f5f9',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#64748b',
                    }}
                >
                    <X size={16} />
                </button>

                {/* Lock icon */}
                <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                    <div
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                            marginBottom: '1rem',
                            boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
                        }}
                    >
                        <Lock size={28} color="#fff" />
                    </div>
                    <h2
                        style={{
                            margin: '0 0 0.5rem',
                            fontSize: '1.375rem',
                            fontWeight: 700,
                            color: '#0f172a',
                        }}
                    >
                        {featureName ? `${featureName} is a Premium Feature` : 'Upgrade to Unlock Everything'}
                    </h2>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Get unlimited access to all study tools and start hitting your target grades.
                    </p>
                </div>

                {/* Feature list */}
                <ul
                    style={{
                        listStyle: 'none',
                        margin: '0 0 1.75rem',
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.625rem',
                    }}
                >
                    {FEATURES.map(({ icon: Icon, label }) => (
                        <li
                            key={label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                background: '#f0f9ff',
                                borderRadius: '10px',
                                padding: '0.625rem 0.875rem',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#0f172a',
                            }}
                        >
                            <Icon size={16} color="#0EA5E9" />
                            {label}
                        </li>
                    ))}
                </ul>

                {/* CTA */}
                <button
                    onClick={handleUpgrade}
                    style={{
                        width: '100%',
                        padding: '0.875rem',
                        background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(14,165,233,0.35)',
                        transition: 'opacity 0.15s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
                    onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
                >
                    View Plans & Pricing
                </button>

                <p style={{ textAlign: 'center', fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                    Cancel anytime · No hidden fees
                </p>
            </div>
        </div>
    );
}