import Link from "next/link";

export default function SidebarItem({ item, collapsed }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`
        flex items-center
        rounded-lg px-3 py-2
        text-sm font-medium
        text-[var(--text-muted)]
        hover:bg-[var(--primary-soft)]
        hover:text-[var(--primary)]
        transition
      `}
    >
      {/* Text */}
      {!collapsed && (
        <span className="flex-1 truncate">
          {item.label}
        </span>
      )}

      {/* Icon (always right) */}
      <Icon size={18} className="shrink-0" />
    </Link>
  );
}
