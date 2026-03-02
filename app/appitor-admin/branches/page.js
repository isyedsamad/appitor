"use client";

import { useEffect, useState } from "react";
import { Plus, GitBranch, Pencil, Lock, LockOpen } from "lucide-react";
import { fetchBranches } from "@/lib/admin/branchService";
import AddBranchModal from "./AddBranchModal";
import EditBranchModal from "./EditBranchModal";
import Link from "next/link";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { useTheme } from "next-themes";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

export default function BranchesPage() {
  const { theme } = useTheme();
  const { setLoading } = useSuperAdmin();
  const [branches, setBranches] = useState([]);
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const changeStatus = async (schoolId, branchId, isActive) => {
    setLoading(true);
    try {
      await secureAxios.post('/api/admin/branches/lock_unlock', { schoolId, branchId, isActive });
      toast.success('Branch updated!', {
        theme: 'colored'
      })
      const data = await fetchBranches();
      setBranches(data);
    } catch (error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchBranches().then(setBranches);
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <GitBranch size={20} />
            Branches
          </h1>
          <p className="text-sm text-muted">
            Manage physical campuses under schools
          </p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add Branch
        </button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[var(--bg)] border-b border-(--border)">
              <tr className="text-[10px] font-bold uppercase text-muted text-left tracking-widest">
                <th className="px-4 py-4">Branch Detail</th>
                <th className="px-4 py-4">Code</th>
                <th className="px-4 py-4">Location</th>
                <th className="px-4 py-4">Tactical Plan</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-(--border) last:border-0 hover:bg-(--bg)"
                >
                  <td className="px-4 py-3">
                    <p className="font-bold text-(--text)">{b.name}</p>
                    <p className="text-[10px] text-muted font-bold uppercase">{b.appitorCode} Context</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-xs text-muted">
                    {b.branchCode}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {b.city}, {b.state}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${b.plan === 'plus' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                      b.plan === 'connect' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                      {b.plan || 'core'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${b.status == 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {b.status == 'active' ? (
                        <button className="action-btn text-rose-500 border-rose-200 hover:bg-rose-50" onClick={() => { changeStatus(b.schoolId, b.id, true) }}><Lock size={14} /></button>
                      ) : (
                        <button className="action-btn text-emerald-500 border-emerald-200 hover:bg-emerald-50" onClick={() => { changeStatus(b.schoolId, b.id, false) }}><LockOpen size={14} /></button>
                      )}
                      <button
                        className="action-btn text-(--primary) border-(--primary)/20 hover:bg-(--primary-soft)"
                        onClick={() => {
                          setSelectedBranch(b);
                          setOpenEdit(true);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {branches.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No branches created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddBranchModal open={open} onClose={async () => {
        setOpen(false);
        setLoading(true);
        const data = await fetchBranches();
        setBranches(data);
        setLoading(false);
      }} />
      <EditBranchModal
        open={openEdit}
        branch={selectedBranch}
        onClose={() => setOpenEdit(false)}
        onUpdate={async () => {
          setLoading(true);
          const data = await fetchBranches();
          setBranches(data);
          setLoading(false);
        }}
      />
    </div>
  );
}


function ActionButton({ icon: Icon }) {
  return (
    <button
      className="p-2 rounded-md border border-(--border)
                 hover:bg-(--primary-soft) hover:text-yellow-500
                 transition"
    >
      <Icon size={16} />
    </button>
  );
}
