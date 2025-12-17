"use client";

import { X } from "lucide-react";
import { adminNav } from "@/lib/admin/adminNav";
import SidebarItem from "./SidebarItem";

export default function MobileSidebar({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="absolute left-0 top-0 h-full w-64 bg-[var(--bg-card)] border-r border-[var(--border)]">
        <div className="h-14 flex items-center justify-between px-4 border-b border-[var(--border)]">
          <span className="font-semibold">Appitor</span>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {adminNav.map((item) => (
            <SidebarItem key={item.href} {...item} />
          ))}
        </nav>
      </aside>
    </div>
  );
}
