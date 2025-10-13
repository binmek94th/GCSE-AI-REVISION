'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/card";
import { Button } from "@/app/components/button";
import { BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import {useRouter} from "next/navigation";
import {onAuthStateChanged} from "firebase/auth";
import {auth} from "@/lib/firebase";
import Spinner from "@/app/components/Spinner";
import {loadStripe} from "@stripe/stripe-js";
import StudyMaterialTab from "@/app/dashboard/study_materials/StudyMaterialTab";

interface Subject {
    id: string;
    subject: string;
    progress: number;
    bought: boolean;
    practiceQuestions: string;
    chapters: number;
    pastPapers: string;
    videoLessons: string;
    price: number;
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);


export function StudyPackTab() {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [selectedPack, setSelectedPack] = useState<Subject | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [processingPayment, setProcessingPayment] = useState(false);
    const [packId, setPackId] = useState<string | null>()

    useEffect(() => {
        setLoading(true);
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/auth/login");
                return;
            }

            try {
                const idToken = await currentUser.getIdToken();

                const res = await fetch("/api/study-packs", {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                });

                const data = await res.json();

                if (res.ok) {
                    setSubjects(data);
                } else {
                    console.error(data.error);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return <Spinner></Spinner>
    }

    const handleBuy = (pack: Subject) => {
        setSelectedPack(pack);
        setModalOpen(true);
    };

    const handleCheckout = async () => {
        if (!selectedPack) return;
        setProcessingPayment(true);

        try {
            const idToken = await auth.currentUser?.getIdToken();
            const res = await fetch("/api/checkout-study-pack", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ packId: selectedPack.id }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Checkout failed");

            const stripe = await stripePromise;
            await stripe?.redirectToCheckout({ sessionId: data.sessionId });
        } catch (err) {
            console.error(err);
            setProcessingPayment(false);
        }
    };

    if (packId) {
        return <StudyMaterialTab setPackId={setPackId} packId={packId} />;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.map((subject, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>{subject.subject}</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span>Study Notes</span><span>{subject.chapters}</span></div>
                            <div className="flex justify-between"><span>Practice Questions</span><span>{subject.practiceQuestions}</span></div>
                            <div className="flex justify-between"><span>Video Lessons</span><span>{subject.videoLessons}</span></div>
                            <div className="flex justify-between"><span>Past Papers</span><span>{subject.pastPapers}</span></div>
                        </div>
                        {subject.bought ? (
                            <Button
                                onClick={() => {
                                    setPackId(subject.id);

                                }}
                                className={`w-full flex items-center justify-center 
                                        "bg-green-500 text-white hover:bg-green-600"
                                }`}
                            >
                                <BookOpen className="w-4 h-4 mr-2" />
                                Open Study Pack
                            </Button>
                        ) :
                            (
                                <Button onClick={() => handleBuy(subject)} className={"w-full flex items-center justify-center  bg-blue-500 text-white hover:bg-blue-600"}>
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Buy Study Pack - ${subject.price}
                                </Button>
                            )}

                    </CardContent>
                </Card>
            ))}
            {modalOpen && selectedPack && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-xl shadow-2xl w-96 max-w-full p-6 animate-scaleIn">
                        {/* Header */}
                        <div className="flex flex-col items-start space-y-2">
                            <h2 className="text-2xl font-bold text-gray-800">{selectedPack.subject}</h2>
                            <p className="text-gray-600">Complete your purchase to unlock this study pack.</p>
                        </div>

                        {/* Price */}
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-gray-700 font-medium">Price:</span>
                            <span className="text-lg font-semibold text-green-600">${selectedPack.price}</span>
                        </div>

                        {/* Buttons */}
                        <div className="mt-6 flex justify-end gap-3">
                            <Button
                                variant="outline"
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors rounded-lg"
                                onClick={() => setModalOpen(false)}
                                disabled={processingPayment}
                            >
                                Cancel
                            </Button>
                            <Button
                                className={`px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center justify-center`}
                                onClick={handleCheckout}
                                disabled={processingPayment}
                            >
                                {processingPayment ? "Processing..." : "Pay with Stripe"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}