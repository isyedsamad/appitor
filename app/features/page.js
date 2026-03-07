"use client";

import { motion } from "framer-motion";
import {
    ShieldCheck,
    Users,
    GraduationCap,
    MessageSquare,
    IndianRupee,
    ClipboardList,
    Calendar,
    BookOpen,
    BarChart3,
    Clock,
    Zap,
    Check,
    ArrowRight,
    ChevronRight,
    UserPlus,
    LayoutDashboard,
    FileText,
    IdCard,
    Smartphone,
    Search,
    Shield,
    TrendingUp,
    Briefcase,
    Settings,
    ShieldAlert
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";

const featuresData = [
    {
        category: "Administrative & Admissions",
        icon: <UserPlus size={15} />,
        color: "text-blue-500",
        bg: "bg-blue-500/10",
        description: "Seamless student lifecycle management from first enquiry to graduation.",
        features: [
            "Smart Admission & Enquiry Tracking",
            "Individual Student & Parent Profiles",
            "Student Promotion & Demotion Logic",
            "ID Card & Certificate Generation",
            "Batch & Roll Number Assignment",
            "Institutional Alumni Mapping"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-(--bg) border border-(--border) space-y-3">
                <div className="flex items-center justify-between text-[9px] font-bold opacity-60 uppercase">
                    <span>Admission Enquiry #829</span>
                    <span className="text-blue-500">Live</span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-(--border)">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] font-bold">JD</div>
                        <div className="flex-grow">
                            <p className="text-[10px] font-bold">John Doe</p>
                            <p className="text-[8px] opacity-60">Grade 5 • Enquiry Sent</p>
                        </div>
                        <ChevronRight size={10} className="opacity-30" />
                    </div>
                </div>
                <div className="pt-2 border-t border-(--border) flex justify-between items-center text-[9px] font-bold uppercase tracking-widest">
                    <span>Probability Scan</span>
                    <span className="text-emerald-500">92% Match</span>
                </div>
            </div>
        )
    },
    {
        category: "Academic Framework",
        icon: <GraduationCap size={15} />,
        color: "text-(--primary)",
        bg: "bg-(--primary)/10",
        description: "The core architecture for institutional curriculum and classroom governance.",
        features: [
            "Simplified Classes & Sections Management",
            "Global Subject & Syllabus Matrix",
            "Teacher-Subject Allocation mapping",
            "Lesson Plan Tracking Engine",
            "Academic Session & Semester Handling",
            "Batch-wise Performance BI"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-(--bg) border border-(--border) space-y-3">
                <div className="flex items-center justify-between text-[9px] font-bold opacity-60 uppercase">
                    <span>Session Lifecycle</span>
                    <span className="text-(--primary)">Active</span>
                </div>
                <div className="space-y-2">
                    <div className="p-2 rounded-lg bg-(--bg-card) border border-(--border) flex items-center justify-between">
                        <span className="text-[10px] font-bold">Grade 10 - Section A</span>
                        <div className="flex -space-x-1.5">
                            {[1, 2, 3].map(i => <div key={i} className="w-4 h-4 rounded-full border border-(--bg) bg-gray-200" />)}
                        </div>
                    </div>
                    <div className="p-2 rounded-lg bg-(--bg-card) border border-(--border) flex items-center justify-between opacity-50">
                        <span className="text-[10px] font-bold">Grade 10 - Section B</span>
                        <Check size={10} className="text-emerald-500" />
                    </div>
                </div>
            </div>
        )
    },
    {
        category: "Attendance & Absence",
        icon: <ClipboardList size={15} />,
        color: "text-emerald-500",
        bg: "bg-emerald-500/10",
        description: "Real-time participation tracking with automated stakeholder alerts.",
        features: [
            "One-tap Employee Attendance",
            "Pending Attendance Status Pulse",
            "Leave Portal with Approval Logic",
            "Holiday & Institutional Calendar",
            "Monthly Attendance BI Reports",
            "Real-time SMS/WhatsApp Pings for Absentees"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <span className="text-[10px] font-bold opacity-60 uppercase">Daily Pulse</span>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-lg font-bold">98.4%</span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[9px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded-full">All Sync</span>
                    </div>
                </div>
                <div className="flex items-end gap-1 h-8">
                    {[40, 60, 45, 90, 75, 80, 100].map((h, i) => (
                        <div key={i} style={{ height: `${h}%` }} className="flex-grow bg-emerald-500/20 rounded-t-[2px]" />
                    ))}
                </div>
            </div>
        )
    },
    {
        category: "Financial Integrity",
        icon: <IndianRupee size={15} />,
        color: "text-amber-500",
        bg: "bg-amber-500/10",
        description: "Robust, double-entry finance engine for all institutional revenue nodes.",
        features: [
            "Dynamic Fee Head & Template Setup",
            "Per-Student Personalized Fee Assignment",
            "Digital Collection & Receipt Minting",
            "Comprehensive Dues & Penalty Logic",
            "Instant Ledger & Day-book Analytics",
            "Parent Collection Portal Integration"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-(--bg) border border-(--border) shadow-sm space-y-3">
                <div className="flex justify-between items-center text-[9px] font-bold opacity-60 uppercase">
                    <span>Invoice #0942</span>
                    <span className="text-amber-500 px-2 py-0.5 bg-amber-500/5 border border-amber-500/10 rounded-full text-[8px]">Overdue</span>
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Pending Balance</span>
                    <p className="text-xl font-bold">₹12,400.00</p>
                </div>
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[65%]" />
                </div>
            </div>
        )
    },
    {
        category: "Precision Scheduling",
        icon: <Calendar size={15} />,
        color: "text-indigo-500",
        bg: "bg-indigo-500/10",
        description: "Automated, conflict-free timetable logic for teachers and grades.",
        features: [
            "Dynamic Timetable Management Grid",
            "Teacher Substitution & Swap Engine with Approval",
            "Conflict Detection & Resolution API",
            "Teacher Workload & Capacity BI",
            "Period-wise Institutional Sync",
            "Personalized Staff & Student View"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Active Schedule</span>
                <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] font-bold opacity-40 w-10">09:00 AM</span>
                        <div className="flex-grow p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold">Physics • Gr. 9-A</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[8px] font-bold opacity-40 w-10">10:30 AM</span>
                        <div className="flex-grow p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold">Maths • Gr. 10-B</div>
                    </div>
                </div>
            </div>
        )
    },
    {
        category: "Communication Layer",
        icon: <MessageSquare size={15} />,
        color: "text-purple-500",
        bg: "bg-purple-500/10",
        description: "Modern messaging infrastructure to unify students, staff, and families.",
        features: [
            "Official WhatsApp Business API Sync",
            "Individual & Group Student Messaging",
            "Employee Internal Notice Network",
            "Dynamic Noticeboard & Class Alerts",
            "Parent Engagement Portal Access",
            "Emergency Broadcast System"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-(--bg) border border-(--border) space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 pb-2 border-b border-(--border)">
                    <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[8px] font-bold">MP</div>
                    <span className="text-[10px] font-bold tracking-tight text-purple-600">Principal's Office</span>
                </div>
                <div className="p-2 rounded-xl bg-purple-50 text-[9px] font-medium leading-relaxed italic text-purple-700">
                    "Reminder: Academic audit starts tomorrow at 09:00 AM sharp."
                </div>
                <div className="flex justify-end pr-1 text-[8px] font-bold opacity-40 uppercase">12:30 PM • Read</div>
            </div>
        )
    },
    {
        category: "Results & Exam Matrix",
        icon: <TrendingUp size={15} />,
        color: "text-rose-500",
        bg: "bg-rose-500/10",
        description: "Data-driven academic performance tracking and grade management.",
        features: [
            "Exam Term & Setup Architecture",
            "Bulk Marks Entry Workspace",
            "Automated Grade Sheet Generation with Export",
            "Institutional Result Analysis BI",
            "Custom Score Scaling Logic",
            "Parent Portal Result Access"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-(--bg) border border-(--border) space-y-3">
                <div className="flex justify-between items-center text-[9px] font-bold opacity-60 uppercase tracking-widest">
                    <span>Term 2 Grade Sheet</span>
                    <span className="text-rose-500 animate-pulse">Processing</span>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-(--border)">
                        <span className="text-[10px] font-bold">Mathematics</span>
                        <span className="text-[10px] font-bold text-emerald-500">A+</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-(--border)">
                        <span className="text-[10px] font-bold">Science</span>
                        <span className="text-[10px] font-bold text-blue-500">A</span>
                    </div>
                </div>
            </div>
        )
    },
    {
        category: "Learning & Curriculum",
        icon: <BookOpen size={15} />,
        color: "text-teal-500",
        bg: "bg-teal-500/10",
        description: "Digital learning distribution and curriculum management ecosystem.",
        features: [
            "Digital Homework & Assignment Engine",
            "Study Material & Resource Vault",
            "Automated LMS Submission Tracker",
            "Grade-wise Resource Mapping",
            "Lesson Plan Sync for Teachers",
            "Student Submission Portals"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/10 space-y-3">
                <div className="flex items-center justify-between text-[9px] font-bold opacity-60 uppercase">
                    <span>Homework Tracker</span>
                    <span className="text-teal-600">Sync On</span>
                </div>
                <div className="bg-white/50 dark:bg-black/20 p-2.5 rounded-xl border border-teal-500/20 space-y-1">
                    <p className="text-[10px] font-bold">Atomic Structure Study Material</p>
                    <div className="flex items-center justify-between text-[8px] opacity-60">
                        <span>PDF Document • 4.2 MB</span>
                        <span>Gr. 9 Chemistry</span>
                    </div>
                </div>
                <div className="flex -space-x-1 justify-center">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="w-4 h-4 rounded-full border border-(--bg) bg-teal-100" />)}
                </div>
            </div>
        )
    },
    {
        category: "Employee Capital",
        icon: <Briefcase size={15} />,
        color: "text-sky-500",
        bg: "bg-sky-500/10",
        description: "Human resource management from recruitment to payroll lifecycle.",
        features: [
            "Employee Digital Onboarding & Admittance",
            "Professional Bio-data & Document Vault",
            "Smart Card Attendance with Tracking & Sync",
            "Employee Payroll & Salary Matrix",
            "Workload Optimization BI",
            "Leave Management Approval Flow"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 space-y-3">
                <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">HR Lifecycle</span>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center text-[10px] font-bold">MK</div>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold">Michael Klein</p>
                        <p className="text-[8px] font-bold text-sky-500 uppercase">Sr. Faculty • Active</p>
                    </div>
                </div>
                <div className="flex justify-between items-center text-[8px] font-bold">
                    <span>Workload Score</span>
                    <span className="text-emerald-500">Optimized</span>
                </div>
            </div>
        )
    },
    {
        category: "Institutional Intelligence",
        icon: <Settings size={15} />,
        color: "text-slate-500",
        bg: "bg-slate-500/10",
        description: "Advanced governance settings and system-wide audit visibility.",
        features: [
            "System Roles & Fine-grained Permissions",
            "Institutional Profile & Branch Mapping",
            "Real-time Audit Logs & Action Trace",
            "Advanced BI Reporting & Export Engine",
            "Institutional Settings & Meta Sync",
            "Conflict Management & Task Desk"
        ],
        mock: (
            <div className="p-4 rounded-2xl bg-slate-500/5 border border-slate-500/10 space-y-3">
                <div className="flex items-center gap-2 text-[9px] font-bold opacity-60 uppercase tracking-widest">
                    <ShieldAlert size={10} className="text-slate-500" />
                    Audit Trace
                </div>
                <div className="space-y-1.5">
                    <div className="text-[8px] font-mono p-1 rounded bg-black/5 border border-(--border)">
                        [04:22] ADM_UPDATE: ROLLNO_SEQ_0x42
                    </div>
                    <div className="text-[8px] font-mono p-1 rounded bg-black/5 border border-(--border) opacity-40">
                        [04:20] SYS_SYNC: BRANCH_CONTEXT_L5
                    </div>
                </div>
            </div>
        )
    }
];

export default function FeaturesPage() {
    return (
        <div className="min-h-screen bg-(--bg) text-(--text) selection:bg-(--primary) selection:text-white font-sans overflow-x-hidden">
            <Navbar />
            <main className="pt-28 md:pt-40">
                <section className="container mx-auto px-7 md:px-10 max-w-7xl mb-20 text-center">
                    <div className="flex flex-col justify-center items-center">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-(--bg-card) backdrop-blur-md border border-(--border)/50 text-[10px] font-bold text-(--primary) mb-2 shadow-sm uppercase tracking-widest"
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-(--primary) animate-pulse" />
                            Complete Capability Matrix
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-4xl md:text-6xl font-bold mt-4 mb-2 tracking-tight leading-[1.1]"
                        >
                            Everything you need to <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e45011] via-[#f97316] to-[#fb923c]">Command your School.</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="text-sm md:text-lg text-(--text-muted) max-w-2xl leading-relaxed font-medium"
                        >
                            Appitor provides a modular infrastructure designed to scale with your institution.
                            From academic precision to financial integrity, experience institutional grade architecture.
                        </motion.p>
                    </div>
                </section>

                <section className="container mx-auto px-7 md:px-10 max-w-7xl pb-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                        {featuresData.map((item, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.05 }}
                                className="group flex flex-col justify-between bg-(--bg-card) p-5 rounded-xl border border-(--border)"
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-6">
                                        <div className="space-y-4 flex-grow">
                                            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-xs uppercase shadow-sm", item.bg, item.color)}>
                                                {item.icon}
                                                {item.category}
                                            </div>
                                            <p className="text-sm md:text-[15px] text-(--text-muted) leading-relaxed font-semibold max-w-sm">
                                                {item.description}
                                            </p>
                                        </div>
                                        <div className="hidden sm:block w-48 shrink-0">
                                            <motion.div
                                                whileHover={{ y: -5, scale: 1.02 }}
                                                className="transition-all duration-300"
                                            >
                                                {item.mock}
                                            </motion.div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                                        {item.features.map((feature, fIdx) => (
                                            <div key={fIdx} className="flex items-start gap-2.5 group/feat translate-x-0 hover:translate-x-1 transition-transform">
                                                <div className={cn("mt-1.5 shrink-0 w-1 h-1 rounded-full", item.color, "bg-current")} />
                                                <span className="text-[12px] md:text-[13px] font-semibold opacity-80 group-hover/feat:opacity-100 transition-opacity leading-tight">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* <div className="mt-8 pt-8 border-t border-(--border)/50 flex items-center justify-between">
                                    <div className="flex -space-x-2">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-6 h-6 rounded-full border border-(--bg) bg-gray-100 dark:bg-gray-800" />
                                        ))}
                                        <div className="w-6 h-6 rounded-full border border-(--bg) bg-(--bg-card) flex items-center justify-center text-[7px] font-bold">+50</div>
                                    </div>
                                    <p className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Actively Optimized</p>
                                </div> */}
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="py-24 bg-(--bg-card) border-y border-(--border)">
                    <div className="container mx-auto px-7 md:px-10 max-w-7xl">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-2xl md:text-5xl font-bold tracking-tight">Built for Your Peace of Mind.</h2>
                            <p className="text-sm md:text-lg text-(--text-muted) max-w-xl mx-auto font-semibold">
                                Focus on teaching while we handle the technical heavy lifting. Secure, fast, and always accessible.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="p-8 rounded-3xl bg-(--bg) border border-(--border) space-y-5 group hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    <Shield size={24} />
                                </div>
                                <h4 className="text-xl font-bold tracking-tight">Always Accessible</h4>
                                <p className="text-sm text-(--text-muted) leading-relaxed font-medium">Your school never stops, and neither do we. Access your data anytime, anywhere with 99.9% uptime and secure backups.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-(--bg) border border-(--border) space-y-5 group hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-(--primary)/10 text-(--primary) flex items-center justify-center group-hover:bg-(--primary) group-hover:text-white transition-all">
                                    <Zap size={24} />
                                </div>
                                <h4 className="text-xl font-bold tracking-tight">Instant Updates</h4>
                                <p className="text-sm text-(--text-muted) leading-relaxed font-medium">Get real-time alerts for attendance, fees, and exams. Stay connected with parents and staff instantly via WhatsApp and SMS.</p>
                            </div>
                            <div className="p-8 rounded-3xl bg-(--bg) border border-(--border) space-y-5 group hover:shadow-xl transition-all">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                    <BarChart3 size={24} />
                                </div>
                                <h4 className="text-xl font-bold tracking-tight">Smart Insights</h4>
                                <p className="text-sm text-(--text-muted) leading-relaxed font-medium">Make better decisions with clear, easy-to-read reports. Track student progress and school growth without the paperwork.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-12 container mx-auto px-7 md:px-12 max-w-7xl">
                    <div className="p-7 md:p-12 rounded-2xl bg-gradient-to-br from-[#e45011] to-[#f97316] text-white text-center relative overflow-hidden shadow-2xl shadow-[#e45011]/20">
                        <div className="absolute top-0 right-0 w-[40%] h-full bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.2),transparent)]" />

                        <div className="relative z-10 max-w-3xl mx-auto space-y-3">
                            <h2 className="text-3xl md:text-6xl font-bold tracking-tight leading-tight">
                                One Architecture. <br />Infinite Possibilities.
                            </h2>
                            <p className="text-sm md:text-lg text-white/90 font-semibold max-w-2xl mx-auto">
                                Join forward-thinking schools scaling with Appitor.
                                Empower your teachers, engage your parents, and lead with absolute clarity.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 pt-4">
                                <Link
                                    href="/contact"
                                    className="px-10 py-3 bg-white text-(--primary) hover:bg-gray-50 transition-all font-bold rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95"
                                >
                                    Request Implementation Audit
                                </Link>
                                <Link
                                    href="/plans"
                                    className="px-10 py-3 bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all font-bold rounded-2xl backdrop-blur-md active:scale-95"
                                >
                                    Explore Plan Matrix
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
