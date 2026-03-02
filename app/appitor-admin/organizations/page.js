"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, Lock, LockOpen } from "lucide-react";
import { fetchOrganizations } from "@/lib/admin/organizationService";
import AddOrganizationModal from "./AddOrganizationModal";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";

export default function OrganizationsPage() {
  const { setLoading } = useSuperAdmin();
  const [orgs, setOrgs] = useState([]);
  const [open, setOpen] = useState(false);

  const disableOrg = async (orgId, isActive) => {
    setLoading(true);
    try {
      await secureAxios.post("/api/admin/organizations/lock_unlock", { orgId, isActive });
      toast.success("Network status updated!", { theme: "colored" });
      const data = await fetchOrganizations();
      setOrgs(data);
    } catch (error) {
      toast.error("Error: " + error, { theme: "colored" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations().then(setOrgs);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
        <div>
          <p className="text-[10px] font-bold text-(--primary) uppercase mb-0.5">Architecture</p>
          <h1 className="text-2xl font-bold text-[var(--text)] leading-none">Enterprise Network</h1>
        </div>
        <button
          className="group flex items-center gap-2 px-6 py-3 bg-(--primary) hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-(--primary)/20 transition-all active:scale-95"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-xs uppercase">Register Entity</span>
        </button>
      </div>

      <div className="bg-[var(--bg-card)] rounded-[1.5rem] border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/50 text-[var(--text-muted)] uppercase text-[9px] font-bold text-left">
                <th className="px-6 py-4">Corporate Structure</th>
                <th className="px-6 py-4 text-center">Operational Health</th>
                <th className="px-6 py-4 text-center">Provisioned</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orgs.map((o) => (
                <tr key={o.id} className="group hover:bg-[var(--bg)]/80 transition-all duration-300">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)] font-bold border border-[var(--border)] group-hover:bg-(--primary) group-hover:text-white group-hover:border-(--primary) transition-all duration-300 shadow-sm">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text)] text-sm mb-0.5">{o.name}</div>
                        {o.ownerNote && (
                          <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase opacity-70 leading-none">
                            {o.ownerNote}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${o.status === 'active' ? 'bg-(--accent) animate-pulse' : 'bg-(--danger)'}`} />
                      <span className={`text-[9px] font-bold uppercase ${o.status === 'active' ? 'text-(--accent)' : 'text-(--danger)'}`}>
                        {o.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-[var(--text-muted)] font-bold text-[10px] uppercase opacity-80">
                    {o.createdAt?.toDate?.().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <button
                        className={`p-2 rounded-lg border transition-all duration-300 ${o.status === 'active' ? 'border-(--danger)/20 bg-(--danger-soft) text-(--danger) hover:bg-(--danger) hover:text-white' : 'border-(--accent)/20 bg-(--accent-soft) text-(--accent) hover:bg-(--accent) hover:text-white'}`}
                        onClick={() => disableOrg(o.id, o.status === 'active')}
                      >
                        {o.status === 'active' ? <Lock size={14} /> : <LockOpen size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddOrganizationModal open={open} onClose={async () => {
        setLoading(true);
        const data = await fetchOrganizations();
        setOrgs(data);
        setLoading(false);
        setOpen(false);
      }} />
    </div>
  );
}
