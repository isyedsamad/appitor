import { adminNav } from "@/lib/admin/adminNav";
import SidebarItem from "./SidebarItem";
import { Layout } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex lg:flex-col w-64 bg-[var(--bg-card)] text-[var(--text)] border-r border-[var(--border)] shadow-xl transition-all duration-300">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-[var(--border)]">
        <div className="bg-(--primary) p-1.5 rounded-lg shadow-lg shadow-(--primary)/20">
          <Layout size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-[var(--text)]">Appitor</h1>
          <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase leading-none">Super Admin</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-6">
        <div className="mb-3 px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase opacity-60">
          System Control
        </div>
        <nav className="space-y-1">
          {adminNav.map((item) => (
            <SidebarItem key={item.href} {...item} isPremium />
          ))}
        </nav>
      </div>

      <div className="p-3 mt-auto border-t border-[var(--border)]">
        <div className="bg-[var(--bg)] rounded-2xl p-3 flex items-center gap-3 border border-[var(--border)] transition-all">
          <div className="w-8 h-8 rounded-xl bg-(--primary) flex items-center justify-center text-white font-bold text-[10px] shadow-lg shadow-(--primary)/10">
            SA
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-[var(--text)] truncate">Administrator</p>
            <p className="text-[9px] font-bold text-[var(--text-muted)] truncate uppercase">Node Zero</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
