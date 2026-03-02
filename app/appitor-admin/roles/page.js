"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Pencil, UserCheck } from "lucide-react";
import { fetchRoles } from "@/lib/admin/roleService";
import AddRoleModal from "./AddRoleModal";
import { useRouter } from "next/navigation";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function RolesPage() {
  const { setLoading } = useSuperAdmin();
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchRoles().then(setRoles);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
        <div>
          <p className="text-[10px] font-bold text-(--primary) uppercase mb-0.5">Authorization</p>
          <h1 className="text-2xl font-bold text-[var(--text)] leading-none">Security Profiles</h1>
        </div>
        <button
          className="group flex items-center gap-2 px-6 py-3 bg-(--primary) hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-(--primary)/20 transition-all active:scale-95"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-xs uppercase">Initialize Role</span>
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((r) => (
          <div key={r.id} className="group relative p-8 rounded-[1.5rem] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-xl hover:border-(--primary)/30 transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-(--primary)/5 blur-[60px] rounded-full translate-x-12 -translate-y-12 group-hover:bg-(--primary)/10 transition-colors" />

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className={`p-3 rounded-xl border transition-all duration-300 group-hover:scale-110 ${r.system ? 'bg-(--warning)/10 text-(--warning) border-(--warning)/20' : 'bg-(--primary)/10 text-(--primary) border-(--primary)/20'}`}>
                <ShieldCheck size={28} />
              </div>
              {!r.system && (
                <button
                  className="p-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-(--primary) hover:text-(--primary) transition-all duration-300 shadow-sm"
                  onClick={() => router.push(`/appitor-admin/roles/${r.id}/edit`)}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>

            <div className="mb-6 relative z-10">
              <h3 className="text-xl font-bold text-[var(--text)] leading-tight mb-2">{r.name}</h3>
              <div className="flex items-center gap-3">
                <div className={`px-2 py-0.5 rounded-lg text-[8px] font-bold uppercase ${r.system ? 'bg-(--warning)/10 text-(--warning)' : 'bg-[var(--bg)] text-[var(--text-muted)] border border-[var(--border)] opacity-80'}`}>
                  {r.system ? "System" : "Custom"}
                </div>
                <div className="w-1 h-1 rounded-full bg-[var(--border)]" />
                <span className="text-[9px] font-bold uppercase opacity-80">{r.permissions?.length || 0} Perms</span>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border)] flex items-center justify-between relative z-10">
              <div className="flex -space-x-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`w-8 h-8 rounded-lg border-2 border-[var(--bg-card)] flex items-center justify-center text-[9px] font-bold text-white shadow-sm ${['bg-(--primary)', 'bg-(--accent)', 'bg-(--danger)'][i]}`}>
                    {String.fromCharCode(65 + i)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-lg bg-[var(--bg)] border-2 border-[var(--bg-card)] flex items-center justify-center text-[8px] font-bold text-[var(--text-muted)] shadow-sm">
                  +12
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase opacity-80">
                <UserCheck size={12} className="text-(--accent)" />
                Matrix
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddRoleModal open={open} onClose={async () => {
        setOpen(false);
        setLoading(true);
        const data = await fetchRoles();
        setRoles(data);
        setLoading(false);
      }} />
    </div>
  );
}
