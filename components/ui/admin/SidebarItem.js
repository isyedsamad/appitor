"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarItem({ icon: Icon, label, href }) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-3 py-2 rounded-md text-sm
        transition-colors
        ${isActive
          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
          : "hover:bg-[var(--primary-soft)]"}
      `}
    >
      <Icon size={18} />
      <span>{label}</span>
    </Link>
  );
}
