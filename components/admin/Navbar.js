"use client";

import { LogOut, Menu } from "lucide-react";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Navbar({ onMenuClick }) {
  return (
    <header className="h-14 border-b border-(--border) bg-(--bg-card)">
      <div className="flex items-center justify-between h-full px-6">
        
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md border border-(--border)"
          >
            <Menu size={18} />
          </button>

          <span className="font-semibold tracking-tight">
            Admin Panel
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            className="p-2 border border-(--border) rounded-md bg-(--bg-card) hover:text-(--danger)"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
