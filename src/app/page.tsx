'use client'

import { useState } from 'react';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
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
} from 'lucide-react';
import { SubjectCard } from "@/app/components/SubjectCard";
import { useRouter } from "next/navigation";

function HomePage() {
    const router = useRouter();
    const [activeCard, setActiveCard] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('plan');
    const [openFaq, setOpenFaq] = useState<number | null>(null);

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

    const adaptiveCards = [
        {
            icon: Smile,
            title: "Adapts to your mood",
            defaultLine: "Plans around your energy and focus.",
            expandedCopy: "Good day? Do more. Stressful day? We'll consolidate your learning instead."
        },
        {
            icon: Calendar,
            title: "Plans like a coach",
            defaultLine: "Builds your best next step.",
            expandedCopy: "Creates personalised schedules that prioritise your weak areas and make the best use of your study time."
        },
        {
            icon: GraduationCap,
            title: "Teaches like a tutor",
            defaultLine: "Explains until it clicks.",
            expandedCopy: "Explains concepts in different ways until you understand, adapting to how you learn best."
        },
        {
            icon: Target,
            title: "Tests like an exam board",
            defaultLine: "Prepares you for the real thing.",
            expandedCopy: "Combines real past-paper practice with AI-predicted questions based on curriculum patterns."
        },
        {
            icon: Gamepad2,
            title: "Engages like a game",
            defaultLine: "Keeps revision motivating.",
            expandedCopy: "Rewards your progress and streaks so revision feels easier to stick to."
        }
    ];

    const tabs = [
        { id: 'plan', label: 'My Plan' },
        { id: 'weak', label: 'Weak Areas' },
        { id: 'tutor', label: 'AI Tutor' },
        { id: 'quizzes', label: 'Quizzes & Mocks' },
        { id: 'progress', label: 'Progress' },
    ];

    const faqs = [
        {
            q: "What makes GCSE AI Revision different?",
            a: "We combine premium revision content with a personalised study path, weak-area focus, quizzes, past papers, and AI support all in one system tailored to your exam board."
        },
        {
            q: "Which exam boards do you support?",
            a: "We support AQA, Edexcel, OCR, and WJEC across all major GCSE subjects."
        },
        {
            q: "Can I try it for free?",
            a: "Yes. Start with a free AI revision plan and explore the platform before purchasing a subject pack."
        },
        {
            q: "How is it personalised?",
            a: "Your plan is built around your subjects, exam date, weak areas, and learning activity over time — and even adapts to how you're feeling each day."
        },
        {
            q: "Is the content reliable?",
            a: "All content is reviewed for clarity, structure, and relevance to real exam preparation, and aligned to official GCSE specifications."
        },
        {
            q: "Do I need a subscription?",
            a: "No. Subject packs are a one-time purchase with lifetime access. Your free plan is always free."
        },
    ];

    const onNavigate = (url: string) => {
        router.push(url);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>

            {/* ── HERO ── */}
            <section style={{
                position: 'relative',
                minHeight: '90vh',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 50%, #EFF6FF 100%)',
            }}>
                <div style={{
                    maxWidth: 1280,
                    margin: '0 auto',
                    padding: '80px 24px',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 64,
                    alignItems: 'center',
                    width: '100%',
                }}>
                    {/* Left */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            background: 'rgba(14,165,233,0.1)',
                            color: '#0EA5E9',
                            padding: '6px 16px',
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 600,
                            width: 'fit-content',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            <Star style={{ width: 14, height: 14 }} />
                            GCSE revision, personalised by AI
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
                            fontWeight: 800,
                            color: '#0F172A',
                            lineHeight: 1.1,
                            margin: 0,
                        }}>
                            Revision content that{' '}
                            <span style={{
                                background: 'linear-gradient(90deg, #0EA5E9, #22C55E)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                adapts to you
                            </span>
                        </h1>

                        <p style={{ fontSize: 20, color: '#475569', lineHeight: 1.7, margin: 0 }}>
                            Get a personalised revision plan in 2 minutes. Free AI planner + premium subject packs with past papers and predicted 2026 questions — personalised to your exam board, weak topics, and learning pace.
                        </p>

                        <p style={{ fontSize: 15, color: '#94A3B8', margin: 0 }}>
                            Start with a free study plan. See your weak areas. Know exactly what to study next.
                        </p>

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <Button
                                size="lg"
                                onClick={() => onNavigate('/onboarding')}
                                style={{
                                    background: '#0EA5E9',
                                    color: '#fff',
                                    borderRadius: 999,
                                    padding: '14px 32px',
                                    fontSize: 16,
                                    fontWeight: 600,
                                    border: 'none',
                                    cursor: 'pointer',
                                    boxShadow: '0 8px 24px rgba(14,165,233,0.35)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    height: 'auto',
                                }}
                            >
                                Start Free Revision Plan
                                <ArrowRight style={{ width: 18, height: 18 }} />
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => onNavigate('/subjects')}
                                style={{
                                    borderRadius: 999,
                                    padding: '14px 24px',
                                    fontSize: 16,
                                    color: '#0EA5E9',
                                    border: '2px solid rgba(14,165,233,0.3)',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    height: 'auto',
                                }}
                            >
                                See How It Works
                            </Button>
                        </div>

                        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
                            No card required to get started.
                        </p>
                    </div>

                    {/* Right — floating UI card */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            background: '#fff',
                            borderRadius: 24,
                            boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
                            padding: 32,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 24,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ fontWeight: 700, fontSize: 18, margin: 0, color: '#0F172A' }}>Your Study Plan</h3>
                                <span style={{
                                    background: '#F0FDF4',
                                    color: '#22C55E',
                                    borderRadius: 999,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    padding: '4px 12px',
                                }}>On Track</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {[
                                    { color: '#0EA5E9', label: 'GCSE Maths: Quadratic Equations' },
                                    { color: '#22C55E', label: 'Biology: Cell Structure Review' },
                                    { color: '#CBD5E1', label: 'Chemistry: Atomic Structure', dim: true },
                                ].map((item, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '12px 16px',
                                        background: item.dim ? '#F8FAFC' : `${item.color}10`,
                                        borderRadius: 12,
                                        opacity: item.dim ? 0.5 : 1,
                                    }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: 14, color: '#0F172A' }}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 16 }}>
                                <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 12 }}>Weak Areas Detected</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 13, color: '#475569' }}>Algebra fundamentals</span>
                                        <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Focus needed</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 13, color: '#475569' }}>Graph interpretation</span>
                                        <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>Practice more</span>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>Exam Readiness</span>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0EA5E9' }}>68%</span>
                                </div>
                                <div style={{ height: 8, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: '68%', background: 'linear-gradient(90deg, #0EA5E9, #22C55E)', borderRadius: 999 }} />
                                </div>
                            </div>
                        </div>

                        {/* Floating AI badge */}
                        <div style={{
                            position: 'absolute',
                            bottom: -24,
                            right: -24,
                            background: '#fff',
                            borderRadius: 16,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                            padding: '14px 16px',
                            width: 240,
                            display: 'flex',
                            gap: 12,
                            alignItems: 'flex-start',
                        }}>
                            <div style={{
                                width: 36,
                                height: 36,
                                background: 'rgba(14,165,233,0.1)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <Sparkles style={{ width: 16, height: 16, color: '#0EA5E9' }} />
                            </div>
                            <div>
                                <p style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>AI Tutor Available</p>
                                <p style={{ fontSize: 11, color: '#475569', margin: 0 }}>Ask me anything about quadratic equations...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TRUST BAR ── */}
            <section style={{ background: '#fff', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 24px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 24, textAlign: 'center' }}>
                        {[
                            { icon: GraduationCap, label: 'GCSE focused' },
                            { icon: CheckCircle2, label: 'Exam board aligned' },
                            { icon: Target, label: 'Personalised plans' },
                            { icon: Sparkles, label: 'AI tutor, quizzes & mocks' },
                            { icon: BookOpen, label: 'Free to start' },
                        ].map(({ icon: Icon, label }, i) => (
                            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                                <Icon style={{ width: 20, height: 20, color: '#0EA5E9' }} />
                                <span style={{ fontSize: 13, color: '#475569' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PROBLEM / VALUE ── */}
            <section style={{ padding: '96px 24px' }}>
                <div style={{ maxWidth: 896, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, marginBottom: 32 }}>
                        Most students don't need more content. They need to know what to study next.
                    </h2>
                    <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.7, marginBottom: 16 }}>
                        There are already plenty of notes, videos, and revision resources online. The hard part is knowing where to start, what matters most, and how to stay on track.
                    </p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 40 }}>
                        GCSE AI Revision turns revision into a clear, personalised learning path.
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, textAlign: 'left' }}>
                        {[
                            'Find your weak topics quickly',
                            'Get a study plan built around your exam date',
                            'Learn with premium revision content and AI support',
                            'Improve over time with quizzes, mocks, and progress tracking',
                        ].map((item, i) => (
                            <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                <CheckCircle2 style={{ width: 22, height: 22, color: '#22C55E', flexShrink: 0, marginTop: 2 }} />
                                <span style={{ fontSize: 16, color: '#475569' }}>{item}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── ADAPTIVE USP ── */}
            <section style={{ padding: '96px 24px', background: 'linear-gradient(180deg, #fff 0%, #EFF6FF 100%)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 64 }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>
                            Designed to adapt like a real coach, tutor, and study partner
                        </h2>
                        <p style={{ fontSize: 18, color: '#475569', maxWidth: 768, margin: '0 auto' }}>
                            The platform responds to your weak areas, learning pace, and even how you're feeling that day — so revision feels more realistic, manageable, and effective.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20, marginBottom: 32 }}>
                        {adaptiveCards.map((card, idx) => {
                            const isActive = activeCard === idx;
                            const Icon = card.icon;
                            return (
                                <div
                                    key={idx}
                                    onMouseEnter={() => setActiveCard(idx)}
                                    onMouseLeave={() => setActiveCard(null)}
                                    style={{
                                        background: '#fff',
                                        borderRadius: 20,
                                        padding: 24,
                                        cursor: 'pointer',
                                        boxShadow: isActive
                                            ? '0 16px 48px rgba(14,165,233,0.18)'
                                            : '0 2px 12px rgba(0,0,0,0.06)',
                                        transform: isActive ? 'translateY(-4px) scale(1.02)' : 'none',
                                        transition: 'all 0.3s ease',
                                        border: isActive ? '1.5px solid rgba(14,165,233,0.3)' : '1.5px solid #E2E8F0',
                                    }}
                                >
                                    <div style={{
                                        width: 52,
                                        height: 52,
                                        borderRadius: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: 16,
                                        background: isActive ? 'linear-gradient(135deg, #0EA5E9, #22C55E)' : 'rgba(14,165,233,0.1)',
                                        transition: 'all 0.3s ease',
                                    }}>
                                        <Icon style={{ width: 24, height: 24, color: isActive ? '#fff' : '#0EA5E9' }} />
                                    </div>
                                    <h3 style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 8 }}>{card.title}</h3>
                                    <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, margin: 0 }}>
                                        {isActive ? card.expandedCopy : card.defaultLine}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <p style={{ textAlign: 'center', color: '#475569', fontSize: 16, maxWidth: 768, margin: '0 auto' }}>
                        Built to help you keep moving, even when motivation, confidence, or energy changes from day to day.
                    </p>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section style={{ padding: '96px 24px', background: 'linear-gradient(180deg, #EFF6FF 0%, #fff 100%)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 64 }}>
                        How it works
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40 }}>
                        {[
                            { step: '1', icon: ClipboardList, title: "Tell us what you're studying", desc: "Choose your subjects, exam board, and target grade." },
                            { step: '2', icon: Target, title: "Get your personalised study path", desc: "We identify weak areas and build a plan around what you need to improve." },
                            { step: '3', icon: BookOpen, title: "Study with the right tools", desc: "Use past papers, quizzes, notes, and AI help that fit your learning pace." },
                            { step: '4', icon: TrendingUp, title: "Improve week by week", desc: "Track progress, revisit weak areas, and keep moving toward exam readiness." },
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div key={idx} style={{ textAlign: 'center' }}>
                                    <div style={{
                                        width: 72,
                                        height: 72,
                                        background: 'rgba(14,165,233,0.1)',
                                        borderRadius: 20,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 20px',
                                    }}>
                                        <Icon style={{ width: 32, height: 32, color: '#0EA5E9' }} />
                                    </div>
                                    <h3 style={{ fontWeight: 700, fontSize: 17, color: '#0F172A', marginBottom: 10 }}>{item.title}</h3>
                                    <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.65 }}>{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ── PRODUCT WALKTHROUGH TABS ── */}
            <section style={{ padding: '96px 24px' }}>
                <div style={{ maxWidth: 1024, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 64 }}>
                        Everything you need to revise, in one system
                    </h2>

                    {/* Tab bar */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        background: '#EFF6FF',
                        borderRadius: 16,
                        padding: 6,
                        marginBottom: 24,
                        gap: 4,
                    }}>
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '10px 8px',
                                    borderRadius: 12,
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: 600,
                                    fontSize: 13,
                                    transition: 'all 0.2s',
                                    background: activeTab === tab.id ? '#fff' : 'transparent',
                                    color: activeTab === tab.id ? '#0EA5E9' : '#475569',
                                    boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div style={{ background: '#fff', borderRadius: 20, padding: 40, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #E2E8F0' }}>
                        {activeTab === 'plan' && (
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>My Plan</h3>
                                <p style={{ color: '#475569', marginBottom: 24 }}>See exactly what to study today, this week, and before your exam. No guesswork, no overwhelm.</p>
                                <div style={{ background: '#EFF6FF', borderRadius: 16, padding: 24 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <span style={{ fontWeight: 600, color: '#0F172A' }}>Today's Focus</span>
                                        <span style={{ fontSize: 13, color: '#475569' }}>3 topics</span>
                                    </div>
                                    {['GCSE Maths: Quadratic Equations', 'Biology: Cell Structure', 'Chemistry: Periodic Table'].map((t, i) => (
                                        <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 8, fontSize: 14, color: '#0F172A' }}>{t}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'weak' && (
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>Weak Areas</h3>
                                <p style={{ color: '#475569', marginBottom: 24 }}>Quickly understand what's holding you back and where you should focus first.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    <div style={{ padding: 20, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 600, color: '#0F172A' }}>Algebra fundamentals</span>
                                            <span style={{ fontSize: 13, color: '#F59E0B', fontWeight: 700 }}>Priority</span>
                                        </div>
                                        <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 0' }}>Last 3 quizzes show gaps in basic operations</p>
                                    </div>
                                    <div style={{ padding: 20, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 14 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 600, color: '#0F172A' }}>Graph interpretation</span>
                                            <span style={{ fontSize: 13, color: '#EA580C', fontWeight: 700 }}>Improve</span>
                                        </div>
                                        <p style={{ fontSize: 13, color: '#475569', margin: '6px 0 0' }}>Practice more reading data from charts</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'tutor' && (
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>AI Tutor</h3>
                                <p style={{ color: '#475569', marginBottom: 24 }}>Get help when you're stuck, directly inside the content you're studying.</p>
                                <div style={{ background: '#EFF6FF', borderRadius: 16, padding: 24, display: 'flex', gap: 16 }}>
                                    <div style={{ width: 36, height: 36, background: '#0EA5E9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Sparkles style={{ width: 16, height: 16, color: '#fff' }} />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', margin: '0 0 6px' }}>AI Tutor</p>
                                        <p style={{ fontSize: 14, color: '#475569', margin: 0 }}>I can help explain quadratic equations step by step. What would you like to understand better?</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'quizzes' && (
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>Quizzes & Mocks</h3>
                                <p style={{ color: '#475569', marginBottom: 24 }}>Practice properly, spot patterns in your mistakes, and improve with targeted feedback.</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    {[
                                        { title: 'Quick Quiz', desc: '10 questions on today\'s topics', cta: 'Start Quiz →' },
                                        { title: 'Practice Mock', desc: 'Full exam paper simulation', cta: 'Start Mock →' },
                                    ].map((card, i) => (
                                        <div key={i} style={{ padding: 20, background: '#EFF6FF', borderRadius: 14 }}>
                                            <h4 style={{ fontWeight: 600, color: '#0F172A', margin: '0 0 6px' }}>{card.title}</h4>
                                            <p style={{ fontSize: 13, color: '#475569', margin: '0 0 12px' }}>{card.desc}</p>
                                            <span style={{ fontSize: 13, color: '#0EA5E9', fontWeight: 600 }}>{card.cta}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {activeTab === 'progress' && (
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 20, color: '#0F172A', marginBottom: 8 }}>Progress Tracking</h3>
                                <p style={{ color: '#475569', marginBottom: 24 }}>See how your confidence and readiness improve over time.</p>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {[
                                        { label: 'GCSE Maths', pct: 72 },
                                        { label: 'Biology', pct: 65 },
                                        { label: 'Chemistry', pct: 48 },
                                    ].map((item, i) => (
                                        <div key={i}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{item.label}</span>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: '#0EA5E9' }}>{item.pct}%</span>
                                            </div>
                                            <div style={{ height: 10, background: '#E2E8F0', borderRadius: 999, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${item.pct}%`, background: 'linear-gradient(90deg, #0EA5E9, #22C55E)', borderRadius: 999 }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ── SUBJECTS PREVIEW ── */}
            <section style={{ padding: '96px 24px', background: '#F8FAFC' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 64 }}>
                        <Badge variant="secondary" style={{ background: 'rgba(34,197,94,0.1)', color: '#22C55E', marginBottom: 16 }}>
                            Subject packs
                        </Badge>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>
                            Master every GCSE subject
                        </h2>
                        <p style={{ fontSize: 18, color: '#475569', maxWidth: 768, margin: '0 auto' }}>
                            From Maths to Modern Languages, get comprehensive revision materials for all major GCSE subjects.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
                        {subjects.slice(0, 6).map((subject) => (
                            <SubjectCard
                                key={subject.subject}
                                subject={subject.subject}
                                description={subject.description}
                                examBoard="AQA"
                                onPreview={() => {}}
                                onViewPack={() => onNavigate('/subjects')}
                            />
                        ))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <Button
                            size="lg"
                            onClick={() => onNavigate('/subjects')}
                            style={{
                                background: 'linear-gradient(90deg, #22C55E, #0EA5E9)',
                                color: '#fff',
                                borderRadius: 999,
                                padding: '14px 32px',
                                fontSize: 16,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(14,165,233,0.25)',
                                height: 'auto',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            Explore All {subjects.length} Subjects
                            <ArrowRight style={{ width: 18, height: 18 }} />
                        </Button>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <section style={{ padding: '96px 24px', background: 'linear-gradient(180deg, #fff 0%, #EFF6FF 100%)' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 64 }}>
                        What students say
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                        {[
                            { quote: "It finally told me what to revise instead of giving me more random stuff.", author: "Year 11 student" },
                            { quote: "The weak-area feature made it obvious where I was losing marks.", author: "GCSE Maths student" },
                            { quote: "It gave my daughter structure, which was the biggest thing missing.", author: "Parent of Year 11 student" },
                        ].map((t, i) => (
                            <div key={i} style={{
                                background: '#fff',
                                borderRadius: 20,
                                padding: 32,
                                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                                border: '1px solid #E2E8F0',
                            }}>
                                <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} style={{ width: 16, height: 16, fill: '#F59E0B', color: '#F59E0B' }} />
                                    ))}
                                </div>
                                <p style={{ fontSize: 17, color: '#0F172A', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 16 }}>"{t.quote}"</p>
                                <p style={{ fontSize: 13, color: '#475569' }}>{t.author}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PRICING ── */}
            <section style={{ padding: '96px 24px' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: 64 }}>
                        <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>
                            Start free. Upgrade when you're ready.
                        </h2>
                        <p style={{ fontSize: 18, color: '#475569' }}>
                            Try the free planner, then unlock full access when you want the complete learning system.
                        </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 32 }}>
                        {/* Free */}
                        <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.07)', border: '1.5px solid #E2E8F0' }}>
                            <h3 style={{ fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 8 }}>Free Planner</h3>
                            <div style={{ marginBottom: 24 }}>
                                <span style={{ fontSize: 48, fontWeight: 800, color: '#0F172A' }}>£0</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                                {['AI-powered revision schedule', 'Personalised study plan', 'Progress tracking', 'Limited quiz access', 'Explore how it works'].map((f, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <CheckCircle2 style={{ width: 18, height: 18, color: '#22C55E', flexShrink: 0, marginTop: 2 }} />
                                        <span style={{ fontSize: 15, color: '#475569' }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => onNavigate('/onboarding')}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: 999, border: '1.5px solid #E2E8F0',
                                    background: '#F8FAFC', color: '#0F172A', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                                }}
                            >
                                Start Free
                            </button>
                        </div>

                        {/* Monthly */}
                        <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 4px 20px rgba(0,0,0,0.07)', border: '1.5px solid #E2E8F0' }}>
                            <h3 style={{ fontWeight: 800, fontSize: 22, color: '#0F172A', marginBottom: 8 }}>Subject Pack</h3>
                            <div style={{ marginBottom: 24 }}>
                                <span style={{ fontSize: 48, fontWeight: 800, color: '#0EA5E9' }}>£30</span>
                                <span style={{ fontSize: 15, color: '#475569' }}> /subject</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                                {['10+ years of past papers', 'AI-predicted 2026 questions', 'Interactive quizzes & videos', 'AI tutor assistance', 'Pay once, keep forever'].map((f, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <CheckCircle2 style={{ width: 18, height: 18, color: '#0EA5E9', flexShrink: 0, marginTop: 2 }} />
                                        <span style={{ fontSize: 15, color: '#475569' }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => onNavigate('/subjects')}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: 999, border: 'none',
                                    background: '#0EA5E9', color: '#fff', fontWeight: 600, fontSize: 15, cursor: 'pointer',
                                    boxShadow: '0 6px 20px rgba(14,165,233,0.35)',
                                }}
                            >
                                Choose Subject
                            </button>
                        </div>

                        {/* Annual / All Access */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0EA5E9, #22C55E)',
                            borderRadius: 24,
                            padding: 32,
                            boxShadow: '0 16px 48px rgba(14,165,233,0.3)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: 16, right: 16,
                                background: '#F59E0B', color: '#0F172A',
                                borderRadius: 999, fontSize: 11, fontWeight: 700,
                                padding: '4px 10px',
                            }}>
                                Best Value
                            </div>
                            <h3 style={{ fontWeight: 800, fontSize: 22, color: '#fff', marginBottom: 8 }}>Full Access</h3>
                            <div style={{ marginBottom: 24 }}>
                                <span style={{ fontSize: 48, fontWeight: 800, color: '#fff' }}>£79</span>
                                <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.8)' }}> all subjects</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                                {['Access to all 12+ subjects', 'Unlimited AI tutor usage', '10+ years past papers', 'AI-predicted questions', 'Lifetime updates'].map((f, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                                        <CheckCircle2 style={{ width: 18, height: 18, color: '#fff', flexShrink: 0, marginTop: 2 }} />
                                        <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => onNavigate('/pricing')}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: 999, border: 'none',
                                    background: '#fff', color: '#0EA5E9', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                                }}
                            >
                                Get Full Access
                            </button>
                        </div>
                    </div>

                    <p style={{ textAlign: 'center', color: '#475569', fontSize: 14 }}>
                        30-day money-back guarantee &nbsp;•&nbsp; Secure payment &nbsp;•&nbsp; Instant access
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, color: '#475569', fontSize: 13 }}>
                        <Shield style={{ width: 14, height: 14 }} />
                        <span>Secure checkout</span>
                    </div>
                </div>
            </section>

            {/* ── FAQ ── */}
            <section style={{ padding: '96px 24px', background: 'linear-gradient(180deg, #EFF6FF 0%, #fff 100%)' }}>
                <div style={{ maxWidth: 768, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 800, color: '#0F172A', textAlign: 'center', marginBottom: 64 }}>
                        Frequently asked questions
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {faqs.map((faq, i) => (
                            <div
                                key={i}
                                style={{
                                    background: '#fff',
                                    borderRadius: 16,
                                    border: '1.5px solid #E2E8F0',
                                    overflow: 'hidden',
                                    boxShadow: openFaq === i ? '0 4px 16px rgba(14,165,233,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
                                }}
                            >
                                <button
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                    style={{
                                        width: '100%', padding: '20px 24px', background: 'none', border: 'none',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        cursor: 'pointer', textAlign: 'left',
                                    }}
                                >
                                    <span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>{faq.q}</span>
                                    <ChevronDown style={{
                                        width: 20, height: 20, color: '#0EA5E9', flexShrink: 0,
                                        transform: openFaq === i ? 'rotate(180deg)' : 'none',
                                        transition: 'transform 0.2s',
                                    }} />
                                </button>
                                {openFaq === i && (
                                    <div style={{ padding: '0 24px 20px', color: '#475569', fontSize: 15, lineHeight: 1.7 }}>
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ── */}
            <section style={{ padding: '96px 24px', textAlign: 'center' }}>
                <div style={{ maxWidth: 768, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, color: '#0F172A', marginBottom: 20 }}>
                        Know what to study next
                    </h2>
                    <p style={{ fontSize: 18, color: '#475569', marginBottom: 40 }}>
                        Start free and see how GCSE AI Revision turns revision into a clear, personalised learning path.
                    </p>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => onNavigate('/onboarding')}
                            style={{
                                padding: '16px 36px', background: '#0EA5E9', color: '#fff',
                                borderRadius: 999, border: 'none', fontWeight: 700, fontSize: 16,
                                cursor: 'pointer', boxShadow: '0 8px 24px rgba(14,165,233,0.35)',
                            }}
                        >
                            Start Free Revision Plan
                        </button>
                        <button
                            onClick={() => onNavigate('/pricing')}
                            style={{
                                padding: '16px 36px', background: '#fff', color: '#0EA5E9',
                                borderRadius: 999, border: '2px solid rgba(14,165,233,0.3)',
                                fontWeight: 700, fontSize: 16, cursor: 'pointer',
                            }}
                        >
                            See Pricing
                        </button>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer style={{ background: '#0F172A', color: '#94A3B8', padding: '64px 24px' }}>
                <div style={{ maxWidth: 1280, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <BookOpen style={{ width: 28, height: 28, color: '#0EA5E9' }} />
                                <span style={{ fontWeight: 800, fontSize: 20, color: '#fff' }}>GCSE AI Revision</span>
                            </div>
                            <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                                Helping GCSE students revise with personalised study paths, past papers, and AI support built around how they learn.
                            </p>
                            <div style={{ display: 'flex', gap: 12 }}>
                                {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                    <a key={i} href="#" style={{
                                        width: 40, height: 40, background: '#1E293B', borderRadius: '50%',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: '#94A3B8',
                                    }}>
                                        <Icon style={{ width: 18, height: 18 }} />
                                    </a>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 700, color: '#fff', marginBottom: 20, fontSize: 15 }}>Product</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {['Free Planner', 'Subjects', 'Pricing', 'AI Tutor'].map((l, i) => (
                                    <a key={i} href="#" style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'none' }}>{l}</a>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 700, color: '#fff', marginBottom: 20, fontSize: 15 }}>Subjects</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {['GCSE Maths', 'GCSE Science', 'English Literature', 'View all'].map((l, i) => (
                                    <a key={i} href="#" style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'none' }}>{l}</a>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 style={{ fontWeight: 700, color: '#fff', marginBottom: 20, fontSize: 15 }}>Support</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {[
                                    { label: 'Help Centre', href: '#' },
                                    { label: 'Contact Us', href: '#' },
                                    { label: 'Privacy Policy', href: '/privacy' },
                                    { label: 'Terms of Service', href: '/terms' },
                                    { label: 'Exam Board Notice', href: '/notice' },
                                ].map((l, i) => (
                                    <a key={i} href={l.href} style={{ fontSize: 14, color: '#94A3B8', textDecoration: 'none' }}>{l.label}</a>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, textAlign: 'center', fontSize: 13 }}>
                        <p>Not affiliated with any exam board. All exam board names are trademarks of their respective owners.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default HomePage;