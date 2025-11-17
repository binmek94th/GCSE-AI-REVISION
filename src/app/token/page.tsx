'use client'
import {Suspense, useEffect, useState} from 'react';
import {collection, getDocs, limit, query} from "firebase/firestore";
import {db} from '@/lib/firebase';
import Spinner from "@/app/components/Spinner";
import {useSearchParams} from "next/navigation";
import {getAuth} from "firebase/auth";
import {toast} from "sonner";

interface Package {
    id: string;
    name: string;
    monthly_price: number;
    yearly_price: number;
}

function BuyTokenComponent() {
    const [pkg, setPkg] = useState<Package | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month');
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get("redirectTo");

    useEffect(() => {
        const fetchPackage = async () => {
            try {
                const q = query(
                    collection(db, 'packages'),
                    limit(1)
                );
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

        if (!user) {
            toast.error("You must be logged in to purchase.");
            return;
        }

        setPurchasing(true);

        try {
            // Get ID token for authentication
            const idToken = await user.getIdToken();

            // Create checkout session via API
            const response = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    userId: user.uid,
                    billing: billingCycle,
                    redirectTo: redirectTo || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create checkout session");
            }

            // Redirect to Stripe checkout
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

    if (!pkg) return <p className="text-center mt-12 text-gray-600">No subscription plan available at the moment. Please check back later.</p>;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-6">
            <div className="bg-white border-2 rounded-xl p-10 shadow-xl w-full max-w-lg text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">{pkg.name}</h2>
                <p className="text-gray-700 mb-6">
                    Unlock full access to your AI Study Assistant and premium resources.
                    Enhance your learning experience, and get instant help whenever you need it.
                </p>

                <div className="mb-6">
                    <span className="text-2xl font-extrabold text-primary">
                        ${billingCycle === 'month' ? pkg.monthly_price : pkg.yearly_price}
                    </span>
                    <span className="text-gray-600 ml-2">
                        / {billingCycle === 'month' ? 'month' : 'year'}
                    </span>
                </div>

                <div className="flex justify-center gap-4 mb-8">
                    <button
                        onClick={() => setBillingCycle('month')}
                        disabled={purchasing}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            billingCycle === 'month'
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 text-gray-700'
                        } ${purchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('year')}
                        disabled={purchasing}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                            billingCycle === 'year'
                                ? 'bg-primary text-white'
                                : 'bg-gray-200 text-gray-700'
                        } ${purchasing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Yearly
                    </button>
                </div>

                <ul className="text-left mb-8 space-y-2 text-gray-700">
                    <li>✓ Unlimited AI tutoring sessions</li>
                </ul>

                <button
                    onClick={handlePurchase}
                    disabled={purchasing}
                    className={`px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary-dark transition-all shadow-lg ${
                        purchasing ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {purchasing ? 'Creating checkout...' : 'Purchase Now & Start Learning'}
                </button>
            </div>
        </div>
    );
}

export default function BuyTokenPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
            <BuyTokenComponent />
        </Suspense>
    );
}