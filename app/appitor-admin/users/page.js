"use client";

import { useEffect, useState } from "react";
import { Plus, User, ShieldCheck, Lock, LockOpen, Pencil } from "lucide-react";
import { fetchUsers } from "@/lib/admin/userService";
import AddUserModal from "./AddUserModal";
import { useTheme } from "next-themes";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import EditUserModal from "./EditUserModal";

export default function UsersPage() {
  const { setLoading } = useSuperAdmin();
  const {theme} = useTheme();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const changeStatus = async (userId, isActive) => {
    setLoading(true);
    try {
      await secureAxios.post('/api/admin/users/lock_unlock', {userId, isActive});
      toast.success('user status updated!', {
        theme: 'colored'
      })
      const data = await fetchUsers();
      setUsers(data);
    } catch (error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);
  useEffect(() => {
    if(!currentUser) setOpenEdit(true);
  }, [currentUser])
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
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Branches</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-(--border) last:border-0 hover:bg-(--bg)"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted">{u.username}@{u.schoolCode.toLowerCase()}.appitor</div>
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
                      className={`px-2 py-1 rounded-md text-xs font-medium uppercase 
                        ${u.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}
                    `}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {u.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {u.status == 'active' ? (
                        <button className="action-btn hover:text-red-600" onClick={() => {changeStatus(u.id, true)}}><Lock size={16} /></button>
                      ) : (
                        <button className="action-btn hover:text-green-600" onClick={() => {changeStatus(u.id, false)}}><LockOpen size={16} /></button>
                      )}
                      <button className="action-btn hover:text-yellow-400" onClick={() => {setCurrentUser(u)}}><Pencil size={16} /></button>
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
