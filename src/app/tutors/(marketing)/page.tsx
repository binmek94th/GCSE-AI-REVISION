'use client'
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Brain,
    Check,
    CheckCircle2,
    ChevronDown,
    CircleAlert,
    ClipboardCheck,
    Clock3,
    FileCheck2,
    GraduationCap,
    LayoutDashboard,
    MessageSquareWarning,
    Plus,
    Quote,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    Zap,
} from "lucide-react";
import { Brand, PrimaryButton, TUTOR_SIGNUP } from "./tutorShared";

// The top navigation lives in ./layout.tsx (TutorNav) so it wraps this page;
// this file is just the page content and footer.

const ease = [0.22, 1, 0.36, 1] as const;

const reveal = {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-70px" },
    transition: { duration: 0.65, ease },
};

function Eyebrow({ children }: { children: React.ReactNode }) {
    return (
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.13em] text-violet-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            {children}
        </div>
    );
}

function SectionHeading({ eyebrow, title, body, centered = false }: { eyebrow: string; title: string; body: string; centered?: boolean }) {
    return (
        <motion.div {...reveal} className={centered ? "mx-auto max-w-3xl text-center" : "max-w-xl"}>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className="text-3xl font-extrabold leading-[1.12] tracking-[-0.035em] text-slate-950 sm:text-4xl lg:text-5xl">{title}</h2>
            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">{body}</p>
        </motion.div>
    );
}

function TutorDashboard() {
    const students = [
        { initials: "AM", name: "Ava M.", subject: "GCSE Maths", score: 78, color: "bg-blue-100 text-blue-700" },
        { initials: "JL", name: "Jamie L.", subject: "A-Level Biology", score: 64, color: "bg-violet-100 text-violet-700" },
        { initials: "SK", name: "Sofia K.", subject: "GCSE Chemistry", score: 71, color: "bg-cyan-100 text-cyan-700" },
    ];
    return (
        <div className="relative mx-auto max-w-[610px]">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-blue-300/30 via-violet-300/20 to-transparent blur-2xl" />
            <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease }}
                className="relative overflow-hidden rounded-[1.75rem] border border-white/80 bg-white/90 shadow-[0_32px_90px_-30px_rgba(76,70,180,0.45)] backdrop-blur-xl"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
                    <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white">
                            <LayoutDashboard className="h-4.5 w-4.5" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-900">Tutor dashboard</p>
                            <p className="text-[11px] text-slate-500">Tuesday, 18 June</p>
                        </div>
                    </div>
                    <button className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-violet-700">
                        <Plus className="h-3.5 w-3.5" /> Assign Work
                    </button>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-[1fr_160px] sm:p-7">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-900">Your students</p>
                            <span className="text-[11px] font-semibold text-violet-600">View all 12</span>
                        </div>
                        <div className="space-y-2.5">
                            {students.map((student) => (
                                <div key={student.name} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-xl bg-slate-50/80 p-2.5">
                                    <div className={`grid h-9 w-9 place-items-center rounded-full text-[10px] font-extrabold ${student.color}`}>{student.initials}</div>
                                    <div className="min-w-0">
                                        <p className="truncate text-xs font-bold text-slate-900">{student.name}</p>
                                        <p className="truncate text-[10px] text-slate-500">{student.subject}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-extrabold text-slate-900">{student.score}%</p>
                                        <p className="text-[9px] text-slate-400">Readiness</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                        <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 p-4 text-white shadow-md">
                            <TrendingUp className="mb-5 h-5 w-5 text-violet-100" />
                            <p className="text-2xl font-extrabold">+12%</p>
                            <p className="mt-1 text-[10px] leading-4 text-blue-100">Average readiness this month</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <CircleAlert className="mb-4 h-5 w-5 text-amber-600" />
                            <p className="text-lg font-extrabold text-amber-900">2 flags</p>
                            <p className="mt-1 text-[10px] leading-4 text-amber-700">Need your attention</p>
                        </div>
                    </div>
                </div>
            </motion.div>
            <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-8 -left-3 hidden items-center gap-3 rounded-2xl border border-white bg-white p-3.5 shadow-xl sm:flex"
            >
                <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-4 w-4" /></div>
                <div><p className="text-xs font-bold text-slate-900">Work completed</p><p className="text-[10px] text-slate-500">Jamie finished Cell Structure</p></div>
            </motion.div>
        </div>
    );
}

function AssignmentCard() {
    const [checked, setChecked] = useState([true, true, false]);
    const items = ["Premium Notes", "AI Quizzes", "Mock Exams"];
    return (
        <motion.div {...reveal} className="relative rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-[0_25px_70px_-35px_rgba(66,72,190,0.5)] sm:p-7">
            <div className="mb-6 flex items-center justify-between">
                <div><p className="text-lg font-extrabold text-slate-950">Assign Material</p><p className="text-xs text-slate-500">To Ava M. and 2 others</p></div>
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600"><ClipboardCheck className="h-5 w-5" /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Subject
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900">GCSE Maths <ChevronDown className="h-4 w-4 text-slate-400" /></div>
                </label>
                <label className="text-xs font-bold text-slate-600">Topic
                    <div className="mt-2 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900">Quadratic Equations <ChevronDown className="h-4 w-4 text-slate-400" /></div>
                </label>
            </div>
            <p className="mb-3 mt-5 text-xs font-bold text-slate-600">Include materials</p>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <button
                        key={item}
                        onClick={() => setChecked((current) => current.map((value, i) => i === index ? !value : value))}
                        className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-blue-50"
                    >
                        <span>{item}</span>
                        <span className={`grid h-5 w-5 place-items-center rounded-md border transition ${checked[index] ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"}`}>
              {checked[index] && <Check className="h-3.5 w-3.5" />}
            </span>
                    </button>
                ))}
            </div>
            <button className="mt-5 w-full rounded-full bg-violet-600 py-3 text-sm font-bold text-white transition hover:bg-violet-700">Assign to 3 students</button>
        </motion.div>
    );
}

function StruggleCard() {
    return (
        <motion.div {...reveal} className="rounded-[1.75rem] border border-blue-100 bg-white p-5 shadow-[0_25px_70px_-35px_rgba(66,72,190,0.5)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-bold uppercase tracking-[0.12em] text-violet-600">Student progress</p><h3 className="mt-1 text-xl font-extrabold text-slate-950">Jamie L.</h3></div>
                <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-700">Assignment complete</span>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700"><BookOpen className="h-5 w-5" /></div>
                        <div><p className="text-sm font-bold text-slate-900">Cell Structure Quiz</p><p className="text-xs text-slate-500">A-Level Biology · 7/10</p></div>
                    </div>
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-300 bg-amber-100 px-3 py-2 text-[11px] font-extrabold text-amber-800">
            <MessageSquareWarning className="h-3.5 w-3.5" /> Student Flagged: Struggled
          </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full w-[70%] rounded-full bg-gradient-to-r from-blue-500 to-violet-500" /></div>
            </div>
            <div className="mt-4 rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">What the student sees</p>
                <div className="flex items-center gap-3">
                    <div className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-amber-500 text-white"><Check className="h-4 w-4" /></div>
                    <p className="text-sm font-bold text-amber-950">I struggled with this topic.</p>
                </div>
                <p className="ml-9 mt-1 text-xs leading-5 text-amber-700">I would like to go through cell organelles in my next session.</p>
            </div>
        </motion.div>
    );
}

export default function TutorLandingPage() {
    const [openFaq, setOpenFaq] = useState(0);
    const faqs = [
        ["Is StudyCedo free for tutors?", "Yes. You can create a tutor account, add your first students, assign work, and explore progress insights for free."],
        ["Do my students need their own accounts?", "Students join through your private invite link. Their StudyCedo study plans connect automatically to your tutor dashboard."],
        ["Which subjects and levels are supported?", "StudyCedo is built for UK GCSE and A-Level learning, with subject coverage expanding continuously across major exam boards."],
        ["Can students tell me when they are stuck?", "Yes. Students can flag a topic or individual assignment as difficult, adding an optional note that appears instantly on your dashboard."],
        ["Will AI replace my role as a tutor?", "No. StudyCedo handles the repetitive analysis and organisation so you can spend more session time teaching, explaining, and motivating."],
    ];

    return (
        <>
            {/* 1. Hero */}
            <section className="relative flex min-h-[92svh] items-center overflow-hidden bg-gradient-to-br from-blue-50 via-white to-violet-50 px-5 pb-20 pt-32 sm:px-6">
                <div className="absolute left-[8%] top-24 h-72 w-72 rounded-full bg-blue-300/20 blur-3xl" />
                <div className="absolute bottom-10 right-[7%] h-80 w-80 rounded-full bg-violet-300/20 blur-3xl" />
                <div className="relative mx-auto grid w-full max-w-7xl items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
                        <Eyebrow>AI-powered tutoring, made human</Eyebrow>
                        <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-[4.25rem]">
                            Supercharge your tutoring sessions with <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">AI insights.</span>
                        </h1>
                        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                            Assign targeted work, track student progress in real-time, and see exactly where they struggle before your next session. Built for GCSE and A-Level tutors.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                            <PrimaryButton>Start Free Tutor Account <ArrowRight className="h-4 w-4" /></PrimaryButton>
                            <a href="#how-it-works" className="inline-flex items-center justify-center rounded-full border-2 border-violet-200 bg-white px-7 py-3.5 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50">See How It Works</a>
                        </div>
                        <p className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Free to start · No card required · Set up in 2 minutes</p>
                    </motion.div>
                    <TutorDashboard />
                </div>
            </section>

            {/* 2. Trust bar */}
            <section className="border-y border-blue-100 bg-white">
                <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-6 py-7 text-center md:grid-cols-4">
                    {[[GraduationCap, "Built for UK tutors"], [FileCheck2, "GCSE & A-Level"], [Brain, "AI-powered insights"], [Users, "Students stay connected"]].map(([Icon, label]) => {
                        const I = Icon as typeof GraduationCap;
                        return <div key={label as string} className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600"><I className="h-4.5 w-4.5 text-violet-600" />{label as string}</div>;
                    })}
                </div>
            </section>

            {/* 3. Value intro */}
            <section className="px-6 py-24 sm:py-32">
                <SectionHeading centered eyebrow="Your time, better spent" title="Walk into every session already knowing what matters." body="Stop spending the first 15 minutes working out what a student remembers. StudyCedo gives you a live picture of progress, confidence, and gaps before the lesson begins." />
                <motion.div {...reveal} className="mx-auto mt-14 grid max-w-5xl gap-5 md:grid-cols-3">
                    {[
                        [Clock3, "Save prep time", "See the right focus before each lesson."],
                        [Target, "Teach with precision", "Turn weak areas into an instant session plan."],
                        [TrendingUp, "Prove progress", "Share clear improvement with students and parents."],
                    ].map(([Icon, title, text]) => {
                        const I = Icon as typeof Clock3;
                        return <div key={title as string} className="rounded-2xl border border-blue-100 bg-blue-50/50 p-6"><I className="mb-5 h-6 w-6 text-violet-600" /><h3 className="font-extrabold text-slate-950">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text as string}</p></div>;
                    })}
                </motion.div>
            </section>

            {/* 4. Assignment */}
            <section id="features" className="bg-gradient-to-b from-white to-blue-50 px-6 py-24 sm:py-32">
                <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
                    <AssignmentCard />
                    <div>
                        <SectionHeading eyebrow="Seamless assignments" title="Assign work in seconds." body="Send revision materials, targeted quizzes, and mock exams directly to your students' StudyCedo study plans with just a few clicks. No more emailing PDFs." />
                        <div className="mt-7 space-y-3">
                            {["Choose any subject and topic", "Mix notes, quizzes, and mock exams", "Send to one student or your whole group"].map((text) => <div key={text} className="flex items-center gap-3 text-sm font-semibold text-slate-700"><span className="grid h-6 w-6 place-items-center rounded-full bg-violet-100 text-violet-600"><Check className="h-3.5 w-3.5" /></span>{text}</div>)}
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. Feedback loop */}
            <section className="bg-blue-50 px-6 py-24 sm:py-32">
                <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2 lg:gap-20">
                    <div>
                        <SectionHeading eyebrow="The feedback loop" title="Know exactly what they struggled with." body="Don't wait for the next session to find out they are stuck. Students can tick topics or questions they found difficult, sending immediate feedback to your dashboard so you can tailor your next lesson perfectly." />
                        <div className="mt-7 inline-flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                            <Zap className="h-5 w-5 text-amber-600" /> One glance. The right lesson plan.
                        </div>
                    </div>
                    <StruggleCard />
                </div>
            </section>

            {/* 6. AI insights */}
            <section className="px-6 py-24 sm:py-32">
                <SectionHeading centered eyebrow="Deep AI insights" title="Let the AI find their knowledge gaps." body="StudyCedo’s AI tutor analyzes their quiz results and past papers to automatically build a map of their weak areas. You get the insights; they get the grades." />
                <div className="mx-auto mt-14 grid max-w-6xl gap-5 md:grid-cols-3">
                    {[
                        { icon: Brain, label: "Weak Topics Identified", value: "6", note: "2 need attention now", tint: "bg-amber-50 text-amber-700" },
                        { icon: TrendingUp, label: "Exam Readiness Score", value: "75%", note: "↑ from 68% last month", tint: "bg-violet-50 text-violet-700" },
                        { icon: ClipboardCheck, label: "Homework Completion", value: "92%", note: "11 of 12 tasks complete", tint: "bg-emerald-50 text-emerald-700" },
                    ].map((metric, index) => (
                        <motion.div key={metric.label} {...reveal} transition={{ duration: 0.6, delay: index * 0.1, ease }} className="rounded-[1.5rem] border border-blue-100 bg-white p-7 shadow-lg shadow-blue-900/5">
                            <div className={`mb-8 grid h-11 w-11 place-items-center rounded-xl ${metric.tint}`}><metric.icon className="h-5 w-5" /></div>
                            <p className="text-sm font-bold text-slate-500">{metric.label}</p><p className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">{metric.value}</p><p className="mt-3 text-xs font-semibold text-slate-500">{metric.note}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* 7. How it works */}
            <section id="how-it-works" className="bg-gradient-to-b from-blue-50 to-white px-6 py-24 sm:py-32">
                <SectionHeading centered eyebrow="Simple by design" title="From invite to insight in three steps." body="No complicated school setup. Give every student a focused learning path and keep your teaching at the centre." />
                <div className="relative mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
                    <div className="absolute left-[16%] right-[16%] top-8 hidden h-px bg-gradient-to-r from-blue-200 via-violet-300 to-blue-200 md:block" />
                    {[
                        [Users, "01", "Invite your students", "Share a private link and connect their study plan to your dashboard."],
                        [ClipboardCheck, "02", "Assign targeted work", "Choose the exact content, topic, and deadline in a few clicks."],
                        [BarChart3, "03", "Teach from live insight", "See results, weak areas, and struggle flags before each session."],
                    ].map(([Icon, number, title, copy], index) => {
                        const I = Icon as typeof Users;
                        return <motion.div key={number as string} {...reveal} transition={{ duration: 0.6, delay: index * 0.1, ease }} className="relative text-center"><div className="relative mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-violet-200 bg-white text-violet-600 shadow-md"><I className="h-7 w-7" /><span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-violet-600 text-[9px] font-bold text-white">{number as string}</span></div><h3 className="mt-6 text-lg font-extrabold text-slate-950">{title as string}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{copy as string}</p></motion.div>;
                    })}
                </div>
            </section>

            {/* 8. Subjects */}
            <section id="subjects" className="px-6 py-24">
                <div className="mx-auto max-w-6xl rounded-[2rem] bg-slate-950 px-6 py-12 text-white sm:px-12 lg:flex lg:items-center lg:justify-between">
                    <motion.div {...reveal} className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-300">Curriculum-aligned</p><h2 className="mt-3 text-3xl font-extrabold tracking-[-0.035em] sm:text-4xl">One workspace. Every subject you teach.</h2><p className="mt-4 leading-7 text-slate-300">GCSE and A-Level materials designed around UK specifications and real exam outcomes.</p></motion.div>
                    <motion.div {...reveal} className="mt-8 flex max-w-md flex-wrap gap-2 lg:mt-0 lg:justify-end">
                        {["Maths", "Biology", "Chemistry", "Physics", "English", "Psychology", "Business", "More coming"].map((subject) => <span key={subject} className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100">{subject}</span>)}
                    </motion.div>
                </div>
            </section>

            {/* 9. Business dashboard */}
            <section className="bg-violet-50/60 px-6 py-24 sm:py-32">
                <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
                    <SectionHeading eyebrow="Built to help you grow" title="More students. Less admin. Better sessions." body="Keep every learner organised in one calm workspace. See who is on track, who needs a nudge, and where your next lesson can make the biggest difference." />
                    <motion.div {...reveal} className="grid grid-cols-2 gap-4 rounded-[1.75rem] border border-white bg-white/80 p-5 shadow-xl shadow-violet-900/5 backdrop-blur sm:grid-cols-4">
                        {[["12", "Active students"], ["86%", "Avg. completion"], ["8.4h", "Prep time saved"], ["4", "Flags resolved"]].map(([value, label]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><p className="text-2xl font-extrabold text-slate-950">{value}</p><p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">{label}</p></div>)}
                        <div className="col-span-2 rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 p-5 text-white sm:col-span-4">
                            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold text-blue-100">Student engagement</p><p className="mt-1 text-lg font-extrabold">Consistent growth</p></div><BarChart3 className="h-6 w-6 text-violet-200" /></div>
                            <div className="mt-5 flex h-20 items-end gap-2">{[38, 52, 44, 62, 70, 66, 82, 90].map((height, i) => <div key={i} className="flex-1 rounded-t-md bg-white/75" style={{ height: `${height}%` }} />)}</div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 10. Testimonials */}
            <section className="px-6 py-24 sm:py-32">
                <SectionHeading centered eyebrow="Trusted by independent tutors" title="Designed for the way great tutors teach." body="Real-time insight means less guesswork, more focused sessions, and more visible progress." />
                <div className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3">
                    {[
                        ["I can see the exact algebra steps a student is stuck on before they arrive. My sessions feel sharper and parents can see the progress too.", "Sarah K.", "GCSE Maths Tutor", "SK"],
                        ["The struggle flag is genuinely useful. My students tell me where their confidence dropped while it is still fresh, not a week later.", "James T.", "A-Level Biology Tutor", "JT"],
                        ["I spend far less time making and chasing homework. Everything lands in their plan and I can see the results without another spreadsheet.", "Priya R.", "GCSE Science Tutor", "PR"],
                    ].map(([quote, name, role, initials], index) => (
                        <motion.article key={name} {...reveal} transition={{ duration: 0.6, delay: index * 0.1, ease }} className="rounded-2xl border border-blue-100 bg-white p-7 shadow-md shadow-blue-900/5">
                            <Quote className="h-7 w-7 fill-violet-100 text-violet-500" />
                            <p className="mt-5 text-base leading-7 text-slate-700">“{quote}”</p>
                            <div className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-5"><div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-xs font-extrabold text-violet-700">{initials}</div><div><p className="text-sm font-extrabold text-slate-950">{name}</p><p className="text-xs text-slate-500">{role}</p></div></div>
                        </motion.article>
                    ))}
                </div>
            </section>

            {/* 11. Pricing */}
            <section id="pricing" className="bg-gradient-to-b from-blue-50 to-white px-6 py-24 sm:py-32">
                <SectionHeading centered eyebrow="Simple tutor pricing" title="Start free. Grow when you are ready." body="Everything you need to give students more targeted support, without another complicated subscription." />
                <motion.div {...reveal} className="mx-auto mt-14 grid max-w-4xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl shadow-blue-900/10 md:grid-cols-[0.85fr_1.15fr]">
                    <div className="p-8 sm:p-10">
                        <p className="text-sm font-bold text-violet-600">Tutor Starter</p>
                        <div className="mt-3 flex items-baseline gap-2"><span className="text-5xl font-extrabold tracking-tight text-slate-950">£0</span><span className="text-sm text-slate-500">to start</span></div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">Try the complete tutor workflow with your first students.</p>
                        <PrimaryButton className="mt-7 w-full">Create Free Account</PrimaryButton>
                    </div>
                    <div className="bg-slate-950 p-8 text-white sm:p-10">
                        <p className="text-sm font-bold text-violet-300">Everything tutors need</p>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            {["Student dashboard", "Targeted assignments", "Real-time results", "Struggle flags", "AI weak-area maps", "Progress reporting"].map((feature) => <div key={feature} className="flex items-center gap-2.5 text-sm text-slate-200"><span className="grid h-5 w-5 place-items-center rounded-full bg-violet-500/20 text-violet-300"><Check className="h-3 w-3" /></span>{feature}</div>)}
                        </div>
                        <p className="mt-7 text-xs leading-5 text-slate-400">Flexible plans for growing tutor rosters. No long contracts.</p>
                    </div>
                </motion.div>
            </section>

            {/* 12. FAQ */}
            <section className="px-6 py-24 sm:py-32">
                <div className="mx-auto max-w-3xl">
                    <SectionHeading centered eyebrow="Questions, answered" title="Everything you need to know." body="A clearer way to support your students, without changing what makes your teaching work." />
                    <div className="mt-12 space-y-3">
                        {faqs.map(([question, answer], index) => (
                            <div key={question} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
                                <button onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-sm font-extrabold text-slate-950 sm:px-6">
                                    {question}<ChevronDown className={`h-5 w-5 shrink-0 text-violet-600 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                                </button>
                                {openFaq === index && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-5 pb-5 text-sm leading-6 text-slate-600 sm:px-6">{answer}</motion.p>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 13. Final CTA */}
            <section className="px-6 pb-24">
                <motion.div {...reveal} className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-violet-700 px-6 py-16 text-center text-white shadow-2xl shadow-violet-700/20 sm:px-12 sm:py-20">
                    <div className="absolute -left-16 -top-20 h-64 w-64 rounded-full border-[42px] border-white/5" />
                    <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full border-[48px] border-white/5" />
                    <div className="relative mx-auto max-w-3xl">
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-100">Your next session starts here</p>
                        <h2 className="mt-4 text-4xl font-extrabold leading-tight tracking-[-0.04em] sm:text-5xl">Ready to scale your tutoring business?</h2>
                        <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-blue-100">Start for free. Manage your students, assign work, and get unparalleled insights.</p>
                        <Link href={TUTOR_SIGNUP} className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-extrabold text-violet-700 shadow-xl transition hover:-translate-y-0.5">Create Tutor Account <ArrowRight className="h-4 w-4" /></Link>
                    </div>
                </motion.div>
            </section>

            <footer className="bg-slate-950 px-6 py-10 text-slate-400">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 sm:flex-row">
                    <Brand footer />
                    <p className="text-xs">© 2025 StudyCedo Ltd. Built for better learning.</p>
                    <div className="flex gap-5 text-xs font-semibold"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/support" className="hover:text-white">Contact</Link></div>
                </div>
            </footer>
        </>
    );
}
