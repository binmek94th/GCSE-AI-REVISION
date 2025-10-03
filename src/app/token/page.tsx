'use client'
import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from '@/lib/firebase';
import { Check } from 'lucide-react';
import Spinner from "@/app/components/Spinner";
import {useRouter, useSearchParams} from "next/navigation";

interface Package {
    id: string;
    name: string;
    tokens: number;
    price: number;
    popular: boolean;
    features: string[];
}

export default function BuyTokenComponent() {
    const [packages, setPackages] = useState<Package[]>([]);
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const redirectTo = searchParams.get("redirectTo");

    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const q = query(collection(db, 'packages'), orderBy('price', 'asc'));

                const querySnapshot = await getDocs(q);
                const data: Package[] = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Package[];

                setPackages(data);
            } catch (error) {
                console.error('Error fetching packages:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPackages();

    }, []);

    const handleSelect = (packageId: string) => {
        setSelectedPackage(packageId);
    };

    const handlePurchase = () => {
        if (selectedPackage) {
            const pkg = packages.find(p => p.id === selectedPackage);
            console.log(pkg)
            router.push(`token/checkout?packageId=${pkg?.id}&redirectTo=${redirectTo}`);
        }
    };

    if (loading) {
        return <Spinner></Spinner>;
    }

    return (
        <div className="min-h-screen bg-background p-12">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-foreground mb-3">Buy Token Packages</h1>
                    <p className="text-muted-foreground text-lg">
                        Choose the perfect package for your needs
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {packages.map((pkg) => (
                        <div
                            key={pkg.id}
                            onClick={() => handleSelect(pkg.id)}
                            className={`relative bg-card border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                                selectedPackage === pkg.id
                                    ? 'border-primary scale-105 shadow-xl'
                                    : 'border-border'
                            }`}
                        >
                            {pkg.popular && (
                                <div className="absolute -top-3 right-6 bg-accent text-accent-foreground px-3 py-1 rounded-full text-xs font-medium">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-4">
                                <h3 className="text-card-foreground mb-2">{pkg.name}</h3>
                                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold text-primary">
                    ${pkg.price}
                  </span>
                                </div>
                                <p className="text-muted-foreground text-sm mt-1">
                                    {pkg.tokens.toLocaleString()} tokens
                                </p>
                            </div>

                            <div className="border-t border-border pt-4 mt-4">
                                {pkg.features.map((feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2 mb-3">
                                        <Check size={16} className="text-accent flex-shrink-0" />
                                        <span className="text-card-foreground text-sm">
                      {feature}
                    </span>
                                    </div>
                                ))}
                            </div>

                            {selectedPackage === pkg.id && (
                                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                    <Check size={16} className="text-primary-foreground" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={handlePurchase}
                        disabled={!selectedPackage}
                        className={`px-8 py-3 rounded-lg border-none font-medium text-base transition-all duration-200 ${
                            selectedPackage
                                ? 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary-dark'
                                : 'bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                        }`}
                    >
                        Purchase Now
                    </button>
                </div>
            </div>
        </div>
    );
}
