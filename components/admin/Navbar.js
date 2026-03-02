"use client";

import { LogOut, Menu, Bell } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Navbar({ onMenuClick }) {
  const logout = () => {
    signOut(auth);
  }
  return (
    <header className="h-16 border-b border-[var(--border)] bg-[var(--bg-card)]/80 backdrop-blur-xl sticky top-0 transition-all duration-300">
      <div className="flex items-center justify-between h-full px-6">

        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg)] transition-colors"
          >
            <Menu size={18} className="text-[var(--text)]" />
          </button>
          <div className="hidden sm:block">
            <h2 className="text-xs font-bold text-[var(--text)] uppercase">Central Command</h2>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase opacity-60">Intelligence Hub</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg)] border border-[var(--border)]">
            <div className="w-1.5 h-1.5 rounded-full bg-(--accent) animate-pulse shadow-[0_0_8px_var(--accent)]" />
            <span className="text-[8px] font-bold text-[var(--text-muted)] uppercase">Active</span>
          </div>

          <div className="h-5 w-[1px] bg-[var(--border)] mx-1" />

          <ThemeToggle />

          <button className="p-2 text-[var(--text-muted)] hover:text-(--primary) hover:bg-(--primary-soft) rounded-lg transition-all">
            <Bell size={18} />
          </button>

          <button onClick={logout}
            className="group flex items-center gap-2 p-1.5 pr-4 border border-[var(--border)] rounded-xl bg-[var(--bg-card)] hover:border-(--danger)/30 hover:bg-(--danger-soft) transition-all shadow-sm"
          >
            <div className="p-1.5 rounded-lg bg-[var(--bg)] group-hover:bg-(--danger)/10 group-hover:text-(--danger) transition-colors">
              <LogOut size={14} />
            </div>
            <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase group-hover:text-(--danger) transition-colors">Exit</span>
          </button>
        </div>
      </div>
    </header>
  );
}
