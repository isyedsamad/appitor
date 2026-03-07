"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import {
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe,
  Layout,
  Database,
  CreditCard,
  Users,
  GraduationCap,
  MessageSquare,
  ArrowRight,
  Star,
  Check,
  Search,
  ArrowUpRight,
  Monitor
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";
import { useState } from "react";

const tiers = [
  {
    name: "Appitor Core",
    tag: "Base Infrastructure",
    description: "The essential foundation for modern institutional governance.",
    features: [
      "Smart Admissions CRM",
      "Student & Staff Profiles",
      "Real-time Attendance Mark",
      "Fee Setup & Digital Receipts",
      "System Roles & Security"
    ],
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "from-blue-500 to-indigo-600"
  },
  {
    name: "Appitor Connect",
    tag: "Enhanced Connectivity",
    description: "Bridging the gap between academics and operations seamlessly.",
    features: [
      "Intelligent Timetable Mapping",
      "Digital Homework & LMS",
      "Employee Payroll Engine",
      "Unified Global Noticeboard",
      "Parent & Student Portals"
    ],
    icon: <Zap className="w-6 h-6" />,
    color: "from-[#e45011] to-[#f97316]",
    popular: true
  },
  {
    name: "Appitor Plus",
    tag: "Enterpise Matrix",
    description: "The ultimate ERP kernel for large-scale institutional scale.",
    features: [
      "Official WhatsApp API Integration",
      "Exam Marking & Report Cards",
      "Human Resource & Leave Management",
      "Advanced BI Analytics & Reports",
      "Custom Institutional Website"
    ],
    icon: <Globe className="w-6 h-6" />,
    color: "from-emerald-500 to-teal-600"
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-(--bg) text-(--text) selection:bg-(--primary) selection:text-white font-sans overflow-x-hidden">
      <Navbar />

      <main>
        <section className="relative pt-28 md:pt-36 pb-8 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-(--primary)/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
          </div>

          <div className="container mx-auto px-6 relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-(--bg-card) backdrop-blur-md border border-(--border)/50 text-[10px] font-bold text-(--text) mb-5 shadow-sm"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-(--primary) animate-pulse" />
              <span className="opacity-70 uppercase">Institutional OS | SL-4 Validated</span>
            </motion.div>

            <div className="max-w-4xl mx-auto space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
              >
                The Complete Software for <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e45011] via-[#f97316] to-[#fb923c]">Modern School Management.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-sm md:text-base lg:text-lg text-(--text-muted) max-w-xl mx-auto font-normal"
              >
                Appitor brings academics, finance, and daily administration
                into one seamless, high-performance platform for growing institutions.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-wrap justify-center gap-3 pt-2"
              >
                <Link
                  href="/contact"
                  className="px-7 py-3.5 bg-gradient-to-r from-(--primary) to-(--primary)/70 text-white font-bold rounded-xl shadow-lg shadow-[#e45011]/20 hover:shadow-xl hover:shadow-[#e45011]/30 transition-all hover:-translate-y-0.5 active:scale-95 text-sm flex items-center gap-2"
                >
                  Start Your Journey <ChevronRight size={16} />
                </Link>
                <Link
                  href="/features"
                  className="px-7 py-3 bg-(--bg-card)/70 backdrop-blur-sm text-(--text) font-semibold rounded-xl border border-(--border) transition-all text-sm"
                >
                  Explore Features
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="pt-5 max-w-2xl mx-auto"
              >
                <div className="py-6 px-4 rounded-2xl bg-(--bg-card)/70 border border-(--border) backdrop-blur-xl shadow-2xl shadow-black/[0.02] space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-start sm:justify-between gap-2 px-2">
                    <div className="text-left">
                      <h4 className="text-[11px] font-bold text-(--text-muted) uppercase tracking-widest">Institutional Growth</h4>
                      <p className="text-sm font-bold">Academic Performance Insights</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-bold text-emerald-500">+24.8%</span>
                        <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Enrollment</span>
                      </div>
                      <div className="flex flex-col items-start sm:items-end">
                        <span className="text-[10px] font-bold text-blue-500">+18.2%</span>
                        <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Efficiency</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-1.5 h-32 px-2">
                    {[40, 65, 45, 80, 55, 90, 75, 95, 85, 100].map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 0.5 + (i * 0.05), duration: 1, ease: "easeOut" }}
                        className={cn(
                          "w-full rounded-t-lg transition-colors group relative",
                          i === 9 ? "bg-(--primary)" : "bg-(--primary)/20 hover:bg-(--primary)/40"
                        )}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-(--bg-card) border border-(--border) px-2 py-0.5 rounded text-[9px] font-bold whitespace-nowrap shadow-sm">
                          {h}% Growth
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex justify-between text-[9px] font-bold text-(--text-muted) uppercase px-2 opacity-50">
                    <span>Q1 2025</span>
                    <span>Q2 2025</span>
                    <span>Q3 2025</span>
                    <span>Q4 2025 Deployment</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 1 }}
                className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center"
              >
                <div className="space-y-0.5 flex flex-col items-center">
                  <div className="text-[9px] font-bold text-(--text-muted) uppercase tracking-[0.15em]">Availability</div>
                  <div className="text-sm font-bold tracking-tight">99.9% Uptime</div>
                </div>
                <div className="space-y-0.5 flex flex-col items-center">
                  <div className="text-[9px] font-bold text-(--text-muted) uppercase tracking-[0.15em]">Security</div>
                  <div className="text-sm font-bold tracking-tight">Encrypted Nodes</div>
                </div>
                <div className="space-y-0.5 flex flex-col items-center">
                  <div className="text-[9px] font-bold text-(--text-muted) uppercase tracking-[0.15em]">Sync</div>
                  <div className="text-sm font-bold tracking-tight">Real-time Data</div>
                </div>
                <div className="space-y-0.5 flex flex-col items-center">
                  <div className="text-[9px] font-bold text-(--text-muted) uppercase tracking-[0.15em]">Standard</div>
                  <div className="text-sm font-bold tracking-tight">ISO Compliant</div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
        <section className="pt-16 pb-5 relative overflow-hidden bg-(--bg)">
          <div className="container mx-auto px-7 md:px-10 max-w-7xl">
            <div className="text-center mb-8 space-y-1">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight">Everything for your School.</h2>
              <p className="text-sm md:text-base text-(--text-muted) max-w-xl mx-auto leading-relaxed">
                A professional suite of modular tools designed for absolute clarity.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-7 rounded-3xl bg-(--bg-card) border border-(--border) hover:shadow-xl transition-all group flex flex-col justify-between min-h-[360px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-(--primary)">
                    <MessageSquare size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Connect</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">One-to-One Contact</h3>
                  <p className="text-sm text-(--text-muted) leading-relaxed">Direct links between school and families. Share growth instantly.</p>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="p-3.5 rounded-2xl bg-(--bg) border border-(--border) shadow-sm space-y-2 relative">
                    <div className="flex items-center justify-between pb-1.5 border-b border-(--border)">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-[8px] font-bold">SP</div>
                        <span className="text-[10px] font-bold tracking-tight">Sarah's Parent</span>
                        <span className="text-[8px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase">Trusted</span>
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed opacity-90 italic">
                      "Excellent! I've seen a great shift in her reading skills this week."
                    </p>
                    <div className="flex justify-end items-center gap-1.5 pt-1">
                      <span className="text-[8px] opacity-40 font-bold uppercase tracking-widest">Delivered</span>
                      <div className="flex gap-0.5">
                        <Check size={8} className="text-blue-500" />
                        <Check size={8} className="text-blue-500 -ml-1" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="p-7 rounded-3xl bg-(--bg-card) border border-(--border) hover:shadow-xl transition-all group flex flex-col justify-between min-h-[360px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-blue-500">
                    <GraduationCap size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Academics</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Exam & Marking</h3>
                  <p className="text-sm text-(--text-muted) leading-relaxed">Track academic performance across batches with automated marking.</p>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-(--bg) border border-(--border) space-y-3">
                  <div className="flex justify-between items-center text-[9px] font-bold opacity-60 uppercase tracking-widest">
                    <span>Term 2 Grade Sheet</span>
                    <span className="text-blue-500">Live</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-(--border)">
                      <span className="text-[10px] font-bold">Mathematics</span>
                      <span className="text-[10px] font-bold text-emerald-500">A+</span>
                    </div>
                    <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-(--border)">
                      <span className="text-[10px] font-bold">General Science</span>
                      <span className="text-[10px] font-bold text-blue-500">A</span>
                    </div>
                  </div>
                  <button className="w-full py-2 bg-blue-500 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                    Generate Batch Results
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="p-7 rounded-3xl bg-(--bg-card) border border-(--border) hover:shadow-xl transition-all group flex flex-col justify-between min-h-[360px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Users size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Institutional</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Attendance Analytics</h3>
                  <p className="text-sm text-(--text-muted) leading-relaxed">Real-time participation tracking and institutional sync pings.</p>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Status Pulse</span>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        <span className="text-lg font-bold">98.4%</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded-full">Synchronized</span>
                    </div>
                  </div>
                  <div className="flex items-end gap-1 h-8">
                    {[40, 60, 45, 90, 75, 80, 100].map((h, i) => (
                      <div key={i} style={{ height: `${h}%` }} className="flex-grow bg-emerald-500/20 rounded-t-[2px]" />
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="p-7 rounded-3xl bg-(--bg-card) border border-(--border) hover:shadow-xl transition-all group flex flex-col justify-between min-h-[360px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-500">
                    <CreditCard size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Finance</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Fee Reminder Logic</h3>
                  <p className="text-sm text-(--text-muted) leading-relaxed">Automated collection alerts with professional invoice-style mocks.</p>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-(--bg) border border-(--border) shadow-sm space-y-3">
                  <div className="flex justify-between items-center text-[9px] font-bold opacity-60 uppercase">
                    <span>Invoice #0942</span>
                    <span className="text-amber-500 px-2 py-0.5 bg-amber-500/5 border border-amber-500/10 rounded-full">Overdue</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Pending Balance</span>
                    <p className="text-xl font-bold">₹2400.00</p>
                  </div>
                  <button className="w-full py-2 bg-amber-500 text-white rounded-xl text-[10px] font-bold shadow-lg shadow-amber-500/20 active:scale-95 transition-all">
                    Trigger Parent Alert
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
                className="p-7 rounded-3xl bg-(--bg-card) border border-(--border) hover:shadow-xl transition-all group flex flex-col justify-between min-h-[360px]"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-500">
                    <Zap size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">Workload</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Resource Engine</h3>
                  <p className="text-sm text-(--text-muted) leading-relaxed">Balance teacher assignments with automated classroom sync.</p>
                </div>

                <div className="mt-6 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
                  <span className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Current Day Schedule</span>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] font-bold opacity-40 w-10">09:00 AM</span>
                      <div className="flex-grow p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold">Physics • Grade 9-A</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[8px] font-bold opacity-40 w-10">10:30 AM</span>
                      <div className="flex-grow p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold">Lab Sync • Cluster 4</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="p-7 rounded-3xl bg-gradient-to-br from-(--bg-card) to-(--primary-soft) text-(--text) border border-(--border) shadow-2zl group flex flex-col justify-between min-h-[360px] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(228,80,17,0.1),transparent)]" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center gap-2 text-(--primary)">
                    <ShieldCheck size={16} />
                    <span className="text-[10px] font-bold uppercase tracking-widest leading-none">The Standard</span>
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">Institutional Sync</h3>
                  <p className="text-sm text-(--text-muted) leading-relaxed font-medium">SL-4 Validated encryption with real-time distributed sync.</p>
                </div>

                <div className="relative z-10 p-4 rounded-xl bg-(--bg-card) border border-(--border) space-y-3">
                  <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-widest">
                    <span>Node Identity</span>
                    <span className="text-emerald-400">Verified</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} transition={{ duration: 1.5 }} className="h-full bg-emerald-500/50" />
                    </div>
                    <p className="text-[9px] font-mono opacity-60">ID://APP-CORE-NODE-0x492F</p>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        <section className="py-12 container mx-auto px-7 max-w-7xl">
          <div className="text-center mb-5 lg:mb-8 space-y-1">
            <h2 className="text-2xl md:text-4xl font-bold tracking-tight">Institutional Plans</h2>
            <p className="text-sm md:text-base text-(--text-muted) max-w-xl mx-auto leading-relaxed">
              Scale Effortlessly - Core Tools for Growing Teams
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {tiers.map((tier, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className={cn(
                  "relative p-8 rounded-2xl border border-(--border) bg-(--bg-card) group hover:shadow-2xl transition-all duration-300",
                  tier.popular && "border-(--primary)/30 ring-1 ring-(--primary)/20"
                )}
              >
                {tier.popular && (
                  <div className="absolute top-0 right-8 -translate-y-1/2 px-4 py-1 bg-(--primary) text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg">
                    Most Deployed
                  </div>
                )}

                <div className={cn(
                  "w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center text-white mb-5",
                  tier.color
                )}>
                  {tier.icon}
                </div>

                <div className="space-y-1 mb-4">
                  <h3 className="text-2xl font-bold">{tier.name}</h3>
                  <p className="text-[12px] font-semibold text-(--primary) uppercase">{tier.tag}</p>
                </div>

                <p className="text-sm text-(--text-muted) leading-relaxed mb-4">
                  {tier.description}
                </p>

                <div className="space-y-4 mb-8">
                  {tier.features.map((feature, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-3 text-sm font-medium">
                      <div className="mt-1 w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      </div>
                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  href="/plans"
                  className="flex items-center justify-between p-4 rounded-2xl bg-(--bg) border border-(--border) group-hover:border-(--primary)/30 transition-all font-bold text-sm"
                >
                  Explore Plan <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-12 bg-(--bg-card) border-y border-(--border)">
          <div className="container mx-auto px-8 md:px-10 max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="space-y-5">
                <div>
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--primary)/10 text-(--primary) text-[10px] font-bold uppercase tracking-widest"
                  >
                    <ShieldCheck size={12} />
                    Success Guaranteed
                  </motion.div>
                  <h2 className="text-2xl mt-3 mb-1 md:mt-4 md:mb-2 md:text-4xl font-bold">Designed for Excellence.<br />Supported by Experts.</h2>
                  <p className="text-sm md:text-lg text-(--text-muted) max-w-xl">
                    We don't just provide software; we partner with your institution to ensure
                    a seamless transition and absolute operational success.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-(--bg) border border-(--border) hover:translate-y-[-4px] transition-all">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                      <Zap size={20} />
                    </div>
                    <h4 className="text-sm font-bold mt-4 mb-1 uppercase">Seamless Migration</h4>
                    <p className="text-[11px] text-(--text-muted)">Switch from legacy systems in under 48 hours with zero data loss or downtime.</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-(--bg) border border-(--border) hover:translate-y-[-4px] transition-all">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <Users size={20} />
                    </div>
                    <h4 className="text-sm font-bold mt-4 mb-1 uppercase">Priority Support</h4>
                    <p className="text-[11px] text-(--text-muted)">24/7 access to dedicated account managers and technical experts.</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-(--primary)/5 blur-[100px] rounded-md" />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  className="relative py-5 px-6 rounded-lg bg-(--bg) border border-(--border) shadow-xl space-y-5"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-(--border)">
                    <h3 className="text-sm font-bold uppercase leading-none">Implementation Roadmap</h3>
                    <span className="text-[10px] px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase">v4.0</span>
                  </div>

                  <div className="space-y-6">
                    {[
                      { step: 1, title: "Audit & Discovery", icon: <Search size={14} />, status: "Completed" },
                      { step: 2, title: "Secure Migration", icon: <Zap size={14} />, status: "In Progress" },
                      { step: 3, title: "Staff Training", icon: <Monitor size={14} />, status: "Pending" },
                      { step: 4, title: "Go Live & Scale", icon: <ArrowUpRight size={14} />, status: "Goal" }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 relative">
                        {i < 3 && (
                          <div className="absolute left-[15px] top-[30px] w-[1px] h-[30px] bg-(--border)" />
                        )}
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border transition-all",
                          item.status === "Completed" ? "bg-emerald-500 border-emerald-500 text-white" :
                            item.status === "In Progress" ? "bg-(--primary) border-(--primary) text-white shadow-lg shadow-(--primary)/20 scale-110" :
                              "bg-(--bg) border-(--border) text-(--text-muted)"
                        )}>
                          {item.icon}
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-[12px] font-bold">{item.title}</h4>
                          <p className="text-[10px] text-(--text-muted)">Step {item.step} of 4</p>
                        </div>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-widest",
                          item.status === "Completed" ? "text-emerald-500" :
                            item.status === "In Progress" ? "text-(--primary) animate-pulse" :
                              "text-(--text-muted)"
                        )}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-(--border) flex justify-between items-center">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-(--border) bg-(--bg-card)" />
                      ))}
                      <div className="w-6 h-6 rounded-full border-2 border-(--border) bg-(--bg-card) flex items-center justify-center text-[8px] font-bold">+12</div>
                    </div>
                    <p className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Active Onboarding</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-8 container mx-auto px-8 md:px-12 max-w-7xl">
          <div className="p-10 md:p-16 rounded-xl bg-gradient-to-r from-(--primary) to-(--primary)/70 text-white text-center relative overflow-hidden shadow-xl shadow-[#e45011]/20">
            <div className="absolute top-0 right-0 w-[40%] h-full bg-[radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.2),transparent)]" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-4">
              <h2 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
                Transforming Education.<br />One Institution at a Time.
              </h2>
              <p className="text-sm md:text-lg text-white/90 font-medium max-w-2xl mx-auto leading-relaxed">
                Join forward-thinking schools scaling with Appitor.
                Empower your teachers, engage your parents, and lead with absolute clarity.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link
                  href="/contact"
                  className="px-9 py-3 bg-white text-(--primary) hover:bg-gray-50 transition-all font-bold rounded-xl shadow-xl hover:-translate-y-1 active:scale-95"
                >
                  Request Quote
                </Link>
                <Link
                  href="/plans"
                  className="px-9 py-3 bg-white/10 text-white border border-white/20 hover:bg-white/20 transition-all font-bold rounded-2xl backdrop-blur-md active:scale-95"
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
