"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarItem({ icon: Icon, label, href, isPremium }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  if (isPremium) {
    return (
      <Link
        href={href}
        className={`
          flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] font-bold
          transition-all duration-300 group relative uppercase
          ${isActive
            ? "bg-(--primary) text-white shadow-lg shadow-(--primary)/20"
            : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"}
        `}
      >
        <Icon
          size={16}
          className={`transition-colors duration-300 ${isActive ? "text-white" : "text-[var(--text-muted)] group-hover:text-(--primary)"}`}
        />
        <span>{label}</span>
        {isActive && (
          <div className="absolute right-2.5 w-1 h-1 rounded-full bg-white animate-pulse" />
        )}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-bold uppercase
        transition-all duration-300
        ${isActive
          ? "bg-(--primary-soft) text-(--primary)"
          : "text-[var(--text-muted)] hover:bg-[var(--bg)] hover:text-(--primary)"}
      `}
    >
      <Icon size={16} />
      <span>{label}</span>
    </Link>
  );
}
