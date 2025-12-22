"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { X, Save } from "lucide-react";
import { fetchRoles } from "@/lib/admin/roleService";
import { fetchSchools } from "@/lib/admin/schoolService";
import secureAxios from "@/lib/secureAxios";
import { fetchBranches } from "@/lib/admin/branchService";
import { toast } from "react-toastify";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function AddUserModal({ open, onClose }) {
  const { setLoading } = useSuperAdmin();
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [branches, setBranches] = useState([]);
  const [firstBranch, setFirstBranch] = useState('');
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    roleId: "",
    role: "",
    branchIds: [],
    branchNames: [],
    schoolId: "",
    schoolCode: "",
    currentBranch: "",
  });
  useEffect(() => {
    fetchRoles().then(setRoles);
    fetchSchools().then(setSchools);
  }, []);
  useEffect(() => {
    if (form.schoolId) {
      fetchBranches().then((all) =>
        setBranches(all.filter(b => b.schoolId === form.schoolId))
      );
    }
  }, [form.schoolId]);
  if (!open) return null;
  async function save() {
    setLoading(true);
    try {
      if(form.branchIds[0] != '*') {
        form.currentBranch = form.branchIds[0];
      }else {
        form.currentBranch = firstBranch;
      }
      await secureAxios.post("/api/admin/users/create", form);
      toast.success('User added successfully!', {
        theme: 'colored'
      })
      onClose();
    } catch (error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-0">
        <div className="flex justify-between bg-(--bg) rounded-t-xl items-center px-6 py-4 border-b border-(--border)">
          <h2 className="font-semibold">Add User</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <Input
            label="Full Name"
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Username"
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
            />
            <Input
              label="Password"
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
          </div>
          <Select
            label="School"
            onChange={(e) =>
              setForm({ ...form, schoolId: e.target.value, schoolCode: e.target.value != '' ? e.target.options[e.target.selectedIndex].text.split(' (')[1].replace(')', '') : '' })
            }
          >
            <option value="">Select school</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </Select>
          <div className="space-y-2">
            <label className="text-xs text-muted">Branch Access</label>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                className="w-4 h-3 ml-1 accent-(--primary)"
                checked={form.branchIds.includes("*")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    branchIds: e.target.checked ? ["*"] : [],
                  })
                }
              />
              All Branches
            </label>
            {!form.branchIds.includes("*") && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {branches.map((b) => (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 p-2 border border-(--border) rounded-md"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-3 ml-1 accent-(--primary)"
                      checked={form.branchIds.includes(b.id)}
                      onChange={(e) => {
                        setFirstBranch(b.id);
                        const next = e.target.checked
                          ? [...form.branchIds, b.id]
                          : form.branchIds.filter(id => id !== b.id);
                        const nextName = e.target.checked
                          ? [...form.branchNames, b.name]
                          : form.branchNames.filter(name => name !== b.name);
                        setForm({ ...form, branchIds: next, branchNames: nextName });
                      }}
                    />
                    <span className="text-sm flex-1">{b.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <Select
            label="Role"
            onChange={(e) =>
              setForm({ ...form, roleId: e.target.value, role: e.target.options[e.target.selectedIndex].text })
            }
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex justify-end px-6 py-4 mt-3 border-t border-(--border)">
          <button className="btn-primary" onClick={save}>
            <Save size={16} />
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <input {...props} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <select {...props}>{children}</select>
    </div>
  );
}
