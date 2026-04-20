import React from 'react';
import Link from 'next/link';

const CookiePolicyPage = () => {
    const currentYear = new Date().getFullYear();
    const effectiveDate = "1 January 2025";

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
                        ← Back to Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12">

                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                            Cookie Policy
                        </h1>
                        <p className="text-slate-600 italic mb-4">
                            Last updated: {effectiveDate}
                        </p>
                        <p className="text-slate-700 leading-relaxed">
                            This Cookie Policy explains how Studycedo (&#34;we&#34;, &#34;us&#34;, &#34;our&#34;) uses cookies and similar technologies on our website and services.
                        </p>
                    </div>

                    {/* Quick Summary Box */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-lg p-6 mb-10">
                        <h2 className="font-semibold text-slate-900 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Quick Summary
                        </h2>
                        <ul className="space-y-2 text-sm text-slate-700">
                            <li>• <strong>Essential cookies:</strong> Always active (required for login and security)</li>
                            <li>• <strong>Functional cookies:</strong> Remember your preferences (you can disable)</li>
                            <li>• <strong>Analytics cookies:</strong> Help us improve the site (you can opt out)</li>
                            <li>• <strong>Marketing cookies:</strong> Track ads and campaigns (you can opt out)</li>
                        </ul>
                    </div>

                    {/* What are cookies */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">What are Cookies?</h2>
                        <p className="text-slate-700 leading-relaxed mb-3">
                            Cookies are small text files stored on your device (computer, phone, or tablet) when you visit a website. They help websites remember your preferences, keep you logged in, and understand how you use the site.
                        </p>
                        <p className="text-slate-700 leading-relaxed">
                            Cookies can be &#34;session cookies&#34; (deleted when you close your browser) or &#34;persistent cookies&#34; (stored for a set period).
                        </p>
                    </section>

                    {/* Types of cookies */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Types of Cookies We Use</h2>

                        {/* 1. Essential Cookies */}
                        <div className="mb-8">
                            <div className="flex items-start mb-3">
                                <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full mr-3 mt-1">Always Active</span>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">1. Essential Cookies</h3>
                                    <p className="text-sm text-slate-600 mt-1">These cookies are necessary for the Service to function. You cannot disable them.</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto mt-4">
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead className="bg-slate-100">
                                    <tr>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Cookie Name</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Purpose</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Duration</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">__session</td>
                                        <td className="border border-slate-300 p-3">Maintains your logged-in session</td>
                                        <td className="border border-slate-300 p-3">Session</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">auth_token</td>
                                        <td className="border border-slate-300 p-3">Authenticates your account</td>
                                        <td className="border border-slate-300 p-3">30 days</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">csrf_token</td>
                                        <td className="border border-slate-300 p-3">Prevents security attacks (CSRF protection)</td>
                                        <td className="border border-slate-300 p-3">Session</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">__stripe_mid</td>
                                        <td className="border border-slate-300 p-3">Stripe fraud detection (payment processing)</td>
                                        <td className="border border-slate-300 p-3">1 year</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">__stripe_sid</td>
                                        <td className="border border-slate-300 p-3">Stripe session management</td>
                                        <td className="border border-slate-300 p-3">30 minutes</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 italic">
                                <strong>Legal basis:</strong> Necessary for contract performance (you cannot use our Service without these)
                            </p>
                        </div>

                        {/* 2. Functional Cookies */}
                        <div className="mb-8">
                            <div className="flex items-start mb-3">
                                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mr-3 mt-1">Optional</span>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">2. Functional Cookies</h3>
                                    <p className="text-sm text-slate-600 mt-1">Remember your preferences and choices to provide a better experience.</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto mt-4">
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead className="bg-slate-100">
                                    <tr>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Cookie Name</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Purpose</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Duration</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">exam_board_pref</td>
                                        <td className="border border-slate-300 p-3">Remembers your exam board selection (AQA, Edexcel, etc.)</td>
                                        <td className="border border-slate-300 p-3">1 year</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">subject_preferences</td>
                                        <td className="border border-slate-300 p-3">Stores your selected subjects for quick access</td>
                                        <td className="border border-slate-300 p-3">1 year</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">theme_mode</td>
                                        <td className="border border-slate-300 p-3">Remembers light/dark mode preference</td>
                                        <td className="border border-slate-300 p-3">1 year</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">cookie_consent</td>
                                        <td className="border border-slate-300 p-3">Stores your cookie preferences</td>
                                        <td className="border border-slate-300 p-3">1 year</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">dashboard_layout</td>
                                        <td className="border border-slate-300 p-3">Remembers your dashboard customization</td>
                                        <td className="border border-slate-300 p-3">6 months</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 italic">
                                <strong>Legal basis:</strong> Legitimate interest; you can disable these via cookie settings
                            </p>
                        </div>

                        {/* 3. Analytics Cookies */}
                        <div className="mb-8">
                            <div className="flex items-start mb-3">
                                <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full mr-3 mt-1">Opt-out Available</span>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">3. Analytics Cookies</h3>
                                    <p className="text-sm text-slate-600 mt-1">Help us understand how you use the Service (anonymized/aggregated data).</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto mt-4">
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead className="bg-slate-100">
                                    <tr>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Cookie Name</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Provider</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Purpose</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Duration</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">_ga</td>
                                        <td className="border border-slate-300 p-3">Google Analytics</td>
                                        <td className="border border-slate-300 p-3">Distinguishes unique users</td>
                                        <td className="border border-slate-300 p-3">2 years</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">_ga_*</td>
                                        <td className="border border-slate-300 p-3">Google Analytics 4</td>
                                        <td className="border border-slate-300 p-3">Session tracking and engagement</td>
                                        <td className="border border-slate-300 p-3">2 years</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">_gid</td>
                                        <td className="border border-slate-300 p-3">Google Analytics</td>
                                        <td className="border border-slate-300 p-3">Distinguishes users (short-term)</td>
                                        <td className="border border-slate-300 p-3">24 hours</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">_gat</td>
                                        <td className="border border-slate-300 p-3">Google Analytics</td>
                                        <td className="border border-slate-300 p-3">Throttles request rate</td>
                                        <td className="border border-slate-300 p-3">1 minute</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 italic">
                                <strong>Legal basis:</strong> Consent (where required); you can opt out via cookie banner or browser settings
                            </p>
                            <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-3">
                                <p className="text-xs text-blue-900">
                                    <strong>Note:</strong> Analytics data is anonymized and aggregated. We cannot identify individual users from this data.
                                </p>
                            </div>
                        </div>

                        {/* 4. Marketing/Advertising Cookies */}
                        <div className="mb-8">
                            <div className="flex items-start mb-3">
                                <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-3 py-1 rounded-full mr-3 mt-1">Requires Consent</span>
                                <div>
                                    <h3 className="text-xl font-semibold text-slate-900">4. Marketing/Advertising Cookies</h3>
                                    <p className="text-sm text-slate-600 mt-1">Track your activity for personalized ads and campaign attribution.</p>
                                </div>
                            </div>

                            <div className="overflow-x-auto mt-4">
                                <table className="w-full border-collapse border border-slate-300 text-sm">
                                    <thead className="bg-slate-100">
                                    <tr>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Cookie Name</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Provider</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Purpose</th>
                                        <th className="border border-slate-300 p-3 text-left font-semibold">Duration</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">_fbp</td>
                                        <td className="border border-slate-300 p-3">Meta/Facebook</td>
                                        <td className="border border-slate-300 p-3">Facebook Pixel tracking for ad targeting</td>
                                        <td className="border border-slate-300 p-3">90 days</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">_gcl_au</td>
                                        <td className="border border-slate-300 p-3">Google Ads</td>
                                        <td className="border border-slate-300 p-3">Ad conversion tracking</td>
                                        <td className="border border-slate-300 p-3">90 days</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-slate-300 p-3 font-mono text-xs">fr</td>
                                        <td className="border border-slate-300 p-3">Meta/Facebook</td>
                                        <td className="border border-slate-300 p-3">Ad delivery and targeting</td>
                                        <td className="border border-slate-300 p-3">90 days</td>
                                    </tr>
                                    <tr className="bg-slate-50">
                                        <td className="border border-slate-300 p-3 font-mono text-xs">IDE</td>
                                        <td className="border border-slate-300 p-3">Google DoubleClick</td>
                                        <td className="border border-slate-300 p-3">Measure ad campaign effectiveness</td>
                                        <td className="border border-slate-300 p-3">13 months</td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-slate-600 mt-2 italic">
                                <strong>Legal basis:</strong> Consent; you must opt in via cookie banner to enable these
                            </p>
                        </div>
                    </section>

                    {/* Similar Technologies */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Similar Technologies</h2>
                        <p className="text-slate-700 mb-4">In addition to cookies, we use:</p>

                        <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                                    </svg>
                                    Local Storage
                                </h3>
                                <p className="text-sm text-slate-700">
                                    We store preferences, study progress, and session data in your browser&#39;s local storage. This data persists even after you close your browser and helps provide a seamless experience.
                                </p>
                                <p className="text-xs text-slate-600 mt-2">
                                    <strong>Examples:</strong> Draft study plans, quiz progress, AI Tutor conversation history
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Session Storage
                                </h3>
                                <p className="text-sm text-slate-700">
                                    Temporary data that&#39;s cleared when you close your browser. Used for short-term data like form inputs or navigation state.
                                </p>
                                <p className="text-xs text-slate-600 mt-2">
                                    <strong>Examples:</strong> Temporary quiz answers, page navigation state
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Pixels & Tags
                                </h3>
                                <p className="text-sm text-slate-700">
                                    Small invisible images (1x1 pixel) that track email opens, page visits, and conversions. Used for analytics and marketing.
                                </p>
                                <p className="text-xs text-slate-600 mt-2">
                                    <strong>Examples:</strong> Email open tracking, conversion pixels, social media retargeting
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    Web Beacons
                                </h3>
                                <p className="text-sm text-slate-700">
                                    Embedded objects in emails or web pages that track when content is viewed. Similar to pixels but can carry more information.
                                </p>
                                <p className="text-xs text-slate-600 mt-2">
                                    <strong>Examples:</strong> Newsletter engagement tracking, feature usage analytics
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* How to Control Cookies */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">How to Control Cookies</h2>

                        {/* Cookie Banner */}
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">In Our Cookie Banner</h3>
                            <p className="text-slate-700 mb-3">When you first visit Studycedo, you&#39;ll see a cookie banner where you can:</p>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="font-semibold text-slate-900">Accept All</span>
                                    </div>
                                    <p className="text-sm text-slate-700">Enable all cookies for the best experience</p>
                                </div>
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span className="font-semibold text-slate-900">Reject Non-Essential</span>
                                    </div>
                                    <p className="text-sm text-slate-700">Only essential cookies (login, security)</p>
                                </div>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center mb-2">
                                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                        </svg>
                                        <span className="font-semibold text-slate-900">Customize</span>
                                    </div>
                                    <p className="text-sm text-slate-700">Choose which types to enable</p>
                                </div>
                            </div>
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                                <p className="text-sm text-blue-900">
                                    <strong>You can change your preferences anytime</strong> by clicking &#34;Cookie Settings&#34; in the footer or visiting your account settings.
                                </p>
                            </div>
                        </div>

                        {/* Browser Controls */}
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">In Your Browser</h3>
                            <p className="text-slate-700 mb-3">Most browsers let you:</p>
                            <ul className="list-disc pl-6 space-y-1 text-slate-700 mb-4">
                                <li>View and delete existing cookies</li>
                                <li>Block cookies from specific websites</li>
                                <li>Block all third-party cookies</li>
                                <li>Block all cookies (may break website functionality)</li>
                            </ul>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                                <h4 className="font-semibold text-slate-900 mb-3">How to Manage Cookies by Browser:</h4>
                                <div className="space-y-3 text-sm">
                                    <div className="flex items-start">
                                        <svg className="w-5 h-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-slate-900">Chrome:</p>
                                            <p className="text-slate-700">Settings → Privacy and Security → Cookies and other site data</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <svg className="w-5 h-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-slate-900">Firefox:</p>
                                            <p className="text-slate-700">Settings → Privacy & Security → Cookies and Site Data</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <svg className="w-5 h-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-slate-900">Safari:</p>
                                            <p className="text-slate-700">Preferences → Privacy → Cookies and website data</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start">
                                        <svg className="w-5 h-5 text-slate-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                                        </svg>
                                        <div>
                                            <p className="font-semibold text-slate-900">Edge:</p>
                                            <p className="text-slate-700">Settings → Cookies and site permissions → Manage cookies</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
                                <p className="text-sm text-amber-900">
                                    <strong>Warning:</strong> Blocking all cookies may prevent you from logging in or using key features of Studycedo.
                                </p>
                            </div>
                        </div>

                        {/* Third-Party Opt-Outs */}
                        <div className="mb-6">
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">Third-Party Opt-Outs</h3>
                            <p className="text-slate-700 mb-3">You can opt out of specific third-party tracking:</p>

                            <div className="space-y-3">
                                <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">Google Analytics</p>
                                        <p className="text-sm text-slate-600">Opt out of Google Analytics tracking</p>
                                    </div>
                                    <a
                                        href="https://tools.google.com/dlpage/gaoptout"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center"
                                    >
                                        Opt Out
                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">Facebook Pixel</p>
                                        <p className="text-sm text-slate-600">Manage Facebook ad preferences</p>
                                    </div>
                                    <a
                                        href="https://www.facebook.com/ads/preferences"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center"
                                    >
                                        Manage
                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">Network Advertising Initiative (NAI)</p>
                                        <p className="text-sm text-slate-600">Opt out of multiple ad networks at once</p>
                                    </div>
                                    <a
                                        href="https://optout.networkadvertising.org/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center"
                                    >
                                        Opt Out
                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>

                                <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-slate-900">Your Online Choices (EU)</p>
                                        <p className="text-sm text-slate-600">European opt-out tool for behavioral advertising</p>
                                    </div>
                                    <a
                                        href="https://www.youronlinechoices.com/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center"
                                    >
                                        Visit
                                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Do Not Track */}
                        <div>
                            <h3 className="text-xl font-semibold text-slate-900 mb-3">Do Not Track (DNT)</h3>
                            <p className="text-slate-700 mb-2">
                                Some browsers offer a &#34;Do Not Track&#34; (DNT) signal. However, there is no industry standard for how to respond to DNT signals.
                            </p>
                            <p className="text-slate-700">
                                We currently do not respond to DNT signals, but we respect your cookie preferences set through our cookie banner.
                            </p>
                        </div>
                    </section>

                    {/* Impact of Blocking Cookies */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Impact of Blocking Cookies</h2>
                        <p className="text-slate-700 mb-4">If you block or delete cookies:</p>

                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="font-semibold text-red-900 mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    May Not Work
                                </h3>
                                <ul className="text-sm text-slate-700 space-y-1">
                                    <li>• Login/authentication</li>
                                    <li>• Payment processing</li>
                                    <li>• Saving study progress</li>
                                    <li>• AI Tutor conversations</li>
                                </ul>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                <h3 className="font-semibold text-amber-900 mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Reduced Experience
                                </h3>
                                <ul className="text-sm text-slate-700 space-y-1">
                                    <li>• Preferences not saved</li>
                                    <li>• Repeated cookie banners</li>
                                    <li>• Generic (non-personalized) content</li>
                                    <li>• Slower performance</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Updates to This Policy */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Updates to This Policy</h2>
                        <p className="text-slate-700 mb-3">
                            We may update this Cookie Policy from time to time to reflect changes in technology, legislation, or our practices.
                        </p>
                        <p className="text-slate-700">
                            When we make significant changes, we&#39;ll notify you via email or an in-app notice. The &#34;Last updated&#34; date at the top of this page shows when the policy was last revised.
                        </p>
                    </section>

                    {/* Contact */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Questions About Cookies?</h2>
                        <p className="text-slate-700 mb-4">
                            If you have questions about how we use cookies or want to exercise your rights:
                        </p>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                            <div className="space-y-2 text-sm">
                                <p className="text-slate-700">
                                    <strong>Email:</strong> <a href="mailto:privacy@Studycedo.com" className="text-blue-600 hover:underline font-semibold">privacy@Studycedo.com</a>
                                </p>
                                <p className="text-slate-700">
                                    <strong>Privacy Policy:</strong> <Link href="/privacy" className="text-blue-600 hover:underline font-semibold">Read our full Privacy Policy</Link>
                                </p>
                                <p className="text-slate-700">
                                    <strong>Cookie Settings:</strong> <button className="text-blue-600 hover:underline font-semibold">Update your preferences</button>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-600 text-center italic mb-4">
                            Last updated: {effectiveDate}
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 text-sm">
                            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                            <Link href="/notice" className="text-blue-600 hover:underline">Notice</Link>
                            <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>
                        </div>
                    </div>

                </div>
            </main>

            {/* Simple Footer */}
            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <p className="text-sm text-slate-600 text-center">
                        © {currentYear} Studycedo. Your privacy matters to us.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default CookiePolicyPage;