'use client'

import { useState } from 'react';
import { motion } from 'motion/react';
import {
    Star,
    CheckCircle,
    TrendingUp,
    BookOpen,
    ArrowRight,
    Shield,
    Smile,
    Calendar,
    GraduationCap,
    Target,
    Gamepad2,
    Sparkles,
    ClipboardList,
    Brain,
    BarChart3,
    CheckCircle2,
    Facebook,
    Twitter,
    Instagram,
    Linkedin,
    ChevronDown,
    Upload,
    FileText,
    Lightbulb,
    Award,
    Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

function HomePage() {
    const router = useRouter();
    const [activeCard, setActiveCard] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('plan');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const adaptiveCards = [
        {
            icon: Smile,
            title: 'Adapts to your mood',
            defaultLine: 'Plans around your energy and focus.',
            expandedCopy: "Good day? Do more. Stressful day? We'll consolidate your learning instead.",
        },
        {
            icon: Calendar,
            title: 'Plans like a coach',
            defaultLine: 'Builds your best next step.',
            expandedCopy:
                'Creates personalised schedules that prioritise your weak areas and make the best use of your study time.',
        },
        {
            icon: Lightbulb,
            title: 'Teaches like a tutor',
            defaultLine: 'Explains until it clicks.',
            expandedCopy:
                'Explains concepts in different ways until you understand, adapting to how you learn best.',
        },
        {
            icon: Award,
            title: 'Tests like an exam board',
            defaultLine: 'Prepares you for the real thing.',
            expandedCopy:
                'Combines real past-paper practice with AI-predicted questions based on curriculum patterns.',
        },
        {
            icon: Zap,
            title: 'Engages like a game',
            defaultLine: 'Keeps revision motivating.',
            expandedCopy: 'Rewards your progress and streaks so revision feels easier to stick to.',
        },
    ];

    const tabs = [
        { id: 'plan', label: 'My Plan' },
        { id: 'weak', label: 'Weak Areas' },
        { id: 'tutor', label: 'AI Tutor' },
        { id: 'quizzes', label: 'Quizzes & Mocks' },
        { id: 'progress', label: 'Progress' },
    ];

    const experts = [
        {
            name: 'Sarah K.',
            role: 'GCSE Maths Reviewer',
            bio: '12 years teaching GCSE Maths',
        },
        {
            name: 'James T.',
            role: 'A Level Biology Reviewer',
            bio: 'Former sixth-form teacher and exam prep specialist',
        },
        {
            name: 'Amira H.',
            role: 'English Literature Reviewer',
            bio: 'Specialist in essay structure and text analysis',
        },
        {
            name: 'Daniel R.',
            role: 'GCSE Chemistry Reviewer',
            bio: 'Experienced subject teacher focused on exam technique',
        },
        {
            name: 'Leah M.',
            role: 'A Level Psychology Reviewer',
            bio: 'Subject specialist in memory, research methods, and essay answers',
        },
        {
            name: 'Marcus B.',
            role: 'GCSE Physics Reviewer',
            bio: 'Physics teacher with strong focus on problem-solving and exam confidence',
        },
    ];

    const faqs = [
        {
            q: 'What makes StudyCedo different?',
            a: 'StudyCedo combines premium revision content with a personalised study path, weak-area focus, quizzes, mocks, and AI support all in one system tailored to your exam board.',
        },
        {
            q: 'Is it for GCSE and A Level?',
            a: 'Yes. StudyCedo is built for secondary students and supports both GCSE and A Level study.',
        },
        {
            q: 'Can I try it for free?',
            a: 'Yes. You can start with a free study plan and explore the platform before upgrading.',
        },
        {
            q: 'How is it personalised?',
            a: "Your plan is built around your subjects, exam date, weak areas, and learning activity over time — and even adapts to how you're feeling each day.",
        },
        {
            q: 'Can I upload my own notes?',
            a: 'Yes, where enabled. StudyCedo can turn your notes and materials into revision content and learning paths.',
        },
        {
            q: 'Is the content reliable?',
            a: 'StudyCedo is designed to provide structured, exam-focused learning support with strong quality control and grounded explanations.',
        },
    ];

    const onNavigate = (url: string) => {
        router.push(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white overflow-x-hidden" style={{ fontFamily: 'system-ui, sans-serif' }}>

            {/* ── HERO ── */}
            <section className="relative min-h-[100svh] flex items-center overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/50 via-purple-50/30 to-blue-50/50" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center w-full">
                    {/* Left */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="space-y-5 sm:space-y-6"
                    >
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.6 }}
                            className="text-purple-600 font-medium tracking-wide uppercase text-xs sm:text-sm"
                        >
                            GCSE &amp; A Level, personalised by AI
                        </motion.p>

                        <motion.h1
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight"
                        >
                            Revision content that adapts to you
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 0.6 }}
                            className="text-base sm:text-xl text-gray-600 leading-relaxed"
                        >
                            StudyCedo gives you premium notes, quizzes, mocks, and AI support — all personalised to your exam date, weak topics, learning pace, and even how you're feeling that day.
                        </motion.p>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.6 }}
                            className="text-sm sm:text-base text-gray-500"
                        >
                            Start with a free study plan. See your weak areas. Know exactly what to study next.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6, duration: 0.6 }}
                            className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2 sm:pt-4"
                        >
                            <button
                                onClick={() => onNavigate('/onboarding')}
                                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors shadow-lg text-sm sm:text-base"
                                style={{ boxShadow: '0 8px 24px rgba(147,51,234,0.3)' }}
                            >
                                Start Free Study Plan
                            </button>
                            <button
                                onClick={() => onNavigate('/subjects')}
                                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-purple-600 rounded-full font-semibold hover:bg-gray-50 transition-colors border-2 border-purple-200 text-sm sm:text-base"
                            >
                                See How It Works
                            </button>
                        </motion.div>

                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.7, duration: 0.6 }}
                            className="text-xs sm:text-sm text-gray-500 pt-1 sm:pt-2"
                        >
                            No card required to get started.
                        </motion.p>
                    </motion.div>

                    {/* Right — floating UI card (hidden on small screens to avoid clutter) */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                        className="relative hidden lg:block"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl p-6 xl:p-8 space-y-5 xl:space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-lg text-gray-900">Your Study Plan</h3>
                                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-semibold">On Track</span>
                            </div>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                                    <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                                    <span className="text-sm text-gray-900">GCSE Maths: Quadratic Equations</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                                    <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0" />
                                    <span className="text-sm text-gray-900">Biology: Cell Structure Review</span>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl opacity-50">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full flex-shrink-0" />
                                    <span className="text-sm text-gray-900">Chemistry: Atomic Structure</span>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <h4 className="font-semibold text-sm mb-3 text-gray-900">Weak Areas Detected</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Algebra fundamentals</span>
                                        <span className="text-xs text-orange-600 font-medium">Focus needed</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-gray-600">Graph interpretation</span>
                                        <span className="text-xs text-yellow-600 font-medium">Practice more</span>
                                    </div>
                                </div>
                            </div>
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-900">Exam Readiness</span>
                                    <span className="text-sm font-semibold text-purple-600">68%</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full"
                                        style={{ width: '68%' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Floating AI badge — tucked in so it never clips the viewport */}
                        <div className="absolute -bottom-6 -right-4 xl:-right-6 bg-white rounded-2xl shadow-xl p-3 xl:p-4 w-52 xl:w-64">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <Sparkles className="w-4 h-4 text-purple-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-semibold text-gray-900">AI Tutor Available</p>
                                    <p className="text-xs text-gray-500">Ask me anything about quadratic equations...</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Condensed hero card for mobile/tablet */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        className="lg:hidden bg-white rounded-2xl shadow-lg p-5 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-base text-gray-900">Your Study Plan</h3>
                            <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-semibold">On Track</span>
                        </div>
                        <div className="space-y-2">
                            {[
                                { color: 'bg-blue-600', text: 'GCSE Maths: Quadratic Equations', bg: 'bg-blue-50' },
                                { color: 'bg-purple-600', text: 'Biology: Cell Structure Review', bg: 'bg-purple-50' },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-center gap-3 p-3 ${item.bg} rounded-xl`}>
                                    <div className={`w-2 h-2 ${item.color} rounded-full flex-shrink-0`} />
                                    <span className="text-sm text-gray-900">{item.text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-1">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-900">Exam Readiness</span>
                                <span className="text-sm font-semibold text-purple-600">68%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full" style={{ width: '68%' }} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* ── TRUST BAR ── */}
            <section className="bg-white border-y">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-6">
                    {/* 2-col on mobile, 3-col on sm, 5-col on md */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 sm:gap-6 text-center">
                        {[
                            { icon: GraduationCap, label: 'GCSE & A Level support' },
                            { icon: CheckCircle2, label: 'Teacher-reviewed content' },
                            { icon: Target, label: 'Personalised study plans' },
                            { icon: Sparkles, label: 'AI tutor, quizzes & mocks' },
                            { icon: BookOpen, label: 'Free to start' },
                        ].map(({ icon: Icon, label }, i) => (
                            <div key={i} className={`flex flex-col items-center gap-2 ${i === 4 ? 'col-span-2 sm:col-span-1' : ''}`}>
                                <Icon className="w-5 h-5 text-purple-600" />
                                <span className="text-xs sm:text-sm text-gray-600">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PROBLEM / VALUE ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 leading-tight"
                    >
                        Most students don't need more content. They need to know what to study next.
                    </motion.h2>
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="space-y-4 sm:space-y-6 text-base sm:text-lg text-gray-600"
                    >
                        <p>
                            There are already plenty of notes, videos, and revision resources online. The hard part is
                            knowing where to start, what matters most, and how to stay on track.
                        </p>
                        <p className="font-semibold text-gray-900">
                            StudyCedo turns revision into a clear, personalised learning path.
                        </p>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-4 sm:pt-8 text-left"
                    >
                        {[
                            'Find your weak topics quickly',
                            'Get a study plan built around your exam date',
                            'Learn with premium revision content and AI support',
                            'Improve over time with quizzes, mocks, and progress tracking',
                        ].map((item, i) => (
                            <div key={i} className="flex gap-3">
                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700 text-sm sm:text-base">{item}</p>
                            </div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* ── ADAPTIVE USP ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-blue-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center space-y-4 mb-10 sm:mb-16">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900"
                        >
                            Designed to adapt like a real coach, tutor, and study partner
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-base sm:text-xl text-gray-600 max-w-4xl mx-auto"
                        >
                            StudyCedo responds to your weak areas, learning pace, and even how you're feeling that day — so
                            revision feels more realistic, manageable, and effective.
                        </motion.p>
                    </div>

                    {/* 1-col mobile → 2-col sm → 3-col md → 5-col lg */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        {adaptiveCards.map((card, idx) => {
                            const isActive = activeCard === idx;
                            const Icon = card.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.05, duration: 0.6 }}
                                    onClick={() => setActiveCard(isActive ? null : idx)}
                                    onMouseEnter={() => setActiveCard(idx)}
                                    onMouseLeave={() => setActiveCard(null)}
                                    className={`bg-white rounded-2xl p-5 sm:p-6 transition-all duration-300 cursor-pointer ${
                                        isActive ? 'shadow-xl scale-[1.02]' : 'shadow-md hover:shadow-lg'
                                    }`}
                                >
                                    <div className="space-y-3 sm:space-y-4">
                                        <div
                                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
                                                isActive ? 'bg-purple-600' : 'bg-purple-100'
                                            }`}
                                        >
                                            <Icon
                                                className={`w-6 h-6 sm:w-7 sm:h-7 transition-all duration-300 ${
                                                    isActive ? 'text-white' : 'text-purple-600'
                                                }`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <h3 className="font-semibold text-base sm:text-lg text-gray-900">{card.title}</h3>
                                            <p className="text-sm text-gray-600">
                                                {isActive ? card.expandedCopy : card.defaultLine}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>

                    <p className="text-center text-gray-600 text-base sm:text-lg max-w-4xl mx-auto">
                        StudyCedo is built to help you keep moving, even when motivation, confidence, or energy changes from day to day.
                    </p>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-blue-50 to-white">
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl sm:text-4xl font-bold text-center mb-10 sm:mb-16 text-gray-900"
                    >
                        How StudyCedo works
                    </motion.h2>
                    {/* 1-col → 2-col → 4-col */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-8">
                        {[
                            { icon: ClipboardList, title: "Tell us what you're studying", desc: 'Choose your subjects, exam date, and target grade.' },
                            { icon: Target, title: 'Get your personalised study path', desc: 'We identify weak areas and build a plan around what you need to improve.' },
                            { icon: BookOpen, title: 'Study with the right tools', desc: 'Use premium notes, quizzes, mocks, and AI help that fit your learning pace.' },
                            { icon: TrendingUp, title: 'Improve week by week', desc: 'Track progress, revisit weak areas, and keep moving toward exam readiness.' },
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: idx * 0.1, duration: 0.6 }}
                                    className="text-center space-y-3 sm:space-y-4"
                                >
                                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-purple-100 rounded-2xl">
                                        <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-purple-600" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-base sm:text-lg text-gray-900">{item.title}</h3>
                                        <p className="text-gray-600 text-sm">{item.desc}</p>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── TEACHER-REVIEWED SECTION ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-blue-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center space-y-4 mb-10 sm:mb-16">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl sm:text-4xl font-bold text-gray-900"
                        >
                            Built with teacher-reviewed subject expertise
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-base sm:text-xl text-gray-600 max-w-3xl mx-auto"
                        >
                            StudyCedo combines AI personalisation with revision content reviewed by experienced subject specialists — so students get structured support they can trust.
                        </motion.p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                        {experts.map((expert, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.05, duration: 0.6 }}
                                className="bg-white rounded-2xl p-5 sm:p-6 shadow-md hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start gap-3 sm:gap-4">
                                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex-shrink-0 flex items-center justify-center bg-purple-100 text-purple-700 font-bold text-lg sm:text-xl">
                                        {expert.name.charAt(0)}
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{expert.name}</h3>
                                        <p className="text-xs sm:text-sm text-purple-600 font-medium">{expert.role}</p>
                                        <p className="text-xs sm:text-sm text-gray-600">{expert.bio}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <div className="text-center">
                        <p className="text-xs sm:text-sm text-gray-500 mb-6">
                            Every subject is reviewed for clarity, structure, and relevance to real exam preparation.
                        </p>
                    </div>
                </div>
            </section>

            {/* ── PRODUCT WALKTHROUGH TABS ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6">
                <div className="max-w-5xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl sm:text-4xl font-bold text-center mb-10 sm:mb-16 text-gray-900"
                    >
                        Everything you need to revise, in one system
                    </motion.h2>

                    {/* Tab bar — scrollable on mobile */}
                    <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0 mb-6 sm:mb-8">
                        <div className="flex sm:grid sm:grid-cols-5 gap-1 bg-blue-50 p-1 rounded-2xl min-w-max sm:min-w-0">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-2.5 px-3 sm:px-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-white text-purple-600 shadow-md'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="bg-white rounded-2xl p-5 sm:p-8 shadow-lg border border-gray-100">
                        {activeTab === 'plan' && (
                            <div className="space-y-4">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">My Plan</h3>
                                <p className="text-gray-600 text-sm sm:text-base">See exactly what to study today, this week, and before your exam. No guesswork, no overwhelm.</p>
                                <div className="bg-blue-50 rounded-xl p-4 sm:p-6 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-900 text-sm sm:text-base">Today's Focus</span>
                                        <span className="text-xs sm:text-sm text-gray-500">3 topics</span>
                                    </div>
                                    <div className="space-y-2">
                                        {['GCSE Maths: Quadratic Equations', 'Biology: Cell Structure', 'Chemistry: Periodic Table'].map((t, i) => (
                                            <div key={i} className="p-3 bg-white rounded-lg text-xs sm:text-sm text-gray-900">{t}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'weak' && (
                            <div className="space-y-4">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Weak Areas</h3>
                                <p className="text-gray-600 text-sm sm:text-base">Quickly understand what's holding you back and where you should focus first.</p>
                                <div className="space-y-3">
                                    <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="font-medium text-gray-900 text-sm sm:text-base">Algebra fundamentals</span>
                                            <span className="text-xs sm:text-sm text-orange-600 font-semibold flex-shrink-0">Priority</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-2">Last 3 quizzes show gaps in basic operations</p>
                                    </div>
                                    <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                                        <div className="flex justify-between items-center gap-2">
                                            <span className="font-medium text-gray-900 text-sm sm:text-base">Graph interpretation</span>
                                            <span className="text-xs sm:text-sm text-yellow-600 font-semibold flex-shrink-0">Improve</span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-gray-600 mt-2">Practice more reading data from charts</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'tutor' && (
                            <div className="space-y-4">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">AI Tutor</h3>
                                <p className="text-gray-600 text-sm sm:text-base">Get help when you're stuck, directly inside the content you're studying.</p>
                                <div className="bg-purple-50 rounded-xl p-4 sm:p-6">
                                    <div className="flex gap-3">
                                        <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-gray-900">AI Tutor</p>
                                            <p className="text-xs sm:text-sm text-gray-600">I can help explain quadratic equations step by step. What would you like to understand better?</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'quizzes' && (
                            <div className="space-y-4">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Quizzes &amp; Mocks</h3>
                                <p className="text-gray-600 text-sm sm:text-base">Practice properly, spot patterns in your mistakes, and improve with targeted feedback.</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { title: 'Quick Quiz', desc: "10 questions on today's topics", cta: 'Start Quiz →' },
                                        { title: 'Practice Mock', desc: 'Full exam paper simulation', cta: 'Start Mock →' },
                                    ].map((card, i) => (
                                        <div key={i} className="p-4 bg-blue-50 rounded-xl">
                                            <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">{card.title}</h4>
                                            <p className="text-xs sm:text-sm text-gray-600 mb-3">{card.desc}</p>
                                            <span className="text-xs sm:text-sm text-purple-600 font-semibold">{card.cta}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'progress' && (
                            <div className="space-y-4">
                                <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Progress Tracking</h3>
                                <p className="text-gray-600 text-sm sm:text-base">See how your confidence and readiness improve over time.</p>
                                <div className="space-y-5 sm:space-y-6">
                                    {[
                                        { label: 'GCSE Maths', pct: 72 },
                                        { label: 'Biology', pct: 65 },
                                        { label: 'Chemistry', pct: 48 },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-900">{item.label}</span>
                                                <span className="text-sm font-semibold text-purple-600">{item.pct}%</span>
                                            </div>
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-600 rounded-full"
                                                    style={{ width: `${item.pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── UPLOAD YOUR OWN CONTENT ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-blue-50 to-white">
                <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl sm:text-4xl font-bold text-gray-900"
                    >
                        Your notes, turned into a personalised study path
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-base sm:text-xl text-gray-600"
                    >
                        Upload class notes, slides, PDFs, textbook pages, or school materials. StudyCedo can turn them into
                        structured notes, flashcards, quizzes, and learning paths built around your goals.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-4 text-left"
                    >
                        {[
                            { icon: Upload, label: 'Organise messy study materials' },
                            { icon: FileText, label: 'Turn notes into revision tools' },
                            { icon: Brain, label: 'Build a plan around your own content' },
                            { icon: CheckCircle2, label: 'Keep everything in one place' },
                        ].map(({ icon: Icon, label }, i) => (
                            <div key={i} className="flex gap-3">
                                <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0 mt-0.5" />
                                <p className="text-gray-700 text-sm sm:text-base">{label}</p>
                            </div>
                        ))}
                    </motion.div>
                    <button
                        onClick={() => onNavigate('/onboarding')}
                        className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors text-sm sm:text-base"
                        style={{ boxShadow: '0 8px 24px rgba(147,51,234,0.3)' }}
                    >
                        Start Free and Try It
                    </button>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-white to-blue-50">
                <div className="max-w-6xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl sm:text-4xl font-bold text-center mb-10 sm:mb-16 text-gray-900"
                    >
                        What students say
                    </motion.h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
                        {[
                            { quote: "It finally told me what to revise instead of giving me more random stuff.", author: 'Year 11 student' },
                            { quote: 'The weak-area feature made it obvious where I was losing marks.', author: 'GCSE Maths student' },
                            { quote: 'It gave my daughter structure, which was the biggest thing missing.', author: 'Parent of Year 11 student' },
                        ].map((t, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.6 }}
                                className="bg-white rounded-2xl p-6 sm:p-8 shadow-md space-y-4"
                            >
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                    ))}
                                </div>
                                <p className="text-gray-900 text-base sm:text-lg italic">"{t.quote}"</p>
                                <p className="text-xs sm:text-sm text-gray-500">{t.author}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center space-y-4 mb-10 sm:mb-16">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl sm:text-4xl font-bold text-gray-900"
                        >
                            Start free. Upgrade when you're ready.
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-base sm:text-xl text-gray-600"
                        >
                            Try StudyCedo for free, then unlock full access when you want the complete learning system.
                        </motion.p>
                    </div>

                    {/* Stack on mobile, 3-col on md */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 mb-6 sm:mb-8">
                        {/* Free */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="bg-white rounded-2xl p-6 sm:p-8 shadow-md space-y-5 sm:space-y-6"
                        >
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Free</h3>
                            </div>
                            <ul className="space-y-3 text-gray-600 text-sm sm:text-base">
                                {[
                                    'Personalised study plan',
                                    'Weak-area insight',
                                    'Limited tutor usage',
                                    'Limited quizzes and revision access',
                                    'Explore how StudyCedo works',
                                ].map((f, i) => (
                                    <li key={i} className="flex gap-2">
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => onNavigate('/onboarding')}
                                className="w-full py-3 bg-gray-100 text-gray-900 rounded-full font-semibold hover:bg-gray-200 transition-colors text-sm sm:text-base"
                            >
                                Start Free
                            </button>
                        </motion.div>

                        {/* Pro Monthly */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="bg-white rounded-2xl p-6 sm:p-8 shadow-md space-y-5 sm:space-y-6"
                        >
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Pro Monthly</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-bold text-gray-900">£16.99</span>
                                    <span className="text-gray-500 text-sm sm:text-base">/month</span>
                                </div>
                            </div>
                            <ul className="space-y-3 text-gray-600 text-sm sm:text-base">
                                {[
                                    'Full access across supported subjects',
                                    'Unlimited study plans',
                                    'AI tutor',
                                    'Quizzes and mocks',
                                    'Progress tracking',
                                    'Personalised revision support',
                                ].map((f, i) => (
                                    <li key={i} className="flex gap-2">
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => onNavigate('/onboarding')}
                                className="w-full py-3 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors text-sm sm:text-base"
                                style={{ boxShadow: '0 6px 20px rgba(147,51,234,0.3)' }}
                            >
                                Go Pro Monthly
                            </button>
                        </motion.div>

                        {/* Pro Annual */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden space-y-5 sm:space-y-6"
                        >
                            <div className="absolute top-4 right-4 bg-yellow-400 text-gray-900 px-2.5 py-1 rounded-full text-xs font-semibold">
                                Best Value
                            </div>
                            <div>
                                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Pro Annual</h3>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl sm:text-4xl font-bold text-white">£89</span>
                                    <span className="text-purple-100 text-sm sm:text-base">/year</span>
                                </div>
                            </div>
                            <ul className="space-y-3 text-white text-sm sm:text-base">
                                {[
                                    'Everything in Pro Monthly',
                                    'Full year of revision support',
                                    'Best for students starting early',
                                    'Lower monthly cost overall',
                                ].map((f, i) => (
                                    <li key={i} className="flex gap-2">
                                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => onNavigate('/onboarding')}
                                className="w-full py-3 bg-white text-purple-600 rounded-full font-semibold hover:bg-gray-50 transition-colors shadow-lg text-sm sm:text-base"
                            >
                                Go Pro Annual
                            </button>
                        </motion.div>
                    </div>

                    <p className="text-center text-gray-500 text-xs sm:text-sm">
                        Cancel monthly anytime. Annual gives the best value for students building long-term revision habits.
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-3 text-gray-500 text-xs sm:text-sm">
                        <Shield className="w-4 h-4" />
                        <span>Secure checkout</span>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-blue-50 to-white">
                <div className="max-w-3xl mx-auto">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl sm:text-4xl font-bold text-center mb-10 sm:mb-16 text-gray-900"
                    >
                        Frequently asked questions
                    </motion.h2>
                    <div className="space-y-3 sm:space-y-4">
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                className={`bg-white rounded-xl shadow-sm overflow-hidden transition-shadow ${
                                    openFaq === i ? 'shadow-md' : ''
                                }`}
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    className="w-full px-4 sm:px-6 py-4 sm:py-5 flex justify-between items-center text-left hover:bg-gray-50 transition-colors gap-3"
                                >
                                    <span className="font-semibold text-gray-900 text-sm sm:text-base">{faq.q}</span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-purple-600 flex-shrink-0 transition-transform duration-200 ${
                                            openFaq === i ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>
                                {openFaq === i && (
                                    <div className="px-4 sm:px-6 pb-4 sm:pb-5 text-gray-600 text-xs sm:text-sm leading-relaxed">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ── */}
            <section className="py-16 sm:py-24 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto text-center space-y-6 sm:space-y-8">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-4xl sm:text-5xl font-bold text-gray-900"
                    >
                        Know what to study next
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 }}
                        className="text-base sm:text-xl text-gray-600"
                    >
                        Start free and see how StudyCedo turns revision into a clear, personalised learning path.
                    </motion.p>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 }}
                        className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4"
                    >
                        <button
                            onClick={() => onNavigate('/onboarding')}
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-purple-600 text-white rounded-full font-semibold hover:bg-purple-700 transition-colors text-sm sm:text-base"
                            style={{ boxShadow: '0 8px 24px rgba(147,51,234,0.3)' }}
                        >
                            Start Free Study Plan
                        </button>
                        <button
                            onClick={() => onNavigate('/pricing')}
                            className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-purple-600 rounded-full font-semibold hover:bg-gray-50 transition-colors border-2 border-purple-200 text-sm sm:text-base"
                        >
                            See Pricing
                        </button>
                    </motion.div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="bg-gray-900 text-gray-300 py-12 sm:py-16 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-12 mb-10 sm:mb-12">
                        {/* Brand block — full width on mobile */}
                        <div className="col-span-2 lg:col-span-2 space-y-4">
                            <div className="flex items-center gap-3">
                                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400 flex-shrink-0" />
                                <h3 className="text-xl sm:text-2xl font-bold text-white">StudyCedo</h3>
                            </div>
                            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                                StudyCedo helps GCSE and A Level students revise with premium content, personalised study paths, and AI support built around how they learn.
                            </p>
                            <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4">
                                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                    <a
                                        key={i}
                                        href="#"
                                        className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors"
                                    >
                                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Product */}
                        <div className="col-span-1">
                            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Product</h4>
                            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                                {['Features', 'How it works', 'AI Tutor', 'Study Plans'].map((l, i) => (
                                    <li key={i}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Subjects */}
                        <div className="col-span-1">
                            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Subjects</h4>
                            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                                {['GCSE Maths', 'GCSE Science', 'A Level Maths', 'View all subjects'].map((l, i) => (
                                    <li key={i}><a href="#" className="hover:text-white transition-colors">{l}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Support — full width on mobile so it's not squashed */}
                        <div className="col-span-2 sm:col-span-1 lg:col-span-1">
                            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Support</h4>
                            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                                {[
                                    { label: 'Pricing', href: '/pricing' },
                                    { label: 'Help Centre', href: '#' },
                                    { label: 'Contact', href: '#' },
                                    { label: 'Privacy Policy', href: '/privacy' },
                                    { label: 'Terms of Service', href: '/terms' },
                                ].map((l, i) => (
                                    <li key={i}><a href={l.href} className="hover:text-white transition-colors">{l.label}</a></li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-gray-400">
                        <p>Not affiliated with any exam board. All exam board names are trademarks of their respective owners.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default HomePage;