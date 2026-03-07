"use client";

import { motion } from "framer-motion";
import {
    Check,
    ArrowRight,
    Zap,
    Globe,
    ShieldCheck,
    Star,
    Crown,
    X,
    Minus
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Link from "next/link";
import { cn } from "@/lib/utils";

const planTiers = [
    {
        name: "Appitor Core",
        slug: "core",
        price: "Enquire",
        tag: "Base Infrastructure",
        description: "Essential institutional governance engine for modern administrations.",
        icon: <ShieldCheck size={20} />,
        features: [
            "Student & Staff Profile Matrix",
            "Smart Admission & CRM",
            "Attendance Tracking (Marking)",
            "Fee Management (Collection & Receipts)",
            "Academic Setup (Classes & Subjects)",
            "Institutional Profile & Governance"
        ],
        color: "bg-blue-500/10 text-blue-600",
        btnText: "Enquire Deployment"
    },
    {
        name: "Appitor Connect",
        slug: "connect",
        price: "Enquire",
        tag: "Digital Ecosystem",
        description: "Advanced connectivity and portal access for growing institutions.",
        icon: <Zap size={20} />,
        features: [
            "Everything in Core",
            "Dynamic Timetable Management",
            "Modern LMS (Homework & Assignments)",
            "Official Noticeboard Network",
            "Employee Payroll Engine",
            "Student & Parent Portal Access"
        ],
        highlight: true,
        color: "bg-(--primary)/10 text-(--primary)",
        btnText: "Get Started Now"
    },
    {
        name: "Appitor Plus",
        slug: "plus",
        price: "Enquire",
        tag: "Enterprise Matrix",
        description: "Full-spectrum institutional OS with dedicated architectural nodes.",
        icon: <Globe size={20} />,
        features: [
            "Everything in Connect",
            "Official WhatsApp Business API",
            "Comprehensive Exam & Result Matrix",
            "Advanced Reporting & BI Insights",
            "Leave & Conflict Management",
            "Institutional Website & CMS"
        ],
        color: "bg-emerald-500/10 text-emerald-600",
        btnText: "Talk to Expert"
    }
];

const comparisonMatrix = [
    {
        category: "Portal Access",
        rows: [
            { label: "Administrator Portal", core: true, connect: true, plus: true },
            { label: "Android App", core: false, connect: "Appitor-Branded", plus: "School-Branded" },
            { label: "iOS App", core: false, connect: false, plus: "Extra Charges" },
            { label: "Student Portal", core: false, connect: true, plus: true },
            { label: "Parent Portal", core: false, connect: true, plus: true },
            { label: "Teacher Portal", core: false, connect: true, plus: true },
        ]
    },
    {
        category: "Administrative Governance",
        rows: [
            { label: "Student & Staff Profiles", core: true, connect: true, plus: true },
            { label: "Admissions CRM & Enquiry", core: true, connect: true, plus: true },
            { label: "Promote / Demote Logic", core: true, connect: true, plus: true },
            { label: "ID Card & Certificate Minting", core: true, connect: true, plus: true },
            { label: "System Roles & Permissions", core: true, connect: true, plus: true },
        ]
    },
    {
        category: "Academics & Learning",
        rows: [
            { label: "Classes & Subjects Mapping", core: true, connect: true, plus: true },
            { label: "Timetable Management Grid", core: false, connect: true, plus: true },
            { label: "Timetable Substitution Logic", core: false, connect: false, plus: true },
            { label: "Homework & Assignments", core: false, connect: true, plus: true },
            { label: "Study Materials Vault", core: false, connect: true, plus: true },
        ]
    },
    {
        category: "Attendance & absence",
        rows: [
            { label: "Attendance Marking (One-tap)", core: true, connect: true, plus: true },
            { label: "Pending Attendance Pulse", core: true, connect: true, plus: true },
            { label: "Late / Absentee Alerts", core: false, connect: false, plus: true },
            { label: "Holiday & Calendar Sync", core: true, connect: true, plus: true },
            { label: "Leave Portal & Approvals", core: false, connect: false, plus: true },
        ]
    },
    {
        category: "Financial Operations",
        rows: [
            { label: "Fee Heads & Templates", core: true, connect: true, plus: true },
            { label: "Collection & Digital Receipts", core: true, connect: true, plus: true },
            { label: "Fee Dues & Ledger Export", core: true, connect: true, plus: true },
            { label: "Accounts & Day Book BI", core: true, connect: true, plus: true },
            { label: "Payroll & Salary Matrix", core: false, connect: true, plus: true },
        ]
    },
    {
        category: "Exams & Results",
        rows: [
            { label: "Exam Terms & Setup", core: false, connect: false, plus: true },
            { label: "Bulk Marks Entry Workspace", core: false, connect: false, plus: true },
            { label: "Automated Grade Sheets", core: false, connect: false, plus: true },
            { label: "Institutional Result BI", core: false, connect: false, plus: true },
        ]
    },
    {
        category: "Communication Layer",
        rows: [
            { label: "Institutional Noticeboard", core: false, connect: true, plus: true },
            { label: "Class & Group Messaging", core: false, connect: false, plus: true },
            { label: "Student Messaging", core: false, connect: false, plus: true },
            { label: "Employee Messaging", core: false, connect: false, plus: true },
            { label: "Official WhatsApp Business API", core: false, connect: false, plus: true },
            // { label: "Complaints & Feedback Desk", core: false, connect: false, plus: true },
        ]
    },
    {
        category: "Reports & Intelligence",
        rows: [
            { label: "Student & Attendance Reports", core: "Basic", connect: "Standard", plus: "Advanced" },
            { label: "Teacher Workload BI", core: false, connect: false, plus: true },
            { label: "Audit Logs & Action Trace", core: false, connect: false, plus: true },
            { label: "Institutional Web Portal (CMS)", core: false, connect: false, plus: true },
        ]
    }
];

export default function PlansPage() {
    return (
        <div className="min-h-screen bg-(--bg) text-(--text) selection:bg-(--primary) selection:text-white font-sans overflow-x-hidden">
            <Navbar />

            <main className="pt-28 md:pt-40">
                <section className="container mx-auto px-7 md:px-10 max-w-7xl mb-12 text-center">
                    <div className="flex flex-col justify-center items-center gap-6">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-(--bg-card) border border-(--border)/50 text-[10px] font-bold text-(--primary) shadow-sm uppercase tracking-widest"
                        >
                            <Crown size={14} className="animate-pulse" /> The Plan Matrix
                        </motion.div>
                        <div className="max-w-4xl mx-auto space-y-4">
                            <motion.h1
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]"
                            >
                                Built to Scale with <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e45011] via-[#f97316] to-[#fb923c]">Your Institution.</span>
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-sm md:text-lg text-(--text-muted) max-w-2xl mx-auto leading-relaxed font-medium"
                            >
                                Choose the provisioning tier that matches your institutional scale.
                                Secure, high-density infrastructure for governance, academics, and finances.
                            </motion.p>
                        </div>
                    </div>
                </section>

                <section className="container mx-auto px-7 md:px-10 max-w-7xl mb-20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                        {planTiers.map((tier, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className={cn(
                                    "relative p-8 md:p-10 rounded-[32px] border border-(--border) bg-(--bg-card) group hover:shadow-2xl transition-all duration-500 flex flex-col items-start text-left",
                                    tier.highlight && "border-(--primary)/30 ring-1 ring-(--primary)/20 shadow-xl shadow-(--primary)/5"
                                )}
                            >
                                {tier.highlight && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 bg-gradient-to-r from-[#e45011] via-[#f97316] to-[#fb923c] text-white text-[9px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                                        Highly Recommended
                                    </div>
                                )}

                                <div className="space-y-6 mb-10 w-full">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm",
                                        tier.color
                                    )}>
                                        {tier.icon}
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-bold tracking-tight leading-none">{tier.name}</h2>
                                        <p className="text-[10px] font-bold text-(--primary) uppercase tracking-[0.2em]">{tier.tag}</p>
                                    </div>
                                    <p className="text-sm text-(--text-muted) leading-relaxed font-semibold">
                                        {tier.description}
                                    </p>
                                </div>

                                <div className="mb-10 w-full pt-8 border-t border-(--border)/50 text-center md:text-left">
                                    <div className="text-[9px] font-bold uppercase tracking-widest text-(--text-muted) mb-1 opacity-60">Provisioning Cost</div>
                                    <div className="text-4xl md:text-5xl font-bold tracking-tighter">{tier.price}</div>
                                </div>

                                <div className="space-y-4 mb-8 w-full flex-grow">
                                    {tier.features.map((feature, fIdx) => (
                                        <div key={fIdx} className="flex items-start gap-3 text-[13px] font-bold text-(--text) leading-tight opacity-80 group-hover:opacity-100 transition-opacity">
                                            <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                                                <Check size={12} className="text-emerald-500" />
                                            </div>
                                            {feature}
                                        </div>
                                    ))}
                                </div>

                                <Link
                                    href="/contact"
                                    className={cn(
                                        "w-full py-3 rounded-2xl flex justify-center items-center gap-3 font-bold text-sm transition-all active:scale-[0.98] border shadow-sm",
                                        tier.highlight
                                            ? "bg-gradient-to-r from-[#e45011] via-[#f97316] to-[#fb923c] text-white border-[#e45011] hover:shadow-xl hover:shadow-[#e45011]/20 hover:-translate-y-1"
                                            : "bg-(--bg) text-(--text) border-(--border) hover:bg-(--bg-card) hover:border-(--primary)/30"
                                    )}
                                >
                                    {tier.btnText} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </section>

                <section className="container mx-auto px-7 md:px-10 max-w-7xl mb-10">
                    <div className="text-center mb-8 space-y-4">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Capabilities Matrix.</h2>
                        <p className="text-sm md:text-lg text-(--text-muted) max-w-xl mx-auto font-semibold">
                            A granular breakdown of the features and modules available across each provisioning tier.
                        </p>
                    </div>

                    <div className="overflow-x-auto rounded-[32px] border border-(--border) bg-(--bg-card) shadow-xl shadow-black/[0.02]">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="border-b border-(--border)">
                                    <th className="p-8 text-[11px] font-bold uppercase tracking-widest text-(--text-muted) w-1/3">Feature Category</th>
                                    <th className="p-8 text-[11px] font-bold uppercase tracking-widest text-center">Core</th>
                                    <th className="p-8 text-[11px] font-bold uppercase tracking-widest text-center text-(--primary)">Connect</th>
                                    <th className="p-8 text-[11px] font-bold uppercase tracking-widest text-center">Plus</th>
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonMatrix.map((cat, cIdx) => (
                                    <React.Fragment key={cIdx}>
                                        <tr className="bg-black/[0.02] dark:bg-white/[0.02]">
                                            <td colSpan={4} className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-(--primary) border-b border-(--border)/50">
                                                {cat.category}
                                            </td>
                                        </tr>
                                        {cat.rows.map((row, rIdx) => (
                                            <tr key={rIdx} className="border-b border-(--border)/50 last:border-none hover:bg-(--bg) transition-colors group">
                                                <td className="px-8 py-5 text-[13px] font-semibold opacity-80 group-hover:opacity-100 transition-opacity">
                                                    {row.label}
                                                </td>
                                                <td className="p-5 text-center">
                                                    <Cell value={row.core} />
                                                </td>
                                                <td className="p-5 text-center">
                                                    <Cell value={row.connect} isHighlight />
                                                </td>
                                                <td className="p-5 text-center">
                                                    <Cell value={row.plus} />
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="pb-12 pt-6 container mx-auto px-7 md:px-12 max-w-7xl">
                    <div className="p-7 md:p-12 rounded-2xl bg-gradient-to-br from-[#e45011] to-[#f97316] text-white text-center relative overflow-hidden shadow-2xl shadow-[#e45011]/20">
                        <div className="absolute top-0 right-0 w-[40%] h-full bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.2),transparent)]" />

                        <div className="relative z-10 max-w-3xl mx-auto space-y-3">
                            <h2 className="text-3xl md:text-6xl font-bold tracking-tight leading-tight">
                                Ready for a <br />Better School?
                            </h2>
                            <p className="text-sm md:text-lg text-white/90 font-semibold max-w-2xl mx-auto">
                                Join forward-thinking schools scaling with Appitor.
                                Secure your deployment today and transform your institutional workflow.
                            </p>
                            <div className="flex flex-wrap justify-center gap-3 pt-4">
                                <Link
                                    href="/contact"
                                    className="px-10 py-3 bg-white text-(--primary) hover:bg-gray-50 transition-all font-bold rounded-2xl shadow-xl hover:-translate-y-1 active:scale-95"
                                >
                                    Start Implementation
                                </Link>
                                <Link
                                    href="/contact"
                                    className="px-10 py-3 bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all font-bold rounded-2xl backdrop-blur-md active:scale-95"
                                >
                                    Talk to Sales
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

function Cell({ value, isHighlight }) {
    if (typeof value === "string") {
        return <span className={cn("text-[11px] font-bold uppercase tracking-tight", isHighlight ? "text-(--primary)" : "opacity-60")}>{value}</span>;
    }

    return (
        <div className="flex justify-center">
            {value ? (
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", isHighlight ? "bg-(--primary)/10 text-(--primary)" : "bg-emerald-500/10 text-emerald-500")}>
                    <Check size={14} strokeWidth={3} />
                </div>
            ) : (
                <div className="w-6 h-6 rounded-full bg-(--bg) flex items-center justify-center text-(--text-muted)">
                    <Minus size={14} strokeWidth={3} />
                </div>
            )}
        </div>
    );
}

import React from "react";
