"use client";

import { useEffect, useState } from "react";
import { Plus, User, ShieldCheck, Lock, LockOpen, Pencil } from "lucide-react";
import { fetchUsers } from "@/lib/admin/userService";
import AddUserModal from "./AddUserModal";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import EditUserModal from "./EditUserModal";

export default function UsersPage() {
  const { setLoading } = useSuperAdmin();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const changeStatus = async (userId, isActive) => {
    setLoading(true);
    try {
      await secureAxios.post("/api/admin/users/lock_unlock", { userId, isActive });
      toast.success("Security status updated!", { theme: "colored" });
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      toast.error("Error: " + error, { theme: "colored" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-6">
        <div>
          <p className="text-[10px] font-bold text-(--primary) uppercase mb-0.5">Hierarchy</p>
          <h1 className="text-2xl font-bold text-[var(--text)] leading-none">Access Control</h1>
        </div>
        <button
          className="group flex items-center gap-2 px-6 py-3 bg-(--primary) hover:opacity-90 text-white rounded-xl font-bold shadow-lg shadow-(--primary)/20 transition-all active:scale-95"
          onClick={() => setOpen(true)}
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-xs uppercase">Provision Admin</span>
        </button>
      </div>

      <div className="bg-[var(--bg-card)] rounded-[1.5rem] border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg)]/50 text-[var(--text-muted)] uppercase text-[9px] font-bold text-left">
                <th className="px-6 py-4">Identity</th>
                <th className="px-6 py-4">Node</th>
                <th className="px-6 py-4">Access matrix</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="group hover:bg-[var(--bg)]/80 transition-all duration-300"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[var(--bg)] flex items-center justify-center text-[var(--text-muted)] font-bold border border-[var(--border)] group-hover:bg-(--primary) group-hover:text-white group-hover:border-(--primary) transition-all duration-300 shadow-sm text-xs">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-[var(--text)] text-xs mb-0.5">{u.name}</div>
                        <div className="text-[9px] text-[var(--text-muted)] font-bold uppercase opacity-70">
                          {u.username}@{u.schoolCode.toLowerCase()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--border)] group-hover:border-(--primary)/30 transition-colors">
                      <User size={10} className="text-(--primary)" />
                      <span className="font-bold text-[9px] text-[var(--text)] uppercase">{u.schoolCode}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {u.branchIds?.includes("*") ? (
                        <div className="flex items-center gap-1.5 py-1 px-3 rounded-full bg-(--primary)/5 border border-(--primary)/10 text-(--primary) text-[8px] font-bold uppercase">
                          <ShieldCheck size={10} /> Global
                        </div>
                      ) : (
                        <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase leading-relaxed max-w-[180px] truncate opacity-80">
                          {u.branchNames?.join(", ") || "No Restricted Access"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-(--accent) animate-pulse' : 'bg-(--danger)'}`} />
                      <span className={`text-[9px] font-bold uppercase ${u.status === 'active' ? 'text-(--accent)' : 'text-(--danger)'}`}>
                        {u.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 transition-all duration-300">
                      <button
                        className={`p-2 rounded-lg border transition-all duration-300 ${u.status === 'active' ? 'border-(--danger)/20 bg-(--danger-soft) text-(--danger) hover:bg-(--danger) hover:text-white' : 'border-(--accent)/20 bg-(--accent-soft) text-(--accent) hover:bg-(--accent) hover:text-white'}`}
                        onClick={() => changeStatus(u.id, u.status === 'active')}
                      >
                        {u.status === 'active' ? <Lock size={14} /> : <LockOpen size={14} />}
                      </button>
                      <button
                        className="p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-(--primary) hover:text-(--primary) hover:bg-(--primary-soft) transition-all duration-300"
                        onClick={() => {
                          setCurrentUser(u);
                          setOpenEdit(true);
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddUserModal open={open} onClose={async () => {
        setLoading(true);
        setOpen(false);
        const data = await fetchUsers();
        setUsers(data);
        setLoading(false);
      }} />
      <EditUserModal open={openEdit} user={currentUser} onClose={async () => {
        setLoading(true);
        setOpenEdit(false);
        const data = await fetchUsers();
        setUsers(data);
        setLoading(false);
      }} />
    </div>
  );
}
