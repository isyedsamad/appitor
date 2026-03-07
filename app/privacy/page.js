"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Lock, Database, UserCheck, Eye, FileText, Globe, Server } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export default function PrivacyPage() {
    const sections = [
        {
            icon: <Database className="w-5 h-5" />,
            title: "Data Ownership & Governance",
            content: "At Appitor, we believe in absolute institutional sovereignty. Your school, college, or university retains 100% legal ownership of all student, staff, and academic data uploaded to the platform. Appitor acts strictly as a Data Processor, never a Data Owner."
        },
        {
            icon: <ShieldCheck className="w-5 h-5" />,
            title: "Encryption Standards",
            content: "All data residing within the Appitor Kernel is encrypted at rest using AES-256 standards. Data in transit is protected via TLS 1.3 (Transport Layer Security), ensuring that your institutional communications remain intercepted-proof and fully encrypted between nodes."
        },
        {
            icon: <UserCheck className="w-5 h-5" />,
            title: "School Privacy Compliance",
            content: "Our architecture is engineered to align with global data protection standards, including FERPA (Family Educational Rights and Privacy Act) and GDPR principles. We implement granular RBAC (Role-Based Access Control) to ensure that only authorized personnel can access sensitive records."
        },
        {
            icon: <Lock className="w-5 h-5" />,
            title: "Strict No-Sale Policy",
            content: "Appitor has a zero-tolerance policy regarding data monetization. We do not, and will never, sell, rent, or trade your institutional data to third-party advertisers or data brokers. Your privacy is not a product; it is a fundamental right of your institution."
        },
        {
            icon: <Eye className="w-5 h-5" />,
            title: "Audit Transparency",
            content: "Administrators have access to real-time telemetry and audit logs. Every interaction with the database is logged, providing a transparent trail of who accessed what data and when, ensuring internal accountability and security."
        },
        {
            icon: <Server className="w-5 h-5" />,
            title: "Hosting & Infrastructure",
            content: "Data is hosted on secure, mission-critical infrastructure with multiple redundancy layers. We utilize enterprise-grade cloud providers that maintain ISO 27001 and SOC 2 Type II certifications for physical and network security."
        }
    ];

    return (
        <div className="min-h-screen bg-(--bg) text-(--text) selection:bg-(--primary) selection:text-white font-sans overflow-x-hidden">
            <Navbar />

            <main className="pt-32 pb-24">
                <section className="container mx-auto px-7 md:px-10 max-w-5xl">
                    <div className="text-center mb-16 space-y-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-600 shadow-sm uppercase tracking-widest"
                        >
                            <ShieldCheck size={12} /> Data Protection Status: Active
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Data Governance & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e45011] to-[#f97316]">Privacy</span>.</h1>
                        <p className="text-sm md:text-lg text-(--text-muted) max-w-2xl mx-auto font-semibold">
                            Last Updated: October 2023. Our commitment to securing the future of educational data.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                        {sections.map((section, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.1 }}
                                className="p-8 rounded-[32px] bg-(--bg-card) border border-(--border) hover:border-(--primary)/30 transition-all group"
                            >
                                <div className="w-12 h-12 rounded-2xl bg-(--bg) border border-(--border) flex items-center justify-center text-(--primary) mb-6 group-hover:scale-110 transition-transform">
                                    {section.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-4 tracking-tight">{section.title}</h3>
                                <p className="text-sm text-(--text-muted) leading-relaxed font-medium">
                                    {section.content}
                                </p>
                            </motion.div>
                        ))}
                    </div>

                    <div className="prose prose-sm prose-slate dark:prose-invert max-w-none space-y-8 text-(--text-muted) font-medium">
                        <div className="p-10 rounded-[40px] bg-(--bg-card) border border-(--border) space-y-6">
                            <h2 className="text-2xl font-bold text-(--text) tracking-tight">Cookie Policy</h2>
                            <p className="text-sm leading-relaxed">
                                Appitor uses essential cookies to maintain session states and security. These are mandatory for the operation of the platform. We may also use analytical cookies to improve platform performance, which do not track individual identity. You can manage your preferences through your browser settings, though disabling essential cookies may impact platform functionality.
                            </p>

                            <h2 className="text-2xl font-bold text-(--text) tracking-tight">Third-Party Integrations</h2>
                            <p className="text-sm leading-relaxed">
                                Our platform may integrate with third-party services like Google Workspace or Microsoft 365. When you enable these integrations, data is exchanged according to the privacy policies of those providers. Appitor ensures that all API integrations are secured via OAuth 2.0 and follow strict privacy protocols.
                            </p>

                            <h2 className="text-2xl font-bold text-(--text) tracking-tight">Legal Disclosures</h2>
                            <p className="text-sm leading-relaxed">
                                We may disclose your information only if required by law or in response to valid requests by public authorities (e.g., a court or a government agency). In such cases, we will attempt to notify the affected institution unless prohibited by legal mandate.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
