"use client";

import {Suspense, useEffect, useState} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function CancelledPurchasePageEnhanced() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [countdown, setCountdown] = useState(10);
    const [isVisible, setIsVisible] = useState(false);
    const canceled = searchParams.get("canceled");

    useEffect(() => {
        setIsVisible(true);

        if (!canceled) {
            router.push("/dashboard");
            return;
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push("/dashboard?tab=studypack");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [canceled, router]);

    if (!canceled) {
        return null;
    }

    const handleStayOnPage = () => {
        setCountdown(1999);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
            </div>

            <div
                className={`relative max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center transform transition-all duration-500 ${
                    isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
                }`}
            >
                <div className="mb-6 relative">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full flex items-center justify-center animate-pulse-slow">
                        <svg
                            className="w-10 h-10 text-yellow-600 animate-bounce-slow"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    {/* Decorative ring */}
                    <div className="absolute inset-0 mx-auto w-20 h-20 border-4 border-yellow-200 rounded-full animate-ping-slow opacity-75"></div>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text">
                    Purchase Cancelled
                </h1>

                {/* Message */}
                <p className="text-gray-600 mb-2 leading-relaxed">
                    No worries! Your payment was not processed.
                </p>
                <p className="text-gray-500 text-sm mb-6">
                    You can return to browse our study materials whenever you&#39;re ready.
                </p>

                {/* Countdown with progress bar */}
                {countdown < 999 && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl border border-gray-200">
                        <p className="text-sm text-gray-600 mb-3">
                            Redirecting to subjects in{" "}
                            <span className="font-bold text-indigo-600 text-lg">
                                {countdown}
                            </span>{" "}
                            seconds...
                        </p>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-linear"
                                style={{
                                    width: `${((10 - countdown) / 10) * 100}%`,
                                }}
                            ></div>
                        </div>
                        <button
                            onClick={handleStayOnPage}
                            className="mt-3 text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                            Stop auto-redirect
                        </button>
                    </div>
                )}

                {/* Action buttons */}
                <div className="space-y-3">
                    <Link
                        href="/dashboard?tab=studypack"
                        className="block w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 px-6 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
                    >
                        Browse Study Materials
                    </Link>

                    <Link
                        href="/dashboard"
                        className="block w-full bg-white text-gray-700 py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-50 transition-all border-2 border-gray-200 hover:border-gray-300"
                    >
                        Go to Dashboard
                    </Link>

                    <Link
                        href="/"
                        className="block w-full text-gray-500 py-2 px-6 rounded-xl font-medium hover:text-gray-700 transition-colors text-sm"
                    >
                        Return to Home
                    </Link>
                </div>


                {searchParams.get("item") && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs text-blue-800">
                            <span className="font-semibold">Cancelled item:</span>{" "}
                            {searchParams.get("item")}
                        </p>
                    </div>
                )}

                {/* Reassurance message */}
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-100">
                    <div className="flex items-start space-x-2">
                        <svg
                            className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <p className="text-sm text-green-800 text-left">
                            Your account is secure and no charges were made. Feel free to try again when you&#39;re ready!
                        </p>
                    </div>
                </div>
            </div>

            {/* CSS for custom animations */}
            <style jsx>{`
                @keyframes blob {
                    0%, 100% {
                        transform: translate(0, 0) scale(1);
                    }
                    33% {
                        transform: translate(30px, -50px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                }

                .animate-blob {
                    animation: blob 7s infinite;
                }

                .animation-delay-2000 {
                    animation-delay: 2s;
                }

                .animation-delay-4000 {
                    animation-delay: 4s;
                }

                @keyframes pulse-slow {
                    0%, 100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.8;
                    }
                }

                .animate-pulse-slow {
                    animation: pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes bounce-slow {
                    0%, 100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                .animate-bounce-slow {
                    animation: bounce-slow 2s ease-in-out infinite;
                }

                @keyframes ping-slow {
                    75%, 100% {
                        transform: scale(1.5);
                        opacity: 0;
                    }
                }

                .animate-ping-slow {
                    animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                }
            `}</style>
        </div>
    );
}


export default function Page() {
    return (
        <Suspense fallback={null}>
            <CancelledPurchasePageEnhanced />
        </Suspense>
    );
}