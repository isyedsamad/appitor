"use client";

import { useState } from "react";
import secureAxios from "@/lib/secureAxios";
import { X, Save } from "lucide-react";

export default function AddOrganizationModal({ open, onClose }) {
  const [form, setForm] = useState({
    name: "",
    ownerNote: "",
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function save() {
    if (!form.name.trim()) return;

    setSaving(true);
    await secureAxios.post("/api/admin/organizations/create", form);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-0">
        <div className="flex justify-between items-center px-6 py-4 border-b border-(--border) bg-(--bg)">
          <h2 className="font-semibold">Add Organization</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <Input
            label="Organization Name"
            placeholder="DAV Group"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />

          <Input
            label="Owner / Trust (optional)"
            placeholder="DAV Trust"
            value={form.ownerNote}
            onChange={(e) =>
              setForm({ ...form, ownerNote: e.target.value })
            }
          />
        </div>

        <div className="flex justify-end px-6 py-4 mt-2 border-t border-(--border)">
          <button
            className="btn-primary"
            onClick={save}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Create Organization"}
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
