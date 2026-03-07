"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MapPin,
    Phone,
    Mail,
    Send,
    MessageSquare,
    CheckCircle2,
    Globe,
    ChevronRight,
    Building2,
    ArrowUpRight,
    ShieldCheck,
    Zap
} from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { cn } from "@/lib/utils";

export default function ContactPage() {
    const [formState, setFormState] = useState("idle");
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormState("submitting");
        setError(null);

        const formData = {
            firstName: e.target[0].value,
            lastName: e.target[1].value,
            schoolName: e.target[2].value,
            email: e.target[3].value,
            message: e.target[4].value,
            source: "Contact Page"
        };

        try {
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setFormState("success");
            } else {
                setError(data.error || "Failed to send message");
                setFormState("idle");
            }
        } catch (err) {
            setError("Network error. Please try again.");
            setFormState("idle");
        }
    };

    return (
        <div className="min-h-screen bg-(--bg) text-(--text) selection:bg-(--primary) selection:text-white font-sans overflow-x-hidden">
            <Navbar />

            <main className="pt-24 md:pt-32 pb-16">
                <section className="container mx-auto px-7 md:px-10 max-w-6xl mb-12 text-center">
                    <div className="flex flex-col justify-center items-center gap-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--bg-card) border border-(--border)/50 text-[9px] font-bold text-(--primary) shadow-sm uppercase tracking-widest"
                        >
                            <ShieldCheck size={12} /> School Support & Inquiries
                        </motion.div>
                        <div className="max-w-3xl mx-auto space-y-3">
                            <motion.h1
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl md:text-5xl font-bold tracking-tight leading-tight"
                            >
                                Get in Touch with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e45011] to-[#f97316]">Appitor</span>.
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-xs md:text-base text-(--text-muted) max-w-xl mx-auto leading-relaxed font-medium"
                            >
                                Have questions? Our team is here to help your school transition
                                to a modern, digital management system.
                            </motion.p>
                        </div>
                    </div>
                </section>

                <section className="container mx-auto px-7 md:px-10 max-w-6xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="lg:col-span-4 space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                                <ContactCard
                                    icon={<Mail className="w-4 h-4" />}
                                    title="Email Us"
                                    value="appitor.official@gmail.com"
                                    color="text-[#e45011] bg-orange-500/10"
                                    href="mailto:appitor.official@gmail.com"
                                />
                                <ContactCard
                                    icon={<Phone className="w-4 h-4" />}
                                    title="Call Us"
                                    value="+91 70047 07500"
                                    color="text-blue-600 bg-blue-500/10"
                                    href="tel:+917004707500"
                                />
                                <div className="md:col-span-2 lg:col-span-1">
                                    <ContactCard
                                        icon={<MapPin className="w-4 h-4" />}
                                        title="Visit Us"
                                        value="ISM Campus, Siwan, Bihar"
                                        color="text-emerald-600 bg-emerald-500/10"
                                    />
                                </div>
                            </div>

                            <div className="p-6 rounded-3xl bg-(--bg-card) border border-(--border) space-y-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                                        <Zap size={16} />
                                    </div>
                                    <h4 className="text-xs font-bold uppercase tracking-tight">Fast Response</h4>
                                </div>
                                <p className="text-[11px] text-(--text-muted) leading-relaxed font-medium">
                                    Most inquiries are answered in **under 12 hours**.
                                </p>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="lg:col-span-8 bg-(--bg-card) border border-(--border) rounded-[32px] p-6 md:p-10 shadow-xl shadow-black/[0.01] relative overflow-hidden"
                        >
                            <AnimatePresence mode="wait">
                                {formState === "success" ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center h-full min-h-[400px] text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-6">
                                            <CheckCircle2 size={32} className="text-emerald-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold tracking-tight mb-2">Message Sent!</h3>
                                        <p className="text-(--text-muted) text-xs font-semibold max-w-xs mx-auto">
                                            Thank you for reaching out. We'll get back to you shortly.
                                        </p>
                                        <button
                                            onClick={() => setFormState("idle")}
                                            className="mt-8 px-8 py-3 rounded-xl font-bold bg-(--bg) border border-(--border) text-xs hover:border-(--primary)/30 transition-all"
                                        >
                                            Send Another
                                        </button>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0, scale: 0.98 }}
                                        onSubmit={handleSubmit}
                                        className="space-y-4 relative z-10"
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormGroup label="First Name" placeholder="i.e. Akash" required />
                                            <FormGroup label="Last Name" placeholder="i.e. Kumar" required />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormGroup label="School Name" placeholder="i.e. Global Academy" required />
                                            <FormGroup label="Email Address" placeholder="i.e. global@academy.com" type="email" required />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest pl-1 opacity-70">
                                                How can we help?
                                            </label>
                                            <textarea
                                                required
                                                rows={4}
                                                className="input"
                                                placeholder="Tell us about your school's needs..."
                                            />
                                        </div>

                                        {error && (
                                            <p className="text-xs text-red-500 font-bold pl-1">{error}</p>
                                        )}

                                        <button
                                            type="submit"
                                            disabled={formState === "submitting"}
                                            className={cn(
                                                "w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg active:scale-98",
                                                formState === "submitting"
                                                    ? "bg-(--bg-card) border border-(--border) text-(--text-muted) cursor-not-allowed"
                                                    : "bg-gradient-to-r from-[#e45011] to-[#f97316] text-white hover:shadow-[#e45011]/20 hover:-translate-y-0.5"
                                            )}
                                        >
                                            {formState === "submitting" ? (
                                                <>
                                                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    Send Message <ChevronRight size={14} />
                                                </>
                                            )}
                                        </button>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}

function ContactCard({ icon, title, value, color, href }) {
    const CardContent = (
        <div className="group p-5 rounded-2xl bg-(--bg-card) border border-(--border) hover:border-(--primary)/30 transition-all flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", color)}>
                {icon}
            </div>
            <div className="overflow-hidden">
                <h4 className="text-[9px] font-bold uppercase tracking-widest mb-0.5 opacity-50">{title}</h4>
                <p className="text-[12px] text-(--text) font-bold truncate">{value}</p>
            </div>
            {href && <ArrowUpRight className="w-3 h-3 ml-auto text-(--text-muted) group-hover:text-(--primary) transition-colors" />}
        </div>
    );

    if (href) {
        return <a href={href} className="block">{CardContent}</a>;
    }

    return CardContent;
}

function FormGroup({ label, placeholder, type = "text", required }) {
    return (
        <div className="space-y-2">
            <label className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest pl-1 opacity-70">
                {label}
            </label>
            <input
                type={type}
                required={required}
                className="input"
                placeholder={placeholder}
            />
        </div>
    );
}
