'use client'
import { Suspense, useEffect, useState } from 'react';
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from '@/lib/firebase';
import Spinner from "@/app/components/ui/Spinner";
import { useSearchParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import { toast } from "sonner";
import { Check, Zap, BookOpen, Brain, FileText, Clock } from 'lucide-react';

interface Package {
    id: string;
    name: string;
    monthly_price: number;
    yearly_price: number;
}

const FEATURES = [
    { icon: Brain,    text: 'Unlimited AI tutoring sessions' },
    { icon: BookOpen, text: 'Full access to all study packs' },
    { icon: FileText, text: 'Past papers & mark schemes' },
    { icon: Zap,      text: 'Instant AI-generated study plans' },
    { icon: Check,    text: 'Practice questions with explanations' },
    { icon: Clock,    text: 'Progress tracking & analytics' },
];

function BuyTokenComponent() {
    const [pkg, setPkg] = useState<Package | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
    const searchParams = useSearchParams();

    useEffect(() => {
        const fetchPackage = async () => {
            try {
                const q = query(collection(db, 'packages'), limit(1));
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const doc = snapshot.docs[0];
                    setPkg({ id: doc.id, ...doc.data() } as Package);
                }
            } catch (error) {
                console.error("Error fetching package:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPackage();
    }, []);

    const handlePurchase = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user) { toast.error("You must be logged in to purchase."); return; }

        setPurchasing(true);
        try {
            const idToken = await user.getIdToken();
            const response = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    userId: user.uid,
                    billing: billingCycle,
                    redirectTo: searchParams.get("redirectTo"),
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to create checkout session");
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL received");
            }
        } catch (error: any) {
            console.error("Error creating checkout:", error);
            toast.error(`Failed to start checkout: ${error.message}`);
            setPurchasing(false);
        }
    };

    if (loading) return <Spinner />;
    if (!pkg) return (
        <p style={{ textAlign: 'center', marginTop: '3rem', color: '#64748b' }}>
            No subscription plan available at the moment. Please check back later.
        </p>
    );

    const yearlyMonthly = pkg.yearly_price / 12;
    const yearlySaving = Math.round(100 - (yearlyMonthly / pkg.monthly_price) * 100);
    const displayPrice = billingCycle === 'month' ? pkg.monthly_price : yearlyMonthly.toFixed(2);

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
        }}>
            <div style={{ width: '100%', maxWidth: '480px' }}>

                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '64px', height: '64px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                        boxShadow: '0 8px 24px rgba(14,165,233,0.3)',
                        marginBottom: '1rem',
                    }}>
                        <Zap size={28} color="#fff" />
                    </div>
                    <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>
                        Unlock {pkg.name}
                    </h1>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: 1.6 }}>
                        Everything you need to ace your GCSEs — study materials, AI tutoring, and past papers.
                    </p>
                </div>

                {/* Card */}
                <div style={{
                    background: '#fff',
                    borderRadius: '20px',
                    boxShadow: '0 4px 32px rgba(14,165,233,0.10)',
                    border: '1.5px solid #e0f2fe',
                    overflow: 'hidden',
                }}>
                    {/* Billing toggle */}
                    <div style={{
                        display: 'flex',
                        background: '#f8fafc',
                        borderBottom: '1px solid #e2e8f0',
                        padding: '1rem',
                        gap: '0.5rem',
                    }}>
                        {(['month', 'year'] as const).map((cycle) => (
                            <button
                                key={cycle}
                                onClick={() => setBillingCycle(cycle)}
                                disabled={purchasing}
                                style={{
                                    flex: 1,
                                    padding: '0.6rem 0.5rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.875rem',
                                    cursor: purchasing ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.15s',
                                    background: billingCycle === cycle
                                        ? 'linear-gradient(135deg, #0EA5E9, #0284C7)'
                                        : 'transparent',
                                    color: billingCycle === cycle ? '#fff' : '#64748b',
                                    boxShadow: billingCycle === cycle
                                        ? '0 2px 8px rgba(14,165,233,0.25)'
                                        : 'none',
                                    position: 'relative',
                                }}
                            >
                                {cycle === 'month' ? 'Monthly' : 'Yearly'}
                                {cycle === 'year' && (
                                    <span style={{
                                        marginLeft: '0.4rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        background: billingCycle === 'year' ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                                        color: billingCycle === 'year' ? '#fff' : '#16a34a',
                                        padding: '0.1rem 0.4rem',
                                        borderRadius: '99px',
                                    }}>
                                        -{yearlySaving}%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Price */}
                    <div style={{ padding: '1.75rem 1.75rem 0', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.25rem' }}>
                            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                                £{displayPrice}
                            </span>
                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>/mo</span>
                        </div>
                        {billingCycle === 'year' && (
                            <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                                Billed £{pkg.yearly_price} annually · Save £{((pkg.monthly_price * 12) - pkg.yearly_price).toFixed(2)}/yr
                            </p>
                        )}
                    </div>

                    {/* Features */}
                    <div style={{ padding: '1.5rem 1.75rem' }}>
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {FEATURES.map(({ icon: Icon, text }) => (
                                <li key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '28px', height: '28px', borderRadius: '8px',
                                        background: '#f0f9ff', flexShrink: 0,
                                    }}>
                                        <Icon size={14} color="#0EA5E9" />
                                    </div>
                                    <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>{text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* CTA */}
                    <div style={{ padding: '0 1.75rem 1.75rem' }}>
                        <button
                            onClick={handlePurchase}
                            disabled={purchasing}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: purchasing
                                    ? '#cbd5e1'
                                    : 'linear-gradient(135deg, #0EA5E9, #0284C7)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1rem',
                                fontWeight: 700,
                                cursor: purchasing ? 'not-allowed' : 'pointer',
                                boxShadow: purchasing ? 'none' : '0 4px 16px rgba(14,165,233,0.35)',
                                transition: 'all 0.15s',
                            }}
                        >
                            {purchasing ? 'Redirecting to checkout…' : `Start Learning — £${displayPrice}/mo`}
                        </button>
                        <p style={{
                            textAlign: 'center', margin: '0.75rem 0 0',
                            fontSize: '0.75rem', color: '#94a3b8',
                        }}>
                            Cancel anytime · Secure payment via Stripe
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BuyTokenPage() {
    return (
        <Suspense fallback={<Spinner />}>
            <BuyTokenComponent />
        </Suspense>
    );
}