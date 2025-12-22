"use client";

import { useEffect, useState } from "react";
import { Plus, GitBranch, Pencil, Lock, LockOpen } from "lucide-react";
import { fetchBranches } from "@/lib/admin/branchService";
import AddBranchModal from "./AddBranchModal";
import Link from "next/link";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { useTheme } from "next-themes";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

export default function BranchesPage() {
  const {theme} = useTheme();
  const { setLoading } = useSuperAdmin();
  const [branches, setBranches] = useState([]);
  const [open, setOpen] = useState(false);
  const changeStatus = async (schoolId, branchId, isActive) => {
    setLoading(true);
    try {
      await secureAxios.post('/api/admin/branches/lock_unlock', {schoolId, branchId, isActive});
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
          <h1 className="text-xl font-semibold flex items-center gap-2">
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
              <tr className="text-muted text-left">
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-(--border) last:border-0 hover:bg-(--bg)"
                >
                  <td className="px-4 py-3 font-medium">
                    {b.appitorCode} - {b.name}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {b.branchCode}
                  </td>
                  <td className="px-4 py-3">
                    {b.city}, {b.state}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold uppercase ${
                        b.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {b.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {b.status == 'active' ? (
                        <button className="action-btn hover:text-red-600" onClick={() => {changeStatus(b.schoolId, b.id, true)}}><Lock size={16} /></button>
                      ) : (
                        <button className="action-btn hover:text-green-600" onClick={() => {changeStatus(b.schoolId, b.id, false)}}><LockOpen size={16} /></button>
                      )}
                      <Link href={`/appitor-admin/schools/${b.id}/edit`}><ActionButton icon={Pencil} /></Link>
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
