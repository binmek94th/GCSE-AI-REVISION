import React from 'react';
import Link from 'next/link';

const TermsOfServicePage = () => {
    const currentYear = new Date().getFullYear();
    const effectiveDate = "1 January 2025";

    // Pricing and service details - replace with actual values
    const serviceDetails = {
        legalEntityName: "Studycedo Ltd",
        subjectPackPrice: "30",
        seasonStartDate: "January 2026",
        seasonEndDate: "June 2026",
        aiTutorPrice: "4.99",
        refundDays: "14",
        supportEmail: "support@Studycedo.com",
        postalAddress: "Office address to be provided, United Kingdom",
        freeAiLimit: "10",
        autoRenewal: "No"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
                        ← Back to Home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12">

                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                            Terms of Service
                        </h1>
                        <p className="text-slate-600 italic mb-4">
                            Last updated: {effectiveDate}
                        </p>
                        <p className="text-slate-700 leading-relaxed mb-4">
                            These Terms of Service (&#34;Terms&#34;) govern your use of the Studycedo website, applications, and services (the &#34;Service&#34;), operated by {serviceDetails.legalEntityName} (&#34;Studycedo&#34;, &#34;we&#34;, &#34;us&#34;, &#34;our&#34;).
                        </p>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                            <p className="text-sm text-blue-900 font-semibold">
                                By accessing or using the Service, you agree to these Terms. If you are under 18, your parent or guardian must agree on your behalf.
                            </p>
                        </div>
                    </div>

                    {/* Quick Navigation */}
                    <nav className="bg-slate-50 rounded-lg p-6 mb-10 border border-slate-200">
                        <h2 className="font-semibold text-slate-900 mb-3">Quick Navigation</h2>
                        <div className="grid md:grid-cols-3 gap-2 text-sm">
                            <a href="#definitions" className="text-blue-600 hover:underline">1. Definitions</a>
                            <a href="#eligibility" className="text-blue-600 hover:underline">2. Eligibility</a>
                            <a href="#service" className="text-blue-600 hover:underline">3. Service Description</a>
                            <a href="#payments" className="text-blue-600 hover:underline">4. Payments</a>
                            <a href="#refunds" className="text-blue-600 hover:underline">5. Refunds</a>
                            <a href="#acceptable-use" className="text-blue-600 hover:underline">6. Acceptable Use</a>
                            <a href="#intellectual-property" className="text-blue-600 hover:underline">7. Intellectual Property</a>
                            <a href="#ai-tutor" className="text-blue-600 hover:underline">8. AI Tutor</a>
                            <a href="#privacy" className="text-blue-600 hover:underline">9. Privacy</a>
                            <a href="#termination" className="text-blue-600 hover:underline">10. Termination</a>
                            <a href="#disclaimers" className="text-blue-600 hover:underline">11. Disclaimers</a>
                            <a href="#indemnification" className="text-blue-600 hover:underline">12. Indemnification</a>
                            <a href="#changes" className="text-blue-600 hover:underline">13. Changes</a>
                            <a href="#governing-law" className="text-blue-600 hover:underline">14. Governing Law</a>
                            <a href="#severability" className="text-blue-600 hover:underline">15. Severability</a>
                            <a href="#contact" className="text-blue-600 hover:underline">16. Contact</a>
                        </div>
                    </nav>

                    {/* Section 1: Definitions */}
                    <section id="definitions" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Definitions</h2>
                        <div className="space-y-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-slate-700"><strong>Account:</strong> Your registered user profile on Studycedo</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-slate-700"><strong>Content:</strong> All materials, resources, questions, videos, notes, quizzes, and AI-generated responses provided through the Service</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-slate-700"><strong>Student:</strong> A user accessing learning materials and revision tools</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-slate-700"><strong>Parent:</strong> A guardian with read-only access to a Student&#39;s progress dashboard</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <p className="text-slate-700"><strong>Subject Pack:</strong> One-time purchase providing ongoing access to subject-specific content</p>
                            </div>

                        </div>
                    </section>

                    {/* Section 2: Eligibility */}
                    <section id="eligibility" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Eligibility and Account Creation</h2>
                        <ul className="space-y-3 text-slate-700">
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>You must be at least <strong>13 years old</strong> to create an account</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Users <strong>under 13</strong> require verifiable parental consent</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Users <strong>under 18</strong> should use the Service with parental supervision</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>You must provide <strong>accurate information</strong> during registration</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span><strong>One account per person;</strong> no account sharing permitted</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>You are responsible for maintaining the <strong>security of your account credentials</strong></span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 3: Service Description */}
                    <section id="service" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Service Description</h2>

                        <h3 className="text-lg font-semibold text-slate-900 mb-3">We Provide:</h3>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700 mb-6">
                            <li>Free AI-powered revision planner and study schedule generator</li>
                            <li>Paid subject packs with past papers, predicted questions, revision notes, video tutorials, and quizzes</li>
                            <li>AI Tutor for personalized study support and question answering</li>
                            <li>Optional parent dashboard for progress monitoring</li>
                            <li>Progress tracking, readiness scores, and adaptive scheduling</li>
                        </ul>

                        <div className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded">
                            <h3 className="font-semibold text-amber-900 mb-3 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Important Limitations:
                            </h3>
                            <ul className="space-y-2 text-sm text-amber-900">
                                <li>• We are <strong>not affiliated</strong> with AQA, Pearson Edexcel, OCR, or WJEC</li>
                                <li>• Predicted questions are <strong>study prompts</strong>, not exam guarantees</li>
                                <li>• AI Tutor may contain errors; always <strong>verify with official sources</strong></li>
                                <li>• <strong>No guarantee</strong> of specific grade outcomes or exam success</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 4: Subscriptions and Payments */}
                    <section id="payments" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Subscriptions and Payments</h2>

                        <div className="space-y-6">
                            {/* Subject Packs */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                                <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    Subject Packs
                                </h3>
                                <ul className="space-y-2 text-sm text-slate-700">
                                    <li>• <strong>One-time purchase:</strong> £{serviceDetails.subjectPackPrice} per subject</li>
                                    <li>• Grants <strong>ongoing access</strong> to that subject&#39;s digital content</li>
                                    <li>• <strong>Non-transferable</strong> - tied to your account</li>
                                    <li>• <strong>No recurring charges</strong></li>
                                </ul>
                            </div>

                            {/* AI Tutor Unlimited */}
                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-5">
                                <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center">
                                    <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                    AI Tutor Unlimited (Optional)
                                </h3>
                                <ul className="space-y-2 text-sm text-slate-700">
                                    <li>• <strong>Monthly subscription:</strong> £{serviceDetails.aiTutorPrice}/month</li>
                                    <li>• Cancel anytime; no refund for partial months</li>
                                    <li>• Unlimited questions and conversations</li>
                                </ul>
                            </div>

                            {/* Payment Processing */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">Payment Processing</h3>
                                <ul className="space-y-2 text-sm text-slate-700">
                                    <li>• Payments processed securely via <strong>Stripe</strong></li>
                                    <li>• All prices in <strong>GBP</strong> and include <strong>VAT</strong> where applicable</li>
                                    <li>• We may change prices with <strong>30 days&#39; notice</strong> for new purchases</li>
                                    <li>• Existing subscriptions maintain their original price until renewal</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 5: Free Trial and Refunds */}
                    <section id="refunds" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Free Trial and Refunds</h2>

                        <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded mb-5">
                            <h3 className="font-semibold text-green-900 mb-2 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {serviceDetails.refundDays}-Day Money-Back Guarantee
                            </h3>
                            <p className="text-sm text-green-900">
                                We offer a <strong>{serviceDetails.refundDays}-day money-back guarantee</strong> on first-time Subject Pack or Season Pass purchases.
                            </p>
                        </div>

                        <div className="space-y-4 text-slate-700">
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">Free Tier</h3>
                                <p className="text-sm">No payment required; access to limited features including basic study planner and {serviceDetails.freeAiLimit} AI Tutor questions per day</p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">How to Request a Refund</h3>
                                <p className="text-sm mb-2">Email <a href={`mailto:${serviceDetails.supportEmail}`} className="text-blue-600 hover:underline font-semibold">{serviceDetails.supportEmail}</a> with:</p>
                                <ul className="list-disc pl-6 text-sm space-y-1">
                                    <li>Your order number</li>
                                    <li>Reason for refund request</li>
                                    <li>Account email address</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">Refund Conditions</h3>
                                <ul className="list-disc pl-6 text-sm space-y-1">
                                    <li>Request must be made within <strong>{serviceDetails.refundDays} days</strong> of purchase</li>
                                    <li>Applies to <strong>first-time customers only</strong> (one refund per user)</li>
                                    <li>Not available if content has been <strong>extensively used</strong> (&gt;50% completion)</li>
                                    <li>Season Pass refunds may be prorated based on time remaining</li>
                                    <li>Refunds processed to <strong>original payment method</strong> within 5-10 business days</li>
                                </ul>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded p-4">
                                <h3 className="font-semibold text-red-900 mb-2">Refunds NOT Available For:</h3>
                                <ul className="list-disc pl-6 text-sm text-red-900 space-y-1">
                                    <li>Purchases made more than {serviceDetails.refundDays} days ago</li>
                                    <li>Subsequent purchases after already receiving a refund</li>
                                    <li>Accounts found in violation of these Terms</li>
                                    <li>Purchases made with intent to abuse the refund policy</li>
                                    <li>Partial months of monthly subscriptions</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 6: Acceptable Use */}
                    <section id="acceptable-use" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Acceptable Use</h2>

                        <div className="bg-red-50 border-l-4 border-red-400 p-5 rounded mb-4">
                            <h3 className="font-semibold text-red-900 mb-3">You Agree NOT To:</h3>
                            <ul className="space-y-2 text-sm text-red-900">
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Share your account or login credentials with others</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Copy, download, or redistribute Content (except for personal study purposes)</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Use automated tools (bots, scrapers) to extract or download Content</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Submit harmful, abusive, inappropriate, or illegal content to AI Tutor</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Attempt to reverse-engineer, hack, or compromise the Service&#39;s security</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Use the Service for commercial purposes without written permission</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Impersonate others or create fake accounts</span>
                                </li>
                                <li className="flex items-start">
                                    <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    <span>Violate any applicable laws or regulations</span>
                                </li>
                            </ul>
                        </div>

                        <p className="text-sm text-slate-600 italic">
                            Violation of these terms may result in immediate account suspension or termination without refund.
                        </p>
                    </section>

                    {/* Section 7: Content and Intellectual Property */}
                    <section id="intellectual-property" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">7. Content and Intellectual Property</h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">Our Content</h3>
                                <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
                                    <li>All Content (except exam board materials) is <strong>owned by {serviceDetails.legalEntityName}</strong> or licensed to us</li>
                                    <li>Subject to these Terms, we grant you a <strong>limited, non-exclusive, non-transferable license</strong> to access Content for personal educational use only</li>
                                    <li>You may <strong>not redistribute, sell, or publicly display</strong> our Content</li>
                                    <li>Screenshots or copies for personal study are permitted; commercial use is prohibited</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">Exam Board Materials</h3>
                                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                                    <ul className="space-y-2 text-sm text-slate-700">
                                        <li>• Past papers and specifications remain the <strong>property of respective exam boards</strong></li>
                                        <li>• We link to or reference these under <strong>educational fair dealing</strong> provisions</li>
                                        <li>• Availability subject to exam board policies and permissions</li>
                                        <li>• We do not claim ownership of official exam materials</li>
                                    </ul>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">Your Content</h3>
                                <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
                                    <li>When you submit questions or messages to AI Tutor, you grant us a <strong>license to process and store</strong> that content to provide the Service</li>
                                    <li>We <strong>do not claim ownership</strong> of your study notes or personal work</li>
                                    <li>You retain all rights to content you create using the Service</li>
                                    <li>We may use anonymized, aggregated data for service improvement</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 8: AI Tutor */}
                    <section id="ai-tutor" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">8. AI Tutor</h2>

                        <div className="space-y-4">
                            <div className="bg-purple-50 border-l-4 border-purple-400 p-4 rounded">
                                <h3 className="font-semibold text-purple-900 mb-2">How AI Tutor Works</h3>
                                <ul className="space-y-2 text-sm text-purple-900">
                                    <li>• Uses third-party AI models (e.g., OpenAI GPT-4)</li>
                                    <li>• Responses are <strong>generated automatically</strong> and may contain errors</li>
                                    <li>• AI Tutor is a <strong>study aid</strong>, not a replacement for qualified teachers</li>
                                    <li>• We moderate content for safety but <strong>cannot guarantee accuracy</strong></li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">Usage Limits</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-slate-50 border border-slate-200 rounded p-4">
                                        <p className="font-semibold text-slate-900 mb-2">Free Users:</p>
                                        <p className="text-sm text-slate-700">{serviceDetails.freeAiLimit} questions per day</p>
                                    </div>
                                    <div className="bg-slate-50 border border-slate-200 rounded p-4">
                                        <p className="font-semibold text-slate-900 mb-2">Paid Users:</p>
                                        <p className="text-sm text-slate-700">Higher limits or unlimited (see your plan)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-amber-50 border border-amber-200 rounded p-4">
                                <p className="text-sm text-amber-900">
                                    <strong>Important:</strong> Always verify AI Tutor responses against your exam board specification, textbook, and teacher guidance. The AI may occasionally provide incorrect or outdated information.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 9: Privacy and Data */}
                    <section id="privacy" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Privacy and Data</h2>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                            <p className="text-slate-700 mb-3">
                                Your use of the Service is also governed by our <Link href="/privacy" className="text-blue-600 hover:underline font-semibold">Privacy Policy</Link>, which explains how we collect, use, and protect your information.
                            </p>
                            <p className="text-sm text-slate-700">
                                By using Studycedo, you consent to the data practices described in our Privacy Policy, including the processing of your study data, AI Tutor interactions, and account information.
                            </p>
                        </div>
                    </section>

                    {/* Section 10: Termination */}
                    <section id="termination" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Termination</h2>

                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">By You</h3>
                                <ul className="list-disc pl-6 space-y-2 text-slate-700 text-sm">
                                    <li>You may delete your account anytime via account settings or by emailing <a href={`mailto:${serviceDetails.supportEmail}`} className="text-blue-600 hover:underline font-semibold">{serviceDetails.supportEmail}</a></li>
                                    <li>Deletion is <strong>permanent</strong></li>
                                    <li>We will delete personal data per our retention policy (see Privacy Policy)</li>
                                    <li>Paid subscriptions are non-refundable upon voluntary account deletion</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">By Us</h3>
                                <div className="bg-red-50 border border-red-200 rounded p-4">
                                    <ul className="space-y-2 text-sm text-red-900">
                                        <li>• We may <strong>suspend or terminate</strong> your account if you breach these Terms</li>
                                        <li>• We may discontinue the Service with <strong>30 days&#39; notice</strong></li>
                                        <li>• Upon termination, your access ends <strong>immediately</strong></li>
                                        <li>• No refunds for partial periods except as required by law</li>
                                        <li>• We reserve the right to terminate for any reason with appropriate notice</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 11: Disclaimers and Limitations */}
                    <section id="disclaimers" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Disclaimers and Limitations of Liability</h2>

                        <div className="bg-slate-100 border-l-4 border-slate-400 p-5 rounded mb-5">
                            <p className="text-slate-900 font-semibold mb-2 uppercase tracking-wide text-sm">
                                The Service is Provided &#34;AS IS&#34; Without Warranties
                            </p>
                            <p className="text-sm text-slate-700">
                                To the fullest extent permitted by law, we make no warranties, express or implied, regarding the Service.
                            </p>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-2">We Do NOT Guarantee:</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Uninterrupted or error-free service</li>
                                    <li>Accuracy or completeness of Content</li>
                                    <li>Grade improvements or exam success</li>
                                    <li>That predicted questions will appear on actual exams</li>
                                    <li>Availability of specific features at all times</li>
                                    <li>Compatibility with all devices or browsers</li>
                                </ul>
                            </div>

                            <div className="bg-red-50 border border-red-200 rounded p-5">
                                <h3 className="font-semibold text-red-900 mb-3">Limitation of Liability</h3>
                                <p className="text-sm text-red-900 mb-3">
                                    <strong>To the fullest extent permitted by law:</strong>
                                </p>
                                <ul className="space-y-2 text-sm text-red-900">
                                    <li>• We are <strong>not liable</strong> for indirect, incidental, special, consequential, or punitive damages</li>
                                    <li>• Our <strong>total liability</strong> is limited to the amount you paid in the <strong>12 months</strong> before the claim</li>
                                    <li>• We are not liable for third-party content, links, or services</li>
                                    <li>• We are not responsible for data loss, profit loss, or business interruption</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                                <h3 className="font-semibold text-blue-900 mb-2">Important: Consumer Rights Protected</h3>
                                <p className="text-sm text-blue-900">
                                    <strong>Nothing in these Terms limits liability for:</strong>
                                </p>
                                <ul className="list-disc pl-6 text-sm text-blue-900 mt-2 space-y-1">
                                    <li>Death or personal injury caused by negligence</li>
                                    <li>Fraud or fraudulent misrepresentation</li>
                                    <li>Any liability that cannot be excluded under UK law</li>
                                    <li>Your statutory consumer rights</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 12: Indemnification */}
                    <section id="indemnification" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Indemnification</h2>
                        <p className="text-slate-700 mb-3">
                            You agree to indemnify, defend, and hold harmless Studycedo, its officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses (including legal fees) arising from:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700">
                            <li>Your breach of these Terms</li>
                            <li>Your misuse of the Service</li>
                            <li>Your violation of any law or regulation</li>
                            <li>Your infringement of third-party rights</li>
                            <li>Content you submit to the Service</li>
                        </ul>
                    </section>

                    {/* Section 13: Changes to Terms */}
                    <section id="changes" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Changes to These Terms</h2>
                        <ul className="space-y-2 text-slate-700">
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>We may update these Terms at any time to reflect changes in our Service or legal requirements</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Material changes will be notified via email or in-app notice</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Continued use after changes constitutes acceptance of the new Terms</span>
                            </li>
                            <li className="flex items-start">
                                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Previous versions available on request</span>
                            </li>
                        </ul>
                    </section>

                    {/* Section 14: Governing Law */}
                    <section id="governing-law" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Governing Law and Disputes</h2>
                        <div className="space-y-3 text-slate-700">
                            <p>
                                These Terms are governed by the <strong>laws of England and Wales</strong>.
                            </p>
                            <p>
                                Any disputes arising from these Terms or your use of the Service will be subject to the <strong>exclusive jurisdiction of the courts of England and Wales</strong>.
                            </p>
                            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded">
                                <p className="text-sm text-green-900">
                                    <strong>For consumers:</strong> You retain all mandatory rights under local consumer protection laws. Nothing in these Terms affects your statutory rights.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 15: Severability */}
                    <section id="severability" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">15. Severability</h2>
                        <p className="text-slate-700">
                            If any provision of these Terms is found to be unenforceable or invalid by a court of law, that provision will be limited or eliminated to the minimum extent necessary, and the remaining provisions will continue in full force and effect.
                        </p>
                    </section>

                    {/* Section 16: Contact */}
                    <section id="contact" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">16. Contact Information</h2>
                        <p className="text-slate-700 mb-4">
                            For questions about these Terms or to exercise your rights:
                        </p>
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
                            <div className="space-y-2">
                                <p className="text-slate-700">
                                    <strong>Email:</strong> <a href={`mailto:${serviceDetails.supportEmail}`} className="text-blue-600 hover:underline font-semibold">{serviceDetails.supportEmail}</a>
                                </p>
                                <p className="text-slate-700">
                                    <strong>Address:</strong> {serviceDetails.postalAddress}
                                </p>
                                <p className="text-slate-700">
                                    <strong>Legal Entity:</strong> {serviceDetails.legalEntityName}
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Acceptance Statement */}
                    <div className="bg-slate-900 text-white rounded-lg p-6 text-center">
                        <svg className="w-12 h-12 mx-auto mb-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">
                            By using Studycedo, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-600 text-center italic mb-4">
                            Last updated: {effectiveDate}
                        </p>
                        <div className="flex flex-wrap justify-center gap-6 text-sm">
                            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
                            <Link href="/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link>
                            <Link href="/disclaimers" className="text-blue-600 hover:underline">Disclaimers</Link>
                            <Link href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</Link>
                        </div>
                    </div>

                </div>
            </main>

            {/* Simple Footer */}
            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <p className="text-sm text-slate-600 text-center">
                        © {currentYear} {serviceDetails.legalEntityName}. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default TermsOfServicePage;