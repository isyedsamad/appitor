"use client";

import { Menu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function Navbar({ onMenuClick }) {
  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--bg-card)]">
      <div className="flex items-center justify-between h-full px-4">
        
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md border border-[var(--border)]"
          >
            <Menu size={18} />
          </button>

          <span className="font-semibold tracking-tight">
            Appitor Admin
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
