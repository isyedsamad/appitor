"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, GraduationCap, Lock, LockOpen } from "lucide-react";
import { fetchOrganizations } from "@/lib/admin/organizationService";
import AddOrganizationModal from "./AddOrganizationModal";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import { useTheme } from "next-themes";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";

export default function OrganizationsPage() {
  const { theme } = useTheme();
  const { setLoading } = useSuperAdmin();
  const [orgs, setOrgs] = useState([]);
  const [open, setOpen] = useState(false);
  const disableOrg = async (orgId, isActive) => {
    setLoading(true);
    try {
      await secureAxios.post('/api/admin/organizations/lock_unlock', {orgId, isActive});
      toast.success('Organization updated!', {
        theme: 'colored'
      })
      const data = await fetchOrganizations();
      setOrgs(data);
    } catch (error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchOrganizations().then(setOrgs);
  }, []);
  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap size={20} />
            Organizations
          </h1>
          <p className="text-sm text-muted">
            Manage school groups, trusts, and owners
          </p>
        </div>

        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add Organization
        </button>
      </div>
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-(--bg) border-b border-(--border)">
              <tr className="text-muted text-left">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {orgs.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-(--border) last:border-0 hover:bg-(--bg)"
                >
                  <td className="px-4 py-3 font-medium">
                    {o.name}
                    {o.ownerNote && (
                      <p className="text-xs text-muted">
                        {o.ownerNote}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs uppercase font-semibold
                      ${o.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {o.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {o.status == 'active' ? (
                      <button className="action-btn" onClick={() => {disableOrg(o.id, true)}}><Lock size={16} /></button>
                    ) : (
                      <button className="action-btn" onClick={() => {disableOrg(o.id, false)}}><LockOpen size={16} /></button>
                    )}
                  </td>
                </tr>
              ))}

              {orgs.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No organizations created yet
                  </td>
                </tr>
              )}
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
