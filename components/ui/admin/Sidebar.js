import { adminNav } from "@/lib/nav/adminNav";
import SidebarItem from "./SidebarItem";

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r border-[var(--border)] bg-[var(--bg-card)]">
      
      {/* Brand */}
      <div className="h-14 flex items-center px-4 font-semibold border-b border-[var(--border)]">
        Appitor
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {adminNav.map((item) => (
          <SidebarItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
