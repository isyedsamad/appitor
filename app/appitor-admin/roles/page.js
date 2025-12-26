"use client";

import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Pencil } from "lucide-react";
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
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold">Roles</h1>
          <p className="text-sm text-muted">
            Manage access control and permissions
          </p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add Role
        </button>
      </div>
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-(--bg) border-b border-(--border)">
              <tr className="text-muted text-left">
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Permissions</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-(--border) last:border-0 hover:bg-(--bg)"
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                        <ShieldCheck size={16} /> {r.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-primary">
                      {r.system ? "System" : "Custom"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.permissions?.length || 0}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {r.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {!r.system && (
                        <button
                          onClick={() =>
                            router.push(`/appitor-admin/roles/${r.id}/edit`)
                          }
                          className="p-2 border border-(--border) rounded-md hover:bg-(--primary-soft)"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
