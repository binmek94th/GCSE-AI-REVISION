"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, Lock, CheckCircle2 } from "lucide-react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const CARD_ELEMENT_OPTIONS = {
    style: {
        base: {
            color: "#0F172A",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: "16px",
            fontWeight: "400",
            "::placeholder": { color: "#475569" },
        },
        invalid: { color: "#EF4444", iconColor: "#EF4444" },
    },
    hidePostalCode: false,
};

function InnerForm() {
    const stripe = useStripe();
    const elements = useElements();
    const searchParams = useSearchParams();
    const packageId = searchParams.get("packageId");
    const billing = searchParams.get("billing") || "monthly";
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const redirectTo = searchParams.get("redirectTo") || "/dashboard";

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => setUser(currentUser));
        return () => unsubscribe();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        if (!packageId) return toast.error("Package ID is missing.");
        if (!user) return router.push("/auth/login");

        const idToken = await user.getIdToken();
        if (!idToken) return router.push("/auth/login");

        setLoading(true);

        try {
            const res = await fetch("/api/create-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ packageId, billing }),
            });

            const data = await res.json();
            if (data.error) return toast.error(data.error);

            const cardElement = elements.getElement(CardElement);
            if (!cardElement) return toast.error("Card information is missing.");

            const clientSecret = data.clientSecret;
            if (!clientSecret) {
                toast.success("Subscription created! Payment method will be used for future invoices.");
                setTimeout(() => router.push(redirectTo), 2000);
                return;
            }

            // Confirm the payment or setup intent depending on subscription type
            let result;
            if (data.subscriptionRequiresSetup) {
                // SetupIntent flow for future payments
                result = await stripe.confirmCardSetup(clientSecret, {
                    payment_method: { card: cardElement },
                });
            } else {
                // Immediate payment
                result = await stripe.confirmCardPayment(clientSecret, {
                    payment_method: { card: cardElement },
                });
            }

            if (result.error) {
                toast.error(result.error.message);
            } else {
                toast.success("Subscription successful! Redirecting...");
                if (redirectTo) setTimeout(() => router.push(redirectTo), 2000);
                else setTimeout(() => router.push("/dashboard"), 2000);
            }
        } catch (err) {
            console.error(err);
            toast.error("Subscription failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-card border border-border rounded-lg shadow-lg p-8">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                            <CreditCard className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-card-foreground mb-2">Complete Your Subscription</h2>
                        <p className="text-muted-foreground text-sm">
                            Secure subscription powered by Stripe
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-card-foreground mb-2">Card Details</label>
                            <div className="border border-border rounded-lg p-4 bg-input-background hover:border-primary transition-colors">
                                <CardElement options={CARD_ELEMENT_OPTIONS} />
                            </div>
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
                            <Lock className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-foreground font-medium">Secure Payment</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Your payment information is encrypted and secure
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {["Instant access to resources", "Auto-renewal subscription", "24/7 support"].map(
                                (feature, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-accent" />
                                        <span className="text-sm text-muted-foreground">{feature}</span>
                                    </div>
                                )
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !stripe}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                                loading || !stripe
                                    ? "bg-muted text-muted-foreground cursor-not-allowed"
                                    : "bg-primary text-primary-foreground hover:bg-primary-dark shadow-sm hover:shadow-md"
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Processing...
                </span>
                            ) : (
                                "Subscribe Now"
                            )}
                        </button>

                        <p className="text-xs text-center text-muted-foreground">
                            By subscribing, you agree to our Terms of Service
                        </p>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground mb-2">
                        Trusted by thousands of users worldwide
                    </p>
                    <div className="flex items-center justify-center gap-4 opacity-60">
                        <span className="text-xs text-muted-foreground">🔒 SSL Secure</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">💳 PCI Compliant</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutForm() {
    return (
        <Elements stripe={stripePromise}>
            <InnerForm />
        </Elements>
    );
}
