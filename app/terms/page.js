"use client";

import { motion } from "framer-motion";
import { FileText, Gavel, AlertTriangle, CheckCircle2, XCircle, Landmark, ShieldAlert, Scale } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";

export default function TermsPage() {
    const sections = [
        {
            icon: <Scale className="w-5 h-5" />,
            title: "License to Use",
            content: "Appitor grants your institution a non-exclusive, non-transferable, limited license to access and use the platform according to your selected plan (Core, Connect, or Plus). Any redistribution or unauthorized sub-licensing of the Appitor Kernel is strictly prohibited."
        },
        {
            icon: <XCircle className="w-5 h-5" />,
            title: "Strict No-Refund Policy",
            content: "Due to the highly customized nature of institutional onboarding, provisioning of cloud infrastructure, and administrative setup, all payments made to Appitor are final. We do not offer refunds once a service plan has been active or an agreement has been finalized."
        },
        {
            icon: <AlertTriangle className="w-5 h-5" />,
            title: "Limitation of Liability",
            content: "Appitor shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the platform. Our total liability is limited to the amount paid by the institution in the 6 months preceding the claim."
        },
        {
            icon: <Gavel className="w-5 h-5" />,
            title: "Governing Law",
            content: "These terms shall be governed by and construed in accordance with the laws of India. Any legal disputes arising from the use of Appitor shall be subject to the exclusive jurisdiction of the courts located in Siwan, Bihar, India."
        },
        {
            icon: <ShieldAlert className="w-5 h-5" />,
            title: "Indemnification",
            content: "The institution agrees to indemnify and hold Appitor harmless from any claims, losses, or legal fees resulting from the institution's violation of these terms, misuse of the platform, or infringement of third-party intellectual property rights."
        },
        {
            icon: <Landmark className="w-5 h-5" />,
            title: "Force Majeure",
            content: "Appitor is not liable for failures or delays in service performance due to causes beyond our reasonable control, including but not limited to acts of God, natural disasters, server outages, or telecommunication failures."
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
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-bold text-orange-600 shadow-sm uppercase tracking-widest"
                        >
                            <FileText size={12} /> Institutional Service Agreement
                        </motion.div>
                        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Terms & <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e45011] to-[#f97316]">Conditions</span>.</h1>
                        <p className="text-sm md:text-lg text-(--text-muted) max-w-2xl mx-auto font-semibold">
                            Last Updated: October 2023. These terms govern the deployment of the Appitor ecosystem.
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
                            <h2 className="text-2xl font-bold text-(--text) tracking-tight">Institutional Responsibility</h2>
                            <p className="text-sm leading-relaxed">
                                Institutions are responsible for maintaining the confidentiality of their administrative credentials and for all activities that occur under their account. You agree to immediately notify Appitor of any unauthorized use of your portal or any other breach of security. Appitor will not be liable for any loss or damage arising from your failure to comply with this security obligation.
                            </p>

                            <h2 className="text-2xl font-bold text-(--text) tracking-tight">Acceptable Usage</h2>
                            <p className="text-sm leading-relaxed">
                                You agree not to use the Appitor Kernel for any unlawful purpose. Prohibited activities include reverse engineering our software, scraping institutional data, bypassing security protocols, or using the platform in any way that harms the integrity of our infrastructure or other users.
                            </p>

                            <h2 className="text-2xl font-bold text-(--text) tracking-tight">Termination & Suspension</h2>
                            <p className="text-sm leading-relaxed">
                                Appitor reserves the right to suspend or terminate access to the platform without prior notice if an institution violates these terms, fails to pay subscription fees, or engages in activities that threaten the security of the ecosystem. Upon termination, the institution will have 30 days to export their data before permanent deletion.
                            </p>

                            <h2 className="text-2xl font-bold text-(--text) tracking-tight">Modification of Terms</h2>
                            <p className="text-sm leading-relaxed">
                                Appitor may revise these terms at any time by updating this page. Your continued use of the platform after such changes constitute your acceptance of the new terms. We will notify primary administrators of major changes via the administrative portal.
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
