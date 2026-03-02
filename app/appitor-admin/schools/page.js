"use client";

import { useEffect, useState } from "react";
import { fetchSchools } from "@/lib/admin/schoolService";
import { Plus, Eye, Pencil, Lock, LockOpen, ShieldCheck } from "lucide-react";
import AddSchoolModal from "./AddSchoolModal";
import Link from "next/link";
import { fetchOrganizations } from "@/lib/admin/organizationService";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function SchoolsPage() {
  const { setLoading } = useSuperAdmin();
  const [schools, setSchools] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingSchool, setLoadingSchool] = useState(true);
  const [orgs, setOrgs] = useState([]);

  const changeStatus = async (schoolId, isActive) => {
    setLoading(true);
    try {
      await secureAxios.post('/api/admin/school/lock_unlock', { schoolId, isActive });
      toast.success('Node synchronized!', { theme: 'colored' });
      const data = await fetchSchools();
      setSchools(data);
    } catch (error) {
      toast.error('Error: ' + error, { theme: 'colored' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchSchools();
        setSchools(data);
        const orgsList = await fetchOrganizations();
        setOrgs(orgsList);
      } catch (err) {
        console.error("Load failed:", err);
      } finally {
        setLoadingSchool(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
        <div>
          <p className="text-[10px] font-bold text-(--primary) uppercase mb-0.5">Fleet</p>
          <h1 className="text-2xl font-bold text-[var(--text)] leading-none">Educational Nodes</h1>
        </div>
        <button
          className="group flex items-center gap-2 px-6 py-3 bg-(--primary) hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-(--primary)/20 transition-all active:scale-95"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-xs uppercase">Provision Node</span>
        </button>
      </div>

      <div className="bg-[var(--bg-card)] rounded-[1.5rem] border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/50 text-[var(--text-muted)] uppercase text-[9px] font-bold text-left">
                <th className="px-6 py-4">Parent Entity</th>
                <th className="px-6 py-4">Institutional Profile</th>
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Region</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loadingSchool && (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-(--primary)/20 border-t-(--primary) rounded-full animate-spin" />
                      <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">Synchronizing...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loadingSchool && schools.map((s) => (
                <tr key={s.id} className="group hover:bg-[var(--bg)]/80 transition-all duration-300">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-(--primary)/30 group-hover:bg-(--primary) transition-colors" />
                      <span className="font-bold text-[var(--text-muted)] text-[10px] uppercase truncate max-w-[140px] opacity-80">{s.orgName || "Independent"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-bold text-[var(--text)] text-xs mb-0.5">{s.name}</div>
                      <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase opacity-70 leading-none">{s.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] font-bold text-[10px] text-[var(--text)] uppercase">
                      {s.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-muted)] font-bold text-[10px] uppercase opacity-80">
                    {s.city}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'active' ? 'bg-(--accent) animate-pulse' : 'bg-(--danger)'}`} />
                      <span className={`text-[9px] font-bold uppercase ${s.status === 'active' ? 'text-(--accent)' : 'text-(--danger)'}`}>
                        {s.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 transition-all duration-300">
                      <button
                        className={`p-2 rounded-lg border transition-all duration-300 ${s.status === 'active' ? 'border-(--danger)/20 bg-(--danger-soft) text-(--danger) hover:bg-(--danger) hover:text-white' : 'border-(--accent)/20 bg-(--accent-soft) text-(--accent) hover:bg-(--accent) hover:text-white'}`}
                        onClick={() => changeStatus(s.id, s.status === 'active')}
                      >
                        {s.status === 'active' ? <Lock size={14} /> : <LockOpen size={14} />}
                      </button>
                      <Link href={`/appitor-admin/schools/${s.id}`} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-(--primary) hover:text-(--primary) hover:bg-(--primary-soft) transition-all duration-300">
                        <Eye size={14} />
                      </Link>
                      <Link href={`/appitor-admin/schools/${s.id}`} className="p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-(--primary) hover:text-(--primary) hover:bg-(--primary-soft) transition-all duration-300">
                        <Pencil size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddSchoolModal open={open} onClose={async () => {
        setOpen(false);
        setLoading(true);
        const data = await fetchSchools();
        setSchools(data);
        setLoading(false);
      }} orgList={orgs} />
    </div>
  );
}
