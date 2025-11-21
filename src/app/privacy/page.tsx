import React from "react";
import Link from "next/link";

const PrivacyPolicyPage = () => {
    const currentYear = new Date().getFullYear();
    const effectiveDate = "1 January 2025";

    const companyDetails = {
        legalName: "GCSE Ltd",
        tradingAs: "GCSE",
        postalAddress: "Office address to be provided, United Kingdom",
        privacyEmail: "privacy@GCSE.com",
        supportEmail: "support@GCSE.com",
        securityEmail: "security@GCSE.com",
        dpoName: "To be appointed",
        icoNumber: "Pending registration",
        hostingProvider: "Firebase/Google Cloud Platform",
        aiProvider: "OpenAI",
        analyticsProvider: "Google Analytics",
        emailProvider: "To be determined",
        supportTool: "To be determined"
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-4">
                    <Link href="/" className="text-blue-600 hover:text-blue-700 font-semibold">
                        ← Back to GCSE
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-6 py-12">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 md:p-12">

                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
                            Privacy Policy
                        </h1>
                        <p className="text-slate-600 italic">
                            Effective date: {effectiveDate}
                        </p>
                        <p className="text-slate-700 mt-4 leading-relaxed">
                            This Privacy Policy explains how {companyDetails.tradingAs} (&#34;we&#34;, &#34;us&#34;, &#34;our&#34;), operated by {companyDetails.legalName}, collects, uses, discloses, and protects personal information when you use our website, applications, and services (the &#34;Service&#34;).
                        </p>
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-6">
                            <p className="text-sm text-amber-900 font-semibold">
                                Important: If you are under 18, please review this with a parent or guardian.
                            </p>
                        </div>
                    </div>

                    {/* Quick Navigation */}
                    <nav className="bg-slate-50 rounded-lg p-6 mb-10 border border-slate-200">
                        <h2 className="font-semibold text-slate-900 mb-3">Quick Navigation</h2>
                        <div className="grid md:grid-cols-3 gap-2 text-sm">
                            <a href="#who-we-are" className="text-blue-600 hover:underline">1. Who We Are</a>
                            <a href="#scope" className="text-blue-600 hover:underline">2. Scope</a>
                            <a href="#children" className="text-blue-600 hover:underline">3. Children & Consent</a>
                            <a href="#information" className="text-blue-600 hover:underline">4. Information We Collect</a>
                            <a href="#how-we-use" className="text-blue-600 hover:underline">5. How We Use Data</a>
                            <a href="#lawful-bases" className="text-blue-600 hover:underline">6. Lawful Bases</a>
                            <a href="#ai-data" className="text-blue-600 hover:underline">7. AI and Your Data</a>
                            <a href="#sharing" className="text-blue-600 hover:underline">8. Sharing Information</a>
                            <a href="#transfers" className="text-blue-600 hover:underline">9. International Transfers</a>
                            <a href="#retention" className="text-blue-600 hover:underline">10. Data Retention</a>
                            <a href="#your-rights" className="text-blue-600 hover:underline">11. Your Rights</a>
                            <a href="#security" className="text-blue-600 hover:underline">12. Security</a>
                            <a href="#moderation" className="text-blue-600 hover:underline">13. Moderation & Safety</a>
                            <a href="#third-party" className="text-blue-600 hover:underline">14. Third-Party Links</a>
                            <a href="#school" className="text-blue-600 hover:underline">15. School Use</a>
                            <a href="#marketing" className="text-blue-600 hover:underline">16. Marketing</a>
                            <a href="#automated" className="text-blue-600 hover:underline">17. Automated Decisions</a>
                            <a href="#changes" className="text-blue-600 hover:underline">18. Policy Changes</a>
                            <a href="#contact" className="text-blue-600 hover:underline">19. Contact</a>
                        </div>
                    </nav>

                    {/* Section 1: Who We Are */}
                    <section id="who-we-are" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Who We Are</h2>
                        <div className="space-y-2 text-slate-700">
                            <p><strong>Controller:</strong> {companyDetails.legalName} (trading as {companyDetails.tradingAs})</p>
                            <p><strong>Registered address:</strong> {companyDetails.postalAddress}</p>
                            <p><strong>Email:</strong> <a href={`mailto:${companyDetails.privacyEmail}`} className="text-blue-600 hover:underline">{companyDetails.privacyEmail}</a></p>
                            <p><strong>Data Protection Officer:</strong> {companyDetails.dpoName}</p>
                            <p><strong>ICO Registration:</strong> {companyDetails.icoNumber}</p>
                        </div>
                    </section>

                    {/* Section 2: Scope */}
                    <section id="scope" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Scope</h2>
                        <p className="text-slate-700 mb-3">This Policy applies to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li>Students (typically ages 13-18) using our revision tools</li>
                            <li>Parents/guardians accessing progress dashboards</li>
                            <li>Website visitors and free planner users</li>
                            <li>Schools or educators using our Service (additional terms may apply)</li>
                        </ul>
                    </section>

                    {/* Section 3: Children and Parental Consent */}
                    <section id="children" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Children and Parental Consent</h2>

                        <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">Age Requirements</h3>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 space-y-3">
                            <div>
                                <p className="font-semibold text-slate-900">Under 13:</p>
                                <p className="text-sm text-slate-700">You must have verifiable parental consent before creating an account</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Ages 13-15 (UK):</p>
                                <p className="text-sm text-slate-700">We recommend parental oversight; consent is required for marketing</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">Ages 16-17:</p>
                                <p className="text-sm text-slate-700">You can consent yourself for most purposes; parental oversight recommended</p>
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">18+:</p>
                                <p className="text-sm text-slate-700">You can use the Service independently</p>
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">How We Obtain Parental Consent</h3>
                        <p className="text-slate-700 mb-2">For users under 13:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li>Parent/guardian email verification required</li>
                            <li>Parent receives explanation of data use and rights</li>
                            <li>Parent can access, review, and delete child&#39;s data anytime</li>
                        </ul>

                        <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">If You Are a Parent</h3>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li>You can request access to your child&#39;s data at any time</li>
                            <li>You can request deletion of your child&#39;s account</li>
                            <li>The Parent Dashboard shows study progress but not AI Tutor conversations (to respect student privacy while maintaining safety)</li>
                        </ul>
                    </section>

                    {/* Section 4: Information We Collect */}
                    <section id="information" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Information We Collect</h2>

                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">A. Account & Profile</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Name, email address, password (encrypted)</li>
                                    <li>Date of birth or age range</li>
                                    <li>Role (student, parent, teacher)</li>
                                    <li>School name (optional)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">B. Study & Planner Data</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Subjects, exam board, tier (Foundation/Higher)</li>
                                    <li>Target grades, exam dates, hours available</li>
                                    <li>Generated study schedules and timetables</li>
                                    <li>Readiness Scores, weak topics, task completions</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">C. Learning Activity</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Topics viewed, notes read, videos watched</li>
                                    <li>Quiz attempts, scores, and time spent</li>
                                    <li>Past paper and predicted question attempts</li>
                                    <li>Badge achievements and streaks</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">D. AI Tutor Interactions</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Questions you ask the AI Tutor</li>
                                    <li>AI-generated responses</li>
                                    <li>Context from the topic you&#39;re studying</li>
                                    <li>Moderation flags (if triggered)</li>
                                </ul>
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-3">
                                    <p className="text-sm text-blue-900">
                                        <strong>Note:</strong> We do not routinely read your AI conversations. However, we may review them for:
                                    </p>
                                    <ul className="list-disc pl-6 text-sm text-blue-900 mt-2 space-y-1">
                                        <li>Safety concerns (flagged harmful content)</li>
                                        <li>Technical troubleshooting</li>
                                        <li>Quality improvement (anonymized/aggregated)</li>
                                        <li>Legal obligations</li>
                                    </ul>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">E. Purchase & Payment Data</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Products purchased (Subject Packs, Season Pass)</li>
                                    <li>Transaction amount, date, currency</li>
                                    <li>Payment processing via Stripe (we don&#39;t store full card numbers)</li>
                                    <li>Billing address for VAT compliance</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">F. Communications</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Emails and messages you send us</li>
                                    <li>Survey responses and feedback</li>
                                    <li>Support tickets</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">G. Device & Usage Data</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Device type, operating system, browser</li>
                                    <li>IP address, approximate location (country/city)</li>
                                    <li>Pages visited, features used, session duration</li>
                                    <li>Referral source (how you found us)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">H. Cookies & Similar Technologies</h3>
                                <p className="text-slate-700 text-sm">
                                    See our <Link href="/cookies" className="text-blue-600 hover:underline font-semibold">Cookie Policy</Link> for details.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">I. Parent Dashboard Data</h3>
                                <p className="text-slate-700 text-sm mb-2">When a student links a parent account:</p>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="bg-green-50 border border-green-200 rounded p-3">
                                        <p className="text-sm font-semibold text-green-900 mb-2">Parent CAN view:</p>
                                        <ul className="list-disc pl-5 text-sm text-green-800 space-y-1">
                                            <li>Readiness Score</li>
                                            <li>Weak topics</li>
                                            <li>Schedule adherence</li>
                                            <li>Overall progress</li>
                                        </ul>
                                    </div>
                                    <div className="bg-red-50 border border-red-200 rounded p-3">
                                        <p className="text-sm font-semibold text-red-900 mb-2">Parent CANNOT view:</p>
                                        <ul className="list-disc pl-5 text-sm text-red-800 space-y-1">
                                            <li>Individual AI Tutor conversations</li>
                                            <li>Quiz answers</li>
                                            <li>Notes content</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 5: How We Use Your Information */}
                    <section id="how-we-use" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">5. How We Use Your Information</h2>
                        <p className="text-slate-700 mb-4">We process personal data only when we have a lawful basis:</p>

                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">A. Provide the Service (Contract Performance / Legitimate Interest)</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Create and manage your account</li>
                                    <li>Generate personalized study schedules</li>
                                    <li>Calculate Readiness Scores and identify weak topics</li>
                                    <li>Deliver Subject Pack content</li>
                                    <li>Enable AI Tutor functionality</li>
                                    <li>Process purchases and manage subscriptions</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">B. Improve & Personalize (Legitimate Interest)</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Analyze usage patterns (anonymized/aggregated)</li>
                                    <li>Improve content recommendations</li>
                                    <li>Develop new features</li>
                                    <li>A/B test interface changes</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">C. Communications (Contract / Consent / Legitimate Interest)</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li><strong>Transactional emails</strong> (plan ready, purchase confirmations, password resets) — cannot opt out</li>
                                    <li><strong>Service updates</strong> (new features, maintenance) — legitimate interest</li>
                                    <li><strong>Marketing emails</strong> (tips, offers) — consent required for under-16s; you can unsubscribe anytime</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">D. Safety & Security (Legitimate Interest / Legal Obligation)</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Moderate AI Tutor content for harmful material</li>
                                    <li>Detect and prevent fraud, abuse, or Terms violations</li>
                                    <li>Respond to legal requests (court orders, safeguarding concerns)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">E. Legal Compliance (Legal Obligation)</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Tax and accounting records</li>
                                    <li>Respond to data subject requests</li>
                                    <li>Comply with lawful requests from authorities</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 6: Lawful Bases Summary Table */}
                    <section id="lawful-bases" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">6. Lawful Bases (Summary Table)</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-300 text-sm">
                                <thead className="bg-slate-100">
                                <tr>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Purpose</th>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Under 13</th>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Ages 13-15 (UK)</th>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Ages 16+</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td className="border border-slate-300 p-3">Account creation</td>
                                    <td className="border border-slate-300 p-3">Parental consent</td>
                                    <td className="border border-slate-300 p-3">Parental consent / Contract</td>
                                    <td className="border border-slate-300 p-3">Contract</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">Study scheduling</td>
                                    <td className="border border-slate-300 p-3">Parental consent</td>
                                    <td className="border border-slate-300 p-3">Contract</td>
                                    <td className="border border-slate-300 p-3">Contract</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-3">AI Tutor</td>
                                    <td className="border border-slate-300 p-3">Parental consent</td>
                                    <td className="border border-slate-300 p-3">Parental consent / Contract</td>
                                    <td className="border border-slate-300 p-3">Contract / Consent</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">Marketing emails</td>
                                    <td className="border border-slate-300 p-3">Parental consent</td>
                                    <td className="border border-slate-300 p-3">Parental consent</td>
                                    <td className="border border-slate-300 p-3">Consent</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-3">Analytics (anonymized)</td>
                                    <td className="border border-slate-300 p-3">Legitimate interest</td>
                                    <td className="border border-slate-300 p-3">Legitimate interest</td>
                                    <td className="border border-slate-300 p-3">Legitimate interest</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Section 7: AI and Your Data */}
                    <section id="ai-data" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">7. AI and Your Data</h2>

                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">What We Send to AI Providers</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Your question/prompt</li>
                                    <li>Current subject and topic context</li>
                                    <li>Relevant notes/formulas (excerpts only)</li>
                                    <li>Previous messages in the conversation (for context)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">What We Don&#39;t Send</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Your name or email</li>
                                    <li>Detailed account information</li>
                                    <li>Unrelated study history</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Training</h3>
                                <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                                    <p className="text-sm text-purple-900">
                                        We configure our AI provider ({companyDetails.aiProvider}) to <strong>not use your data</strong> to train or improve foundation models (where opt-out is available). If provider policies change, we will update this notice.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Human Review of AI Conversations</h3>
                                <p className="text-slate-700 text-sm mb-2">We do <strong>not</strong> routinely read your AI chats. We <strong>may</strong> review if:</p>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Automatic moderation flags concerning content (self-harm, abuse)</li>
                                    <li>You report a problem or request support</li>
                                    <li>Required by law or safeguarding duty</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 8: Sharing Your Information */}
                    <section id="sharing" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">8. Sharing Your Information</h2>
                        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-5">
                            <p className="text-sm text-green-900 font-semibold">
                                We do NOT sell your personal data.
                            </p>
                        </div>
                        <p className="text-slate-700 mb-4">We share data only as follows:</p>

                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-3">A. Service Providers (Processors)</h3>
                                <p className="text-slate-700 text-sm mb-3">Under contract, limited to what&#39;s necessary:</p>
                                <div className="overflow-x-auto">
                                    <table className="w-full border-collapse border border-slate-300 text-sm">
                                        <thead className="bg-slate-100">
                                        <tr>
                                            <th className="border border-slate-300 p-3 text-left font-semibold">Provider Type</th>
                                            <th className="border border-slate-300 p-3 text-left font-semibold">Examples</th>
                                            <th className="border border-slate-300 p-3 text-left font-semibold">Purpose</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        <tr>
                                            <td className="border border-slate-300 p-3">Hosting/Platform</td>
                                            <td className="border border-slate-300 p-3">{companyDetails.hostingProvider}</td>
                                            <td className="border border-slate-300 p-3">App infrastructure</td>
                                        </tr>
                                        <tr className="bg-slate-50">
                                            <td className="border border-slate-300 p-3">Payments</td>
                                            <td className="border border-slate-300 p-3">Stripe</td>
                                            <td className="border border-slate-300 p-3">Payment processing</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 p-3">AI</td>
                                            <td className="border border-slate-300 p-3">{companyDetails.aiProvider}</td>
                                            <td className="border border-slate-300 p-3">AI Tutor responses</td>
                                        </tr>
                                        <tr className="bg-slate-50">
                                            <td className="border border-slate-300 p-3">Analytics</td>
                                            <td className="border border-slate-300 p-3">{companyDetails.analyticsProvider}</td>
                                            <td className="border border-slate-300 p-3">Usage insights</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-slate-300 p-3">Email/SMS</td>
                                            <td className="border border-slate-300 p-3">{companyDetails.emailProvider}</td>
                                            <td className="border border-slate-300 p-3">Communications</td>
                                        </tr>
                                        <tr className="bg-slate-50">
                                            <td className="border border-slate-300 p-3">Support Tools</td>
                                            <td className="border border-slate-300 p-3">{companyDetails.supportTool}</td>
                                            <td className="border border-slate-300 p-3">Customer support</td>
                                        </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">B. Parent/Guardian Accounts</h3>
                                <p className="text-slate-700 text-sm mb-2">When a student links a parent:</p>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li><strong>Parent sees:</strong> overall progress, Readiness Scores, schedule summary, weak topics</li>
                                    <li><strong>Parent does NOT see:</strong> detailed quiz answers, AI conversations, personal notes</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">C. Schools/Institutions (if applicable)</h3>
                                <p className="text-slate-700 text-sm mb-2">If your school provides access:</p>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>The school may see class-level or individual progress per their agreement with us</li>
                                    <li>The school is a joint controller for certain processing</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">D. Legal & Safety</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Law enforcement or regulators (when required by law)</li>
                                    <li>To protect rights, safety, or prevent fraud/abuse</li>
                                    <li>In safeguarding situations (under-18 welfare concerns)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">E. Business Transfers</h3>
                                <p className="text-slate-700 text-sm mb-2">If we merge, are acquired, or sell assets:</p>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Your data may transfer to the new entity</li>
                                    <li>This Policy (or equivalent protections) will continue to apply</li>
                                    <li>We will notify you of significant changes</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 9: International Transfers */}
                    <section id="transfers" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">9. International Transfers</h2>
                        <p className="text-slate-700 mb-3">If we transfer data outside the UK/EEA, we use:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li><strong>Adequacy decisions</strong> (where applicable)</li>
                            <li><strong>Standard Contractual Clauses (SCCs)</strong> or <strong>International Data Transfer Addendum (IDTA)</strong></li>
                            <li>Additional technical safeguards (encryption, access controls)</li>
                        </ul>
                        <p className="text-slate-700 text-sm mt-4">
                            Specific transfers ({companyDetails.aiProvider}, {companyDetails.hostingProvider}) include appropriate safeguards. Contact us for details.
                        </p>
                    </section>

                    {/* Section 10: Data Retention */}
                    <section id="retention" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Data Retention</h2>
                        <p className="text-slate-700 mb-4">We keep personal data only as long as necessary:</p>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-300 text-sm">
                                <thead className="bg-slate-100">
                                <tr>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Data Type</th>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Retention Period</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td className="border border-slate-300 p-3">Account data</td>
                                    <td className="border border-slate-300 p-3">While active + 24 months after inactivity, then deleted</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">Study schedules & quiz results</td>
                                    <td className="border border-slate-300 p-3">24 months after last activity</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-3">AI Tutor messages</td>
                                    <td className="border border-slate-300 p-3">12 months (for context and quality)</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">Purchase records</td>
                                    <td className="border border-slate-300 p-3">6-10 years (tax/accounting law)</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-3">Support tickets</td>
                                    <td className="border border-slate-300 p-3">24 months</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">Marketing preferences</td>
                                    <td className="border border-slate-300 p-3">Until you opt out or request deletion</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-3">Anonymized analytics</td>
                                    <td className="border border-slate-300 p-3">Indefinitely</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                            <p className="text-sm text-blue-900">
                                <strong>You can request deletion anytime</strong> — see &#34;Your Rights&#34; below.
                            </p>
                        </div>
                    </section>

                    {/* Section 11: Your Rights */}
                    <section id="your-rights" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Your Rights</h2>
                        <p className="text-slate-700 mb-4">Under UK GDPR, you have the right to:</p>

                        <div className="grid md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">A. Access</h3>
                                <p className="text-sm text-slate-700">Request a copy of your personal data</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">B. Rectification</h3>
                                <p className="text-sm text-slate-700">Correct inaccurate or incomplete information</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">C. Erasure (&#34;Right to be Forgotten&#34;)</h3>
                                <p className="text-sm text-slate-700">Request deletion of your data</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">D. Restrict Processing</h3>
                                <p className="text-sm text-slate-700">Pause certain uses of your data</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">E. Data Portability</h3>
                                <p className="text-sm text-slate-700">Receive your data in a machine-readable format</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">F. Object</h3>
                                <p className="text-sm text-slate-700">Object to processing based on legitimate interests or direct marketing</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">G. Withdraw Consent</h3>
                                <p className="text-sm text-slate-700">Where processing relies on consent</p>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <h3 className="font-semibold text-slate-900 mb-2">H. Automated Decision-Making</h3>
                                <p className="text-sm text-slate-700">Request manual review or adjustment</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">How to Exercise Rights</h3>
                            <ul className="list-disc pl-6 space-y-2 text-slate-700">
                                <li><strong>Email:</strong> <a href={`mailto:${companyDetails.privacyEmail}`} className="text-blue-600 hover:underline">{companyDetails.privacyEmail}</a></li>
                                <li><strong>Response time:</strong> Within 1 month (we may extend by 2 months for complex requests; we&#39;ll tell you)</li>
                                <li>We may need to verify your identity</li>
                                <li>For under-18s: Parents/guardians can exercise rights on the child&#39;s behalf</li>
                            </ul>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">Right to Complain</h3>
                            <p className="text-slate-700 mb-2">If you&#39;re unhappy with how we handle your data:</p>
                            <ul className="list-disc pl-6 space-y-1 text-slate-700">
                                <li><strong>UK:</strong> Contact the Information Commissioner&#39;s Office (ICO) at <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ico.org.uk</a></li>
                                <li><strong>EEA:</strong> Contact your local Data Protection Authority</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 12: Security */}
                    <section id="security" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Security</h2>
                        <p className="text-slate-700 mb-3">We protect your data with:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li>Encryption in transit (TLS) and at rest (where feasible)</li>
                            <li>Password hashing (bcrypt or equivalent)</li>
                            <li>Role-based access controls</li>
                            <li>Regular security audits and updates</li>
                            <li>Vendor due diligence and contracts</li>
                        </ul>
                        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mt-4">
                            <p className="text-sm text-amber-900">
                                <strong>No system is 100% secure.</strong> If you suspect unauthorized access, contact <a href={`mailto:${companyDetails.securityEmail}`} className="text-blue-600 hover:underline font-semibold">{companyDetails.securityEmail}</a> immediately.
                            </p>
                        </div>
                    </section>

                    {/* Section 13: Moderation & Safety */}
                    <section id="moderation" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Moderation & Safety</h2>
                        <p className="text-slate-700 mb-3">To keep the Service safe:</p>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700">
                            <li><strong>Automated moderation</strong> flags harmful AI Tutor content</li>
                            <li><strong>Human review</strong> for serious concerns (self-harm, abuse)</li>
                            <li>We may restrict accounts or contact parents/guardians/authorities for safety reasons</li>
                            <li>We surface support resources where appropriate</li>
                        </ul>
                    </section>

                    {/* Section 14: Third-Party Links */}
                    <section id="third-party" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Third-Party Links</h2>
                        <p className="text-slate-700 mb-2">Our Service may link to:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li>Official exam board sites (for past papers, specs)</li>
                            <li>Educational resources</li>
                            <li>Social media</li>
                        </ul>
                        <p className="text-slate-700 mt-3">
                            We are not responsible for their privacy practices. Review their policies.
                        </p>
                    </section>

                    {/* Section 15: School/Institutional Use */}
                    <section id="school" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">15. School/Institutional Use</h2>
                        <p className="text-slate-700 mb-2">Where a school provides access:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li>The school may be a joint controller</li>
                            <li>We process data per a Data Processing Agreement (DPA) with the school</li>
                            <li>Some rights requests should be directed to the school</li>
                            <li>School staff may see class/student progress per the agreement</li>
                        </ul>
                    </section>

                    {/* Section 16: Marketing & Communications */}
                    <section id="marketing" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">16. Marketing & Communications</h2>

                        <div className="space-y-5">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Transactional Messages</h3>
                                <p className="text-slate-700 text-sm">
                                    Essential emails (plan ready, receipts, security alerts) — <strong>cannot opt out</strong>
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">Marketing Messages</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Consent required for under-16s (parental consent if under 13)</li>
                                    <li>You can unsubscribe anytime via the email link or account settings</li>
                                    <li>We may still send service updates (non-marketing)</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">How We Use Marketing Data</h3>
                                <ul className="list-disc pl-6 space-y-1 text-slate-700 text-sm">
                                    <li>Personalize email content based on subjects studied</li>
                                    <li>Track email opens/clicks (anonymized)</li>
                                    <li>Measure campaign effectiveness</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Section 17: Automated Decision-Making */}
                    <section id="automated" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">17. Automated Decision-Making</h2>
                        <p className="text-slate-700 mb-3">We use automated processing for:</p>
                        <ul className="list-disc pl-6 space-y-1 text-slate-700">
                            <li><strong>Study schedule generation</strong> (based on your inputs and assessment)</li>
                            <li><strong>Adaptive quiz difficulty</strong> (based on performance)</li>
                            <li><strong>Readiness Score calculation</strong> (algorithm-based)</li>
                        </ul>
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-4">
                            <p className="text-sm text-blue-900 mb-2"><strong>You have the right to:</strong></p>
                            <ul className="list-disc pl-6 text-sm text-blue-900 space-y-1">
                                <li>Request human review or override</li>
                                <li>Receive an explanation of how decisions are made</li>
                                <li>Contact <a href={`mailto:${companyDetails.supportEmail}`} className="text-blue-600 hover:underline font-semibold">{companyDetails.supportEmail}</a> for adjustments</li>
                            </ul>
                        </div>
                    </section>

                    {/* Section 18: Changes to This Policy */}
                    <section id="changes" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">18. Changes to This Policy</h2>
                        <ul className="list-disc pl-6 space-y-2 text-slate-700">
                            <li>We may update this Policy to reflect legal or service changes</li>
                            <li>We&#39;ll post the new &#34;Effective date&#34;</li>
                            <li>For material changes, we&#39;ll notify you via email or in-app notice (30 days&#39; notice where feasible)</li>
                            <li>Continued use after updates constitutes acceptance</li>
                        </ul>
                    </section>

                    {/* Section 19: Contact & Questions */}
                    <section id="contact" className="mb-10 scroll-mt-6">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">19. Contact & Questions</h2>

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                                <h3 className="font-semibold text-slate-900 mb-3">Privacy Requests or Questions</h3>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <p><strong>Email:</strong> <a href={`mailto:${companyDetails.privacyEmail}`} className="text-blue-600 hover:underline">{companyDetails.privacyEmail}</a></p>
                                    <p><strong>Address:</strong> {companyDetails.postalAddress}</p>
                                    <p><strong>DPO:</strong> {companyDetails.dpoName}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                                <h3 className="font-semibold text-slate-900 mb-3">Other Inquiries</h3>
                                <div className="space-y-2 text-sm text-slate-700">
                                    <p><strong>General support:</strong> <a href={`mailto:${companyDetails.supportEmail}`} className="text-blue-600 hover:underline">{companyDetails.supportEmail}</a></p>
                                    <p><strong>Security issues:</strong> <a href={`mailto:${companyDetails.securityEmail}`} className="text-blue-600 hover:underline">{companyDetails.securityEmail}</a></p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Appendix: Processor List */}
                    <section className="mb-10">
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">Appendix: Processor List</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse border border-slate-300 text-sm">
                                <thead className="bg-slate-100">
                                <tr>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Processor</th>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Service</th>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Data Shared</th>
                                    <th className="border border-slate-300 p-3 text-left font-semibold">Location</th>
                                </tr>
                                </thead>
                                <tbody>
                                <tr>
                                    <td className="border border-slate-300 p-3">{companyDetails.hostingProvider}</td>
                                    <td className="border border-slate-300 p-3">App hosting</td>
                                    <td className="border border-slate-300 p-3">Account, study data</td>
                                    <td className="border border-slate-300 p-3">US/EU (adequate safeguards)</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">Stripe</td>
                                    <td className="border border-slate-300 p-3">Payments</td>
                                    <td className="border border-slate-300 p-3">Name, email, payment info</td>
                                    <td className="border border-slate-300 p-3">US (adequate safeguards)</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-3">{companyDetails.aiProvider}</td>
                                    <td className="border border-slate-300 p-3">AI Tutor</td>
                                    <td className="border border-slate-300 p-3">Prompts, context</td>
                                    <td className="border border-slate-300 p-3">US (adequate safeguards)</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">{companyDetails.analyticsProvider}</td>
                                    <td className="border border-slate-300 p-3">Analytics</td>
                                    <td className="border border-slate-300 p-3">Usage data (anonymized)</td>
                                    <td className="border border-slate-300 p-3">US (adequate safeguards)</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-300 p-3">{companyDetails.emailProvider}</td>
                                    <td className="border border-slate-300 p-3">Email/SMS</td>
                                    <td className="border border-slate-300 p-3">Name, email, phone</td>
                                    <td className="border border-slate-300 p-3">TBD</td>
                                </tr>
                                <tr className="bg-slate-50">
                                    <td className="border border-slate-300 p-3">{companyDetails.supportTool}</td>
                                    <td className="border border-slate-300 p-3">Support</td>
                                    <td className="border border-slate-300 p-3">Name, email, messages</td>
                                    <td className="border border-slate-300 p-3">TBD</td>
                                </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-slate-600 mt-4">
                            Full Data Processing Agreements available on request.
                        </p>
                    </section>

                    {/* Footer */}
                    <div className="mt-12 pt-8 border-t border-slate-200">
                        <p className="text-sm text-slate-600 text-center italic">
                            Last updated: {effectiveDate}
                        </p>
                        <div className="flex justify-center gap-6 mt-4 text-sm">
                            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
                            <Link href="/notice" className="text-blue-600 hover:underline">Notice</Link>
                            <Link href="/cookies" className="text-blue-600 hover:underline">Cookie Policy</Link>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="bg-white border-t border-slate-200 mt-12">
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <p className="text-sm text-slate-600 text-center">
                        © {currentYear} {companyDetails.tradingAs}. We respect your privacy and protect your data.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default PrivacyPolicyPage;