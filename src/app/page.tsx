'use client'

import { Button } from './components/ui/button';
import { Card} from './components/ui/card';
import { Badge } from './components/ui/badge';
import {
    Star,
    CheckCircle,
    Clock,
    TrendingUp,
    BookOpen,
    ArrowRight,
    Shield,
    Infinity,
    Users
} from 'lucide-react';
import {SubjectCard} from "@/app/components/SubjectCard";
import {useRouter} from "next/navigation";

function HomePage() {
    const router = useRouter();

    const subjects = [
        { subject: 'Maths', description: 'Master algebra, calculus, and problem-solving with AI-predicted questions' },
        { subject: 'English Literature', description: 'Ace your essays with model answers and exam technique' },
        { subject: 'Combined Science', description: 'Triple your science knowledge with interactive content' },
        { subject: 'English Language', description: 'Perfect your language analysis and creative writing' },
        { subject: 'Biology', description: 'From cells to ecosystems - visual learning made simple' },
        { subject: 'Chemistry', description: 'Chemical reactions, equations, and practical skills' },
        { subject: 'Physics', description: 'Forces, energy, and waves explained clearly' },
        { subject: 'History', description: 'Timeline mastery with source analysis practice' },
        { subject: 'Geography', description: 'Physical and human geography with case studies' },
        { subject: 'French', description: 'Speaking, listening, reading, and writing skills' },
        { subject: 'Spanish', description: 'Comprehensive language learning with cultural context' },
        { subject: 'Computer Science', description: 'Programming, algorithms, and computational thinking' }
    ];

    const onNavigate = (url: string) => {
        router.push(url);
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative overflow-hidden bg-white">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-success/5"></div>
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-20 pt-20 pb-32">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8">
                            <Star className="w-4 h-4" />
                            Trusted by 10,000+ GCSE students
                        </div>

                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-text-main mb-8 leading-tight tracking-tight">
                            Your GCSE Success,
                            <span className="bg-gradient-to-r from-primary to-accent-success bg-clip-text text-transparent"> Tailored by AI</span>
                        </h1>

                        <p className="text-xl sm:text-2xl text-text-muted mb-12 leading-relaxed max-w-3xl mx-auto">
                            Get a personalised revision plan in 2 minutes. Free AI planner + premium subject packs with past papers and predicted 2026 questions.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
                            <Button
                                size="lg"
                                onClick={() => onNavigate?.('/onboarding')}
                                className="bg-primary hover:cursor-pointer hover:bg-primary-dark text-white text-lg px-10 py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                            >
                                Start Free Planner
                                <ArrowRight className="w-5 h-5 ml-2" />
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => onNavigate?.('/subjects')}
                                className="text-lg hover:cursor-pointer px-6 py-4 h-auto text-text-muted hover:text-primary"
                            >
                                Browse Subjects →
                            </Button>
                        </div>

                        {/* Social Proof */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-text-muted">
                            <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} className="w-5 h-5 fill-warning text-warning" />
                                ))}
                                <span className="ml-2 text-sm font-medium">4.9/5 rating</span>
                            </div>
                            <div className="hidden sm:block w-1 h-1 bg-text-muted/30 rounded-full"></div>
                            <span className="text-sm font-medium">Free to start • No credit card required</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-24 bg-bg-subtle">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                    <div className="text-center mb-20">
                        <Badge variant="secondary" className="bg-primary/10 text-primary mb-6">
                            How it works
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl font-bold text-text-main mb-6">
                            Three simple steps to GCSE success
                        </h2>
                        <p className="text-xl text-text-muted max-w-2xl mx-auto">
                            Our AI-powered system creates a personalised study plan that adapts to your learning style and progress.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
                        <div className="relative">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                                    <Clock className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-success rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    1
                                </div>
                                <h3 className="text-2xl font-bold text-text-main mb-4">Quick Assessment</h3>
                                <p className="text-text-muted text-lg leading-relaxed">
                                    Answer targeted questions to identify your current knowledge level and learning gaps across all subjects.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                                    <TrendingUp className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-success rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    2
                                </div>
                                <h3 className="text-2xl font-bold text-text-main mb-4">AI Schedule</h3>
                                <p className="text-text-muted text-lg leading-relaxed">
                                    Get a smart revision timetable that prioritizes weak areas and optimizes study time based on your goals.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="text-center">
                                <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                                    <CheckCircle className="w-10 h-10 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent-success rounded-full flex items-center justify-center text-white text-sm font-bold">
                                    3
                                </div>
                                <h3 className="text-2xl font-bold text-text-main mb-4">Practice & Improve</h3>
                                <p className="text-text-muted text-lg leading-relaxed">
                                    Access 10+ years of past papers, AI-predicted 2026 questions, and get instant personalized feedback.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <Badge variant="secondary" className="bg-accent-success/10 text-accent-success mb-6">
                                Why choose us
                            </Badge>
                            <h2 className="text-4xl sm:text-5xl font-bold text-text-main mb-8">
                                Everything you need to ace your GCSEs
                            </h2>
                            <p className="text-xl text-text-muted mb-12 leading-relaxed">
                                Join thousands of students who&#39;ve improved their grades with our AI-powered revision system. No subscriptions, no hidden costs.
                            </p>

                            <div className="space-y-8">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Infinity className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-main mb-2">Pay once, keep forever</h3>
                                        <p className="text-text-muted">
                                            No subscriptions or hidden fees. One-time purchase gives you lifetime access to all content and updates.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                        <BookOpen className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-main mb-2">10+ years of past papers</h3>
                                        <p className="text-text-muted">
                                            Complete collection of past papers with AI-predicted 2026 questions based on curriculum analysis.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                        <Users className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-text-main mb-2">Parent progress tracking</h3>
                                        <p className="text-text-muted">
                                            Keep parents informed with detailed progress reports and upcoming revision schedules.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="bg-gradient-to-br from-primary/10 to-accent-success/10 rounded-3xl p-8">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-white rounded-xl p-4 shadow-sm">
                                        <div className="text-2xl font-bold text-primary mb-1">98%</div>
                                        <div className="text-sm text-text-muted">Success rate</div>
                                    </div>
                                    <div className="bg-white rounded-xl p-4 shadow-sm">
                                        <div className="text-2xl font-bold text-accent-success mb-1">2.3x</div>
                                        <div className="text-sm text-text-muted">Grade improvement</div>
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                            <span className="text-white font-bold text-sm">AI</span>
                                        </div>
                                        <div>
                                            <div className="font-semibold text-text-main">AI Tutor</div>
                                            <div className="text-sm text-text-muted">Available 24/7</div>
                                        </div>
                                    </div>
                                    <p className="text-text-muted text-sm">
                                        &#34;Based on your recent quiz, I recommend focusing on quadratic equations this week. Here&#39;s a personalized study plan...&#34;
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Demo */}
            <section className="py-24 bg-gradient-to-br from-primary/5 via-transparent to-accent-success/5">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-20">
                    <div className="text-center mb-16">
                        <Badge variant="secondary" className="bg-primary/10 text-primary mb-6">
                            Try it now
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl font-bold text-text-main mb-6">
                            Get your free revision plan
                        </h2>
                        <p className="text-xl text-text-muted max-w-2xl mx-auto">
                            Tell us about your goals and we&#39;ll create a personalized study schedule in under 2 minutes
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-2xl border border-border p-8 lg:p-12">
                        <div className="grid md:grid-cols-3 gap-6 mb-8">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main">
                                    Exam Board
                                </label>
                                <select className="w-full p-4 border border-border rounded-xl bg-white text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                                    <option>AQA</option>
                                    <option>Edexcel</option>
                                    <option>OCR</option>
                                    <option>WJEC</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main">
                                    Target Grade
                                </label>
                                <select className="w-full p-4 border border-border rounded-xl bg-white text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                                    <option>Grade 9</option>
                                    <option>Grade 8</option>
                                    <option>Grade 7</option>
                                    <option>Grade 6</option>
                                    <option>Grade 5</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main">
                                    Study Time Available
                                </label>
                                <select className="w-full p-4 border border-border rounded-xl bg-white text-text-main focus:ring-2 focus:ring-primary focus:border-transparent transition-all">
                                    <option>1-5 hours/week</option>
                                    <option>5-10 hours/week</option>
                                    <option>10-15 hours/week</option>
                                    <option>15+ hours/week</option>
                                </select>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            onClick={() => onNavigate?.('/onboarding')}
                            className="w-full hover:cursor-pointer bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary text-white text-lg px-8 py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]"
                        >
                            Create My Free Revision Plan
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>

                        <p className="text-center text-sm text-text-muted mt-4">
                            No signup required • Takes less than 2 minutes
                        </p>
                    </div>
                </div>
            </section>

            {/* Subjects Preview */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                    <div className="text-center mb-20">
                        <Badge variant="secondary" className="bg-accent-success/10 text-accent-success mb-6">
                            Subject packs
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl font-bold text-text-main mb-6">
                            Master every GCSE subject
                        </h2>
                        <p className="text-xl text-text-muted max-w-3xl mx-auto">
                            From Maths to Modern Languages, get comprehensive revision materials for all major GCSE subjects. Each pack includes past papers, predicted questions, and expert guidance.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                        {subjects.slice(0, 6).map((subject) => (
                            <SubjectCard
                                key={subject.subject}
                                subject={subject.subject}
                                description={subject.description}
                                examBoard="AQA"
                                onPreview={() => {}}
                                onViewPack={() => onNavigate?.('/subjects')}
                            />
                        ))}
                    </div>

                    <div className="text-center">
                        <Button
                            size="lg"
                            onClick={() => onNavigate?.('/subjects')}
                            className="bg-gradient-to-r hover:cursor-pointer from-accent-success to-primary hover:from-primary hover:to-accent-success text-white px-8 py-4 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                        >
                            Explore All {subjects.length} Subjects
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Pricing Teaser */}
            <section className="py-24 bg-bg-subtle">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-20">
                    <div className="text-center mb-20">
                        <Badge variant="secondary" className="bg-primary/10 text-primary mb-6">
                            Pricing
                        </Badge>
                        <h2 className="text-4xl sm:text-5xl font-bold text-text-main mb-6">
                            Simple, transparent pricing
                        </h2>
                        <p className="text-xl text-text-muted max-w-2xl mx-auto">
                            Start free, upgrade when you&#39;re ready. No hidden fees, no recurring charges.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Free Plan */}
                        <Card className="border-border bg-white p-8 rounded-2xl">
                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-text-main mb-2">Free Planner</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-4">
                                    <span className="text-5xl font-bold text-text-main">£0</span>
                                </div>
                                <p className="text-text-muted">Perfect for getting started</p>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />
                                    <span className="text-text-muted">AI-powered revision schedule</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />
                                    <span className="text-text-muted">Personalized study plan</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />
                                    <span className="text-text-muted">Progress tracking</span>
                                </li>
                            </ul>

                            <Button
                                variant="outline"
                                onClick={() => onNavigate?.('/onboarding')}
                                className="w-full py-3 rounded-xl hover:cursor-pointer"
                            >
                                Get Started Free
                            </Button>
                        </Card>

                        {/* Subject Pack - Most Popular */}
                        <Card className="border-primary border-2 bg-white p-8 rounded-2xl relative shadow-xl scale-105">
                            {/*<Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-primary to-accent-success text-white px-4 py-1">*/}
                            {/*    Most Popular*/}
                            {/*</Badge>*/}

                            <div className="text-center mb-8">
                                <h3 className="text-2xl font-bold text-text-main mb-2">Subject Pack</h3>
                                <div className="flex items-baseline justify-center gap-1 mb-4">
                                    <span className="text-5xl font-bold text-primary">£30</span>
                                </div>
                                <p className="text-text-muted">Per subject • Pay once, keep forever</p>
                            </div>

                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />
                                    <span className="text-text-muted">10+ years of past papers</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />
                                    <span className="text-text-muted">AI-predicted 2026 questions</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />
                                    <span className="text-text-muted">Interactive quizzes & videos</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />
                                    <span className="text-text-muted">AI tutor assistance</span>
                                </li>
                            </ul>

                            <Button
                                onClick={() => onNavigate?.('/subjects')}
                                className="w-full hover:cursor-pointer bg-gradient-to-r from-primary to-accent-success hover:from-primary-dark hover:to-primary py-3 rounded-xl"
                            >
                                Choose Subject
                            </Button>
                        </Card>

                        {/*/!* Season Pass *!/*/}
                        {/*<Card className="border-border bg-white p-8 rounded-2xl">*/}
                        {/*    <div className="text-center mb-8">*/}
                        {/*        <h3 className="text-2xl font-bold text-text-main mb-2">Season Pass</h3>*/}
                        {/*        <div className="flex items-baseline justify-center gap-1 mb-4">*/}
                        {/*            <span className="text-5xl font-bold text-text-main">£79</span>*/}
                        {/*        </div>*/}
                        {/*        <p className="text-text-muted">All subjects + premium features</p>*/}
                        {/*    </div>*/}

                        {/*    <ul className="space-y-4 mb-8">*/}
                        {/*        <li className="flex items-start gap-3">*/}
                        {/*            <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />*/}
                        {/*            <span className="text-text-muted">Access to all 12+ subjects</span>*/}
                        {/*        </li>*/}
                        {/*        <li className="flex items-start gap-3">*/}
                        {/*            <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />*/}
                        {/*            <span className="text-text-muted">Unlimited AI tutor usage</span>*/}
                        {/*        </li>*/}
                        {/*        <li className="flex items-start gap-3">*/}
                        {/*            <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />*/}
                        {/*            <span className="text-text-muted">Priority support</span>*/}
                        {/*        </li>*/}
                        {/*        <li className="flex items-start gap-3">*/}
                        {/*            <CheckCircle className="w-5 h-5 text-accent-success mt-0.5 shrink-0" />*/}
                        {/*            <span className="text-text-muted">Family sharing (up to 3 students)</span>*/}
                        {/*        </li>*/}
                        {/*    </ul>*/}

                        {/*    <Button*/}
                        {/*        variant="outline"*/}
                        {/*        onClick={() => onNavigate?.('/pricing')}*/}
                        {/*        className="w-full py-3 hover:cursor-pointer rounded-xl border-primary text-primary hover:bg-primary hover:text-white"*/}
                        {/*    >*/}
                        {/*        Learn More*/}
                        {/*    </Button>*/}
                        {/*</Card>*/}
                    </div>

                    <div className="text-center mt-16">
                        <p className="text-text-muted mb-4">
                            30-day money-back guarantee • No recurring charges • Secure payment
                        </p>
                        <div className="flex items-center justify-center gap-4 text-sm text-text-muted">
                            <Shield className="w-4 h-4" />
                            <span>Secure checkout</span>
                            <span>•</span>
                            <span>Instant access</span>
                            <span>•</span>
                            <span>Lifetime updates</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-text-main text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-20">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen className="w-8 h-8 text-primary" />
                                <span className="font-bold text-xl">GCSE AI Revision</span>
                            </div>
                            <p className="text-gray-300 text-sm">
                                Your GCSE Success, Tailored by AI
                            </p>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li><button onClick={() => onNavigate?.('/onboarding')}>Free Planner</button></li>
                                <li><button onClick={() => onNavigate?.('/subjects')}>Subjects</button></li>
                                <li><button onClick={() => onNavigate?.('/pricing')}>Pricing</button></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Support</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li><a href="#">Help Centre</a></li>
                                <li><a href="#">Contact Us</a></li>
                                <li><a href="#">FAQs</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li><a href="/privacy">Privacy Policy</a></li>
                                <li><a href="/terms">Terms of Service</a></li>
                                <li><a href="/notice">Exam Board Notice</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-700 mt-12 pt-8 text-center text-sm text-gray-300">
                        <p>Not affiliated with any exam board. All exam board names are trademarks of their respective owners.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default HomePage