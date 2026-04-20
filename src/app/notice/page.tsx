import React from 'react';
import Link from 'next/link';

const DisclaimersPage = () => {
    const currentYear = new Date().getFullYear();
    const seasonDates = "May/June 2026";
    const refundWindowDays = 14;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 py-4">
                    <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
                        ← Back to home
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12">

                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                            Disclaimers & Legal Information
                        </h1>
                        <p className="text-slate-600">
                            Last updated: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            Version 1.0 • <Link href="#changelog" className="text-blue-600 hover:underline">View change log</Link>
                        </p>
                    </div>

                    {/* Quick Navigation */}
                    <nav className="bg-slate-50 rounded-lg p-6 mb-10 border border-slate-200">
                        <h2 className="font-semibold text-slate-900 mb-3">Quick Navigation</h2>
                        <ul className="grid md:grid-cols-2 gap-2 text-sm">
                            <li><a href="#exam-boards" className="text-blue-600 hover:underline">Exam Board Independence</a></li>
                            <li><a href="#predicted-content" className="text-blue-600 hover:underline">Predicted Content</a></li>
                            <li><a href="#results" className="text-blue-600 hover:underline">Performance & Results</a></li>
                            <li><a href="#ai-tutor" className="text-blue-600 hover:underline">AI Tutor Limitations</a></li>
                            <li><a href="#access-pricing" className="text-blue-600 hover:underline">Access & Pricing</a></li>
                            <li><a href="#payments" className="text-blue-600 hover:underline">Payments & Refunds</a></li>
                            <li><a href="#privacy" className="text-blue-600 hover:underline">Privacy & Data</a></li>
                            <li><a href="#intellectual-property" className="text-blue-600 hover:underline">Intellectual Property</a></li>
                        </ul>
                    </nav>

                    {/* Section 1: Exam Board Independence */}
                    <section id="exam-boards" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">1</span>
                            Exam Board Independence & Intellectual Property
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <p>
                                <strong>Studycedo</strong> is an independent Studycedo revision platform and is <strong>not affiliated with, endorsed by, or approved by</strong> any awarding body, including:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>AQA (Assessment and Qualifications Alliance)</li>
                                <li>Pearson Edexcel</li>
                                <li>OCR (Oxford, Cambridge and RSA Examinations)</li>
                            </ul>
                            <p>
                                All exam papers, mark schemes, specifications, and related materials are the <strong>property and copyright of their respective awarding bodies</strong>. Studycedo is administered by these awarding organisations who own their respective examination materials.
                            </p>
                            <p>
                                Where we reference or link to past papers, specimen materials, or official specifications, we do so for <strong>educational purposes only</strong> under fair dealing provisions. Availability and access to such materials may vary by awarding body and their respective policies.
                            </p>
                            <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
                                <p className="text-sm text-amber-900">
                                    <strong>Important:</strong> Users should always refer to their specific exam board&#39;s official website for the most current syllabus, assessment objectives, and examination materials.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Predicted Content */}
                    <section id="predicted-content" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">2</span>
                            Predicted Questions & Content
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <p>
                                Any content labelled as <strong>&#34;predicted&#34;</strong> (including &#34;Predicted 2026 Questions&#34; or similar) represents <strong>original practice materials</strong> created by Studycedo based on:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Publicly available syllabus information and specifications</li>
                                <li>Historical examination patterns and topic frequencies</li>
                                <li>Educational analysis and subject expertise</li>
                            </ul>
                            <p>
                                <strong>These are NOT official exam questions</strong> and do not represent, guarantee, or predict actual examination content that will appear in any future exam.
                            </p>
                            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                                <p className="text-sm text-blue-900">
                                    <strong>Purpose:</strong> Predicted questions are designed as <strong>study prompts and practice exercises</strong> to help students prepare across the breadth of the specification. They should be used as one part of a comprehensive revision strategy.
                                </p>
                            </div>
                            <p className="mt-3">
                                Students should use predicted content alongside official past papers, textbooks, teacher guidance, and specification documents for complete preparation.
                            </p>
                        </div>
                    </section>

                    {/* Section 3: Performance & Results */}
                    <section id="results" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">3</span>
                            Performance Claims & Results
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <p>
                                Any statements regarding success rates, grade improvements, user ratings, or student outcomes reflect <strong>individual experiences and internal analyses</strong> at the time of publication.
                            </p>
                            <p>
                                <strong>Important limitations:</strong>
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li><strong>Results vary significantly</strong> between students based on numerous factors</li>
                                <li><strong>No grade outcomes are guaranteed</strong> through use of this platform</li>
                                <li>Past performance of other students does not predict your results</li>
                                <li>Individual success depends on multiple variables including effort, prior attainment, subject aptitude, teaching quality, curriculum coverage, exam technique, and personal circumstances</li>
                            </ul>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                                <h3 className="font-semibold text-slate-900 mb-2 text-sm">How We Measure Performance</h3>
                                <p className="text-sm text-slate-700">
                                    Where we present statistics (such as average ratings or grade improvements), these are calculated from:
                                </p>
                                <ul className="list-disc pl-6 text-sm text-slate-700 mt-2 space-y-1">
                                    <li>User-submitted feedback and reviews</li>
                                    <li>Self-reported grade data from students who choose to share their results</li>
                                    <li>Platform usage analytics and completion rates</li>
                                    <li>Internal assessments and mock quiz performance</li>
                                </ul>
                                <p className="text-sm text-slate-600 mt-2">
                                    These measurements reflect correlation, not causation. Students who use revision platforms extensively may also engage in other effective study practices.
                                </p>
                            </div>
                            <p className="mt-3">
                                This platform is a <strong>study aid and supplement</strong> to formal education, not a replacement for classroom teaching, textbooks, or teacher guidance.
                            </p>
                        </div>
                    </section>

                    {/* Section 4: AI Tutor Limitations */}
                    <section id="ai-tutor" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">4</span>
                            AI Tutor Limitations
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <p>
                                The AI Tutor feature provides <strong>educational guidance and learning support only</strong>. It is powered by artificial intelligence technology which has inherent limitations:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>May contain errors or omissions</strong> in explanations, calculations, or content</li>
                                <li><strong>Cannot replace a qualified teacher</strong> or professional educational advice</li>
                                <li>Responses are generated based on training data and may not reflect the most current curriculum changes</li>
                                <li>May occasionally produce responses that are plausible-sounding but factually incorrect</li>
                                <li>Cannot provide personalised feedback equivalent to human assessment</li>
                            </ul>
                            <div className="bg-red-50 border-l-4 border-red-400 p-4 mt-4">
                                <p className="text-sm text-red-900">
                                    <strong>Critical:</strong> Always verify important information, exam techniques, and subject content against:
                                </p>
                                <ul className="list-disc pl-6 text-sm text-red-900 mt-2 space-y-1">
                                    <li>Your exam board&#39;s official specification documents</li>
                                    <li>Your teacher or subject tutor&#39;s guidance</li>
                                    <li>Approved textbooks and official revision guides</li>
                                    <li>Past paper mark schemes and examiner reports</li>
                                </ul>
                            </div>
                            <p className="mt-3">
                                <strong>Parental oversight:</strong> Students under 16 should use the AI Tutor with parent or guardian supervision. The AI may not be appropriate for all ages or contexts.
                            </p>
                            <p>
                                The AI Tutor is designed to <strong>support and supplement</strong> your learning, not to be your sole source of educational content or exam preparation.
                            </p>
                        </div>
                    </section>

                    {/* Section 5: Access & Pricing */}
                    <section id="access-pricing" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">5</span>
                            Access & Pricing Scope
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <p>
                                Studycedo offers two main purchase options with different access terms:
                            </p>

                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-5 mt-4 border border-blue-200">
                                <h3 className="font-semibold text-slate-900 mb-2 flex items-center">
                                    <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    Subject Packs (One-Time Purchase)
                                </h3>
                                <p className="text-sm text-slate-700 mb-2">
                                    A <strong>one-time payment</strong> that provides <strong>ongoing digital access</strong> to all content for that specific subject, including:
                                </p>
                                <ul className="list-disc pl-6 text-sm text-slate-700 space-y-1">
                                    <li>Study materials and revision notes</li>
                                    <li>Practice questions and quizzes</li>
                                    <li>Predicted exam questions</li>
                                    <li>Progress tracking for that subject</li>
                                </ul>
                                <p className="text-xs text-slate-600 mt-3 italic">
                                    Access continues as long as your account remains active and subject to our Terms of Service.
                                </p>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mt-4">
                                <h3 className="font-semibold text-slate-900 mb-2 text-sm">Important Terms</h3>
                                <ul className="text-sm text-slate-700 space-y-2">
                                    <li>• Features, content, and subject availability may change over time</li>
                                    <li>• &#34;Ongoing access&#34; does not mean &#34;lifetime&#34; or &#34;permanent&#34; - access is provided subject to platform availability and our Terms of Service</li>
                                    <li>• We reserve the right to modify pricing, features, or discontinue the service with reasonable notice</li>
                                    <li>• Account sharing or resale of access is prohibited</li>
                                    <li>• All purchases are subject to our <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link></li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 6: Payments & Refunds */}
                    <section id="payments" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">6</span>
                            Payments & Refunds
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <h3 className="font-semibold text-slate-900 mt-4">Payment Processing</h3>
                            <p>
                                All payments are processed securely through <strong>Stripe</strong>, a PCI-compliant payment processor. Studycedo does not store your complete card details on our servers.
                            </p>
                            <p className="text-sm text-slate-600">
                                Supported payment methods include major credit cards, debit cards, and other payment options as provided by Stripe in your region.
                            </p>

                            <h3 className="font-semibold text-slate-900 mt-6">Money-Back Guarantee</h3>
                            <div className="bg-green-50 border-l-4 border-green-400 p-4 mt-2">
                                <p className="text-sm text-green-900">
                                    We offer a <strong>{refundWindowDays}-day money-back guarantee</strong> on first-time purchases.
                                </p>
                            </div>
                            <p className="mt-3">
                                <strong>Eligibility criteria:</strong>
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Request must be made within {refundWindowDays} days of purchase</li>
                                <li>Applies to first-time customers only (one refund per user)</li>
                                <li>Account must not show signs of abuse or policy violations</li>
                                <li>Excessive content downloads prior to refund request may disqualify eligibility</li>
                                <li>Season Pass refunds are prorated based on time remaining in the season</li>
                            </ul>

                            <h3 className="font-semibold text-slate-900 mt-6">Exclusions</h3>
                            <p>
                                Refunds are <strong>not available</strong> for:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Purchases made more than {refundWindowDays} days ago</li>
                                <li>Subsequent purchases after already receiving a refund</li>
                                <li>Accounts found to be in violation of our Terms of Service</li>
                                <li>Purchases made with the intent to abuse the refund policy</li>
                            </ul>

                            <p className="mt-4">
                                For complete refund terms and how to request a refund, please see our <Link href="/refund-policy" className="text-blue-600 hover:underline font-semibold">Refund Policy</Link>.
                            </p>
                        </div>
                    </section>

                    {/* Section 7: Privacy & Data */}
                    <section id="privacy" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">7</span>
                            Privacy & Data Processing
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <p>
                                By using this Study Planner and AI Tutor features, you consent to our processing of your inputs and interactions to:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Generate personalised study plans and recommendations</li>
                                <li>Provide AI-powered educational support and responses</li>
                                <li>Improve service quality and recommendation algorithms</li>
                                <li>Analyse platform usage for product development</li>
                            </ul>

                            <h3 className="font-semibold text-slate-900 mt-6">Data We Collect</h3>
                            <p>
                                When you use our platform, we may collect:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li><strong>Account information:</strong> name, email address, authentication details</li>
                                <li><strong>Study data:</strong> selected subjects, progress tracking, quiz responses, study plans</li>
                                <li><strong>AI interactions:</strong> questions asked, AI Tutor conversations, usage patterns</li>
                                <li><strong>Payment information:</strong> processed by Stripe (we store transaction IDs only)</li>
                                <li><strong>Technical data:</strong> device information, browser type, IP address, cookies</li>
                            </ul>

                            <h3 className="font-semibold text-slate-900 mt-6">Your Rights</h3>
                            <p className="text-sm">
                                You have rights regarding your personal data, including the right to access, correct, delete, or export your information. See our <Link href="/privacy" className="text-blue-600 hover:underline font-semibold">Privacy Policy</Link> for complete details.
                            </p>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                                <p className="text-sm text-blue-900">
                                    <strong>For complete privacy information:</strong><br/>
                                    • <Link href="/privacy" className="text-blue-600 hover:underline font-semibold">Privacy Policy</Link> - How we collect, use, and protect your data<br/>
                                    • <Link href="/cookies" className="text-blue-600 hover:underline font-semibold">Cookie Policy</Link> - How we use cookies and similar technologies
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Section 8: Intellectual Property */}
                    <section id="intellectual-property" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-3">8</span>
                            Intellectual Property
                        </h2>
                        <div className="pl-11 space-y-3 text-slate-700 leading-relaxed">
                            <h3 className="font-semibold text-slate-900">Studycedo Content</h3>
                            <p>
                                All content created by Studycedo, including but not limited to study materials, predicted questions, user interface design, logos, and platform features, is protected by copyright and other intellectual property laws.
                            </p>
                            <p>
                                <strong>© {currentYear} Studycedo. All rights reserved.</strong>
                            </p>

                            <h3 className="font-semibold text-slate-900 mt-6">Third-Party Trademarks</h3>
                            <p>
                                All trademarks, service marks, logos, and brand names mentioned on this platform are the property of their respective owners, including but not limited to:
                            </p>
                            <ul className="list-disc pl-6 space-y-1 text-sm">
                                <li>AQA, Pearson Edexcel, OCR, WJEC - owned by their respective awarding bodies</li>
                                <li>Studycedo - administered and trademarked by UK awarding organisations</li>
                                <li>Stripe - owned by Stripe, Inc.</li>
                                <li>Other mentioned brands, products, or services</li>
                            </ul>
                            <p className="text-sm text-slate-600 mt-2">
                                The mention of third-party trademarks does not imply endorsement, affiliation, or sponsorship by those trademark owners.
                            </p>

                            <h3 className="font-semibold text-slate-900 mt-6">Usage Restrictions</h3>
                            <p>
                                Users may <strong>not</strong>:
                            </p>
                            <ul className="list-disc pl-6 space-y-1">
                                <li>Reproduce, distribute, or republish Studycedo content without permission</li>
                                <li>Use our materials for commercial purposes</li>
                                <li>Remove or alter copyright notices</li>
                                <li>Create derivative works based on our content</li>
                                <li>Use automated systems to scrape or download content</li>
                            </ul>

                            <p className="text-sm text-slate-600 mt-4">
                                For licensing inquiries or permission requests, please contact us through our <Link href="/contact" className="text-blue-600 hover:underline">contact page</Link>.
                            </p>
                        </div>
                    </section>

                    <section id="changelog" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Change Log</h2>
                        <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                            <div className="space-y-4">
                                <div>
                                    <p className="font-semibold text-slate-900">Version 1.0 - {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    <p className="text-sm text-slate-600">Initial publication of disclaimers page</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <h3 className="font-semibold text-slate-900 mb-4">Related Legal Documents</h3>
                        <div className="grid md:grid-cols-2 gap-3">
                            <Link href="/terms" className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                                <span className="font-medium text-slate-900">Terms of Service</span>
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                            <Link href="/privacy" className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
                                <span className="font-medium text-slate-900">Privacy Policy</span>
                                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                    <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h3 className="font-semibold text-slate-900 mb-2">Questions About These Disclaimers?</h3>
                        <p className="text-sm text-slate-700 mb-3">
                            If you have questions about any of the information on this page, please don&#39;t hesitate to reach out.
                        </p>
                        <Link href="/contact" className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold text-sm">
                            Contact Us
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                    </div>

                </div>
            </main>

            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-4xl mx-auto px-6 py-6">
                    <p className="text-sm text-slate-600 text-center">
                        © {2025} Studycedo Independent Studycedo revision platform not affiliated with AQA, Pearson Edexcel, or OCR .
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default DisclaimersPage;