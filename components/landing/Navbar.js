"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import Image from "next/image";

const navLinks = [
    { name: "Home", href: "/" },
    { name: "Features", href: "/features" },
    { name: "Plans", href: "/plans" },
    { name: "Contact", href: "/contact" },
];

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme } = useTheme();
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    return (
        <>
            <motion.nav
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "fixed top-2 md:top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-8xl transition-all duration-300",
                    scrolled
                        ? "bg-(--bg-card)/70 backdrop-blur-xl border border-(--border) py-3 rounded-2xl shadow-lg"
                        : "bg-transparent py-5"
                )}
            >
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        {/* <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#e45011] to-[#f97316] flex items-center justify-center text-white shadow-lg shadow-[#e45011]/20 transition-transform duration-300 group-hover:scale-105">
                            <span className="font-bold text-xl italic tracking-tighter">A</span>
                        </div> */}
                        <Image src="/logo.png" alt="Logo" width={25} height={25} />
                        <span className="font-bold text-lg tracking-tight text-(--text)">Appitor</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-10">
                        <div className="flex items-center gap-6">
                            {navLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={cn(
                                            "text-sm font-medium transition-all relative px-1 py-0.5",
                                            isActive ? "text-(--primary)" : "text-(--text-muted) hover:text-(--text)"
                                        )}
                                    >
                                        {link.name}
                                        {isActive && (
                                            <motion.span
                                                layoutId="nav-underline"
                                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-(--primary)/30 rounded-full"
                                            />
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-3 pl-8 border-l border-(--border)">
                            {mounted && (
                                <button
                                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                    className="p-2 rounded-xl bg-(--bg-card) border border-(--border) text-(--text-muted) hover:text-(--text) transition-all hover:scale-105 active:scale-95"
                                >
                                    {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                                </button>
                            )}
                            <Link
                                href="/school/"
                                className="text-sm px-3 py-2 font-semibold text-(--text) hover:text-(--primary) hover:bg-(--primary-soft)/50 rounded-xl backdrop-blur-sm transition-all"
                            >
                                Portal Login
                            </Link>
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#e45011] to-[#f97316] rounded-xl hover:shadow-xl hover:shadow-[#e45011]/20 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                Start Free Trial
                                <ChevronRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:hidden">
                        {mounted && (
                            <button
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="p-2 rounded-xl bg-(--bg-card) border border-(--border) text-(--text-muted) hover:text-(--text)"
                            >
                                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                            </button>
                        )}
                        <button
                            className="p-2 text-(--text-muted) hover:text-(--text) transition-colors bg-(--bg-card) border border-(--border) rounded-xl"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </motion.nav>

            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="fixed inset-0 z-40 bg-(--bg)/95 backdrop-blur-xl flex flex-col justify-center items-center gap-8 md:hidden p-8"
                    >
                        <div className="flex flex-col items-center gap-6">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={cn(
                                        "text-2xl font-bold transition-all",
                                        pathname === link.href ? "text-(--primary)" : "text-(--text)"
                                    )}
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        <div className="w-full max-w-xs flex flex-col gap-4">
                            <Link
                                href="/school/"
                                className="w-full py-4 text-center rounded-2xl font-bold border border-(--border) text-(--text) bg-(--bg-card)"
                            >
                                Portal Login
                            </Link>
                            <Link
                                href="/contact"
                                className="w-full py-4 text-center rounded-2xl font-bold bg-gradient-to-r from-[#e45011] to-[#f97316] text-white shadow-lg shadow-[#e45011]/20"
                            >
                                Start Free Trial
                            </Link>
                        </div>

                        <button
                            onClick={() => setMobileMenuOpen(false)}
                            className="absolute top-8 right-8 p-3 rounded-full bg-(--bg-card) border border-(--border) text-(--text)"
                        >
                            <X size={24} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
