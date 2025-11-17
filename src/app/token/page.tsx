'use client'
import {Suspense, useEffect, useState} from 'react';
import {collection, getDocs, limit, query} from "firebase/firestore";
import {db} from '@/lib/firebase';
import Spinner from "@/app/components/Spinner";
import {useSearchParams} from "next/navigation";
import {getAuth} from "firebase/auth";

interface Package {
    id: string;
    name: string;
    monthly_price: number;
    yearly_price: number;
}

function BuyTokenComponent() {
    const [pkg, setPkg] = useState<Package | null>(null);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month'); // monthly by default
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

    const handlePurchase = () => {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            alert("You must be logged in to purchase.");
            return;
        }

        const payload = {
            userId: user.uid,
            billing: billingCycle,
            redirectTo: redirectTo || null,
        };

        const encoded = btoa(JSON.stringify(payload));

        const stripeUrl =
            billingCycle === "month"
                ? "https://buy.stripe.com/test_4gMbJ3b0g1ZY3qv4qRbV601"
                : "https://buy.stripe.com/test_28EaEZ3xOcEC0ejbTjbV600";

        window.location.href = `${stripeUrl}?client_reference_id=${encoded}`;
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
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${billingCycle === 'month' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingCycle('year')}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${billingCycle === 'year' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                        Yearly
                    </button>
                </div>

                <ul className="text-left mb-8 space-y-2 text-gray-700">
                    <li>Unlimited AI tutoring sessions</li>
                </ul>

                <button
                    onClick={handlePurchase}
                    className="px-8 py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg hover:bg-primary-dark transition-all shadow-lg"
                >
                    Purchase Now & Start Learning
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