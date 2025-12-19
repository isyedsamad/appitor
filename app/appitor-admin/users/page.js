"use client";

import { useEffect, useState } from "react";
import { Plus, User, ShieldCheck } from "lucide-react";
import { fetchUsers } from "@/lib/admin/userService";
import AddUserModal from "./AddUserModal";
import { useTheme } from "next-themes";

export default function UsersPage() {
    const {theme} = useTheme();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  return (
    <div className="space-y-5">
      
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold">Users</h1>
          <p className="text-sm text-muted">
            Manage system users and access control
          </p>
        </div>

        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add User
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[var(--bg)] border-b border-(--border)">
              <tr className="text-muted text-left">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Branches</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-(--border) last:border-0 hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-3 font-medium">
                    <span className="flex items-center gap-2">
                    <User size={16} />
                    {u.username}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-semibold">
                    {u.schoolCode}
                  </td>

                  <td className="px-4 py-3 text-sm">
                    {u.branchIds?.includes("*")
                      ? "All Branches"
                      : u.branchNames?.join(", ") || "—"}
                  </td>

                  <td className="px-4 py-3">
                    <span className="badge-primary">
                      {u.role || "—"}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs capitalize 
                        ${u.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}
                    `}
                    >
                      {u.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted">
                    {u.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
