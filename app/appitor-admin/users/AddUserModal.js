"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { X, Save } from "lucide-react";
import { fetchRoles } from "@/lib/admin/roleService";
import { fetchSchools } from "@/lib/admin/schoolService";

export default function AddUserModal({ open, onClose }) {
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    username: "",
    roleId: "",
    role: "",
    schoolId: "",
  });

  useEffect(() => {
    fetchRoles().then(setRoles);
    fetchSchools().then(setSchools);
  }, []);

  if (!open) return null;

  async function save() {
    await axios.post("/api/admin/users/create", form);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-0">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-(--border)">
          <h2 className="font-semibold">Add User</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <Input
            label="Username"
            onChange={(e) =>
              setForm({ ...form, username: e.target.value })
            }
          />

          <Select
            label="School"
            onChange={(e) =>
              setForm({ ...form, schoolId: e.target.value })
            }
          >
            <option value="">Select school</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>

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

        {/* Footer */}
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
