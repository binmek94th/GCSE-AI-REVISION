'use client'
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from '@/lib/firebase';
import Spinner from "@/app/components/Spinner";
import { useRouter, useSearchParams } from "next/navigation";

interface Package {
    id: string;
    name: string;
    monthly_price: number;
    yearly_price: number;
}

export default function BuyTokenComponent() {
    const [pkg, setPkg] = useState<Package | null>(null);
    const [loading, setLoading] = useState(true);
    const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('month'); // monthly by default
    const router = useRouter();
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
        if (pkg) {
            router.push(`token/checkout?packageId=${pkg.id}&billing=${billingCycle}&redirectTo=${redirectTo}`);
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
                    Enhance your learning experience, track your progress, and get instant help whenever you need it.
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
