'use client'
import { useState } from 'react';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';

interface Props {
    onSubmit: (email: string) => Promise<void>;
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export default function EmailGate({ onSubmit }: Props) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValidEmail(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            await onSubmit(email.trim());
        } catch (err) {
            console.error('Error saving email:', err);
            setError('Something went wrong saving that — please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '2rem',
            maxWidth: 460,
            margin: '0 auto',
            textAlign: 'center'
        }}>
            <div style={{
                width: 48, height: 48, borderRadius: '50%',
                backgroundColor: '#F0F9FF', border: '1px solid #BAE6FD',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px'
            }}>
                <Mail style={{ width: 22, height: 22, color: '#0EA5E9' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                Your results are ready
            </h2>
            <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                Enter your email so we can show you your personalised study plan — you can save it to an account later.
            </p>

            <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoFocus
                    style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        border: error ? '1.5px solid #DC2626' : '1px solid #E2E8F0',
                        fontSize: 14,
                        color: '#0F172A',
                        marginBottom: 8,
                        boxSizing: 'border-box'
                    }}
                />
                {error && (
                    <p style={{ fontSize: 13, color: '#DC2626', marginBottom: 8 }}>{error}</p>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '11px 22px',
                        borderRadius: 8,
                        border: 'none',
                        backgroundColor: '#0EA5E9',
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        marginTop: 4
                    }}
                >
                    {loading ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : (
                        <>
                            Show my results
                            <ArrowRight style={{ width: 16, height: 16 }} />
                        </>
                    )}
                </button>
            </form>

            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 14 }}>
                No account needed yet — we&#39;ll just use this to send you your plan.
            </p>
        </div>
    );
}
