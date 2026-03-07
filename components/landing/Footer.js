"use client";

import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-(--bg) border-t border-(--border) pt-12 pb-10">
            <div className="container mx-auto px-7 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-16 mb-10">
                    <div className="lg:col-span-2 space-y-6">
                        <Link href="/" className="flex items-center gap-2 group">
                            {/* <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e45011] to-[#f97316] flex items-center justify-center text-white shadow-lg shadow-[#e45011]/20 transition-transform duration-300 group-hover:scale-105">
                                <span className="font-bold text-xl italic tracking-tighter">A</span>
                            </div> */}
                            <Image src="/logo.png" alt="Logo" width={25} height={25} />
                            <span className="font-bold text-lg tracking-tight text-(--text)">Appitor</span>
                        </Link>
                        <p className="text-(--text-muted) max-w-sm leading-relaxed text-sm font-medium">
                            The next-generation ERP kernel engineered to consolidate academics,
                            finance, and communication into a single, premium administrative ecosystem.
                        </p>
                        <div className="flex items-center gap-4">
                            <SocialLink href="#" icon={<Twitter size={18} />} />
                            <SocialLink href="#" icon={<Facebook size={18} />} />
                            <SocialLink href="#" icon={<Instagram size={18} />} />
                            <SocialLink href="#" icon={<Linkedin size={18} />} />
                        </div>
                    </div>

                    <div>
                        <h4 className="font-bold text-(--text) mb-6 text-[11px] uppercase tracking-[0.2em] opacity-50">Platform</h4>
                        <ul className="space-y-4">
                            <FooterLink href="/features">Features</FooterLink>
                            <FooterLink href="/plans">Plan Matrix</FooterLink>
                            <FooterLink href="/school">School Login</FooterLink>
                            <FooterLink href="/login">Parent Portal</FooterLink>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-(--text) mb-6 text-[11px] uppercase tracking-[0.2em] opacity-50">Infrastructure</h4>
                        <ul className="space-y-4">
                            <FooterLink href="/features#administration">Administration</FooterLink>
                            <FooterLink href="/features#academics">Academics</FooterLink>
                            <FooterLink href="/features#finances">Finances</FooterLink>
                            <FooterLink href="/features#communication">Communication</FooterLink>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-bold text-(--text) mb-6 text-[11px] uppercase tracking-[0.2em] opacity-50">Global Support</h4>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3 text-sm text-(--text-muted) font-semibold">
                                <Mail className="w-4 h-4 text-(--primary) shrink-0 mt-0.5" />
                                <span>appitor.official@gmail.com</span>
                            </li>
                            <li className="flex items-start gap-3 text-sm text-(--text-muted) font-semibold">
                                <Phone className="w-4 h-4 text-(--primary) shrink-0 mt-0.5" />
                                <span>+91 70047 07500</span>
                            </li>
                            <li className="flex items-start gap-4 text-sm text-(--text-muted) font-semibold">
                                <MapPin className="w-4 h-4 text-(--primary) shrink-0 mt-0.5" />
                                <span className="leading-snug">ISM Campus<br />M. M. Colony, Siwan, Bihar</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-5 border-t border-(--border) flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-[11px] font-semibold text-(--text-muted)">
                        &copy; {currentYear} Appitor ERP. Institutional Grade Architecture.
                    </p>
                    <div className="flex items-center gap-8 text-[11px] font-semibold text-(--text-muted)/60">
                        <Link href="/plans" className="hover:text-(--primary) transition-colors">Service Plans</Link>
                        <Link href="/terms" className="hover:text-(--primary) transition-colors">Terms of Service</Link>
                        <Link href="/privacy" className="hover:text-(--primary) transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

function SocialLink({ href, icon }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-(--bg-card) border border-(--border) text-(--text-muted) hover:bg-(--primary) hover:text-white transition-all duration-300 shadow-sm hover:-translate-y-1"
        >
            {icon}
        </a>
    );
}

function FooterLink({ href, children }) {
    return (
        <li>
            <Link
                href={href}
                className="text-sm font-semibold text-(--text-muted) hover:text-(--primary) transition-colors block"
            >
                {children}
            </Link>
        </li>
    );
}
