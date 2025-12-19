"use client";

import { useState } from "react";
import axios from "axios";
import { X, Save } from "lucide-react";
import { PERMISSIONS } from "@/lib/admin/permissions";
import secureAxios from "@/lib/secureAxios";

export default function AddRoleModal({ open, onClose }) {
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState({});
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function save() {
    setSaving(true);
    await secureAxios.post("/api/admin/roles/create", {
      name,
      permissions: Object.keys(permissions).filter((p) => permissions[p]),
    });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-2xl p-0">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-(--border)">
          <h2 className="font-semibold">Create Role</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <Input label="Role Name" onChange={(e) => setName(e.target.value)} />

          {Object.entries(PERMISSIONS).map(([group, perms]) => (
            <div key={group}>
              <h3 className="text-sm font-medium mb-2">{group}</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {perms.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-3 p-2 border border-(--border) rounded-md"
                  >
                    <input
                      type="checkbox"
                      className="w-4 h-3 ml-2 accent-[var(--primary)]"
                      onChange={(e) =>
                        setPermissions({
                          ...permissions,
                          [p]: e.target.checked,
                        })
                      }
                    />
                    <span className="text-sm">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 border-t border-(--border)">
          <button className="btn-primary" onClick={save} disabled={saving}>
            <Save size={16} />
            {saving ? "Saving..." : "Save Role"}
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
