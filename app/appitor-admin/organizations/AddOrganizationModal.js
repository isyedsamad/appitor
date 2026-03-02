"use client";

import { useState } from "react";
import secureAxios from "@/lib/secureAxios";
import { X, Save, Building2 } from "lucide-react";
import { toast } from "react-toastify";

export default function AddOrganizationModal({ open, onClose }) {
  const [form, setForm] = useState({
    name: "",
    ownerNote: "",
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function save() {
    if (!form.name.trim()) {
      toast.error("Organization name is required", { theme: "colored" });
      return;
    }
    setSaving(true);
    try {
      await secureAxios.post("/api/admin/organizations/create", form);
      toast.success("Organization registered successfully!", { theme: "colored" });
      onClose();
    } catch (error) {
      toast.error("Error creating organization", { theme: "colored" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--bg-card)] w-full max-w-md rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden relative font-sans">
        <div className="absolute top-0 right-0 w-24 h-24 bg-(--primary)/5 blur-3xl rounded-full translate-x-10 -translate-y-10" />

        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)] relative z-10">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">Register Entity</h2>
            <p className="text-[9px] font-bold text-(--primary) uppercase mt-0.5">Corporate Provisioning</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-500 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-5 relative z-10">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 bg-(--primary)/10 text-(--primary) rounded-2xl flex items-center justify-center border border-(--primary)/20 shadow-sm">
              <Building2 size={24} />
            </div>
          </div>

          <Input
            label="Legal Organization Name"
            placeholder="e.g. Appitor Global Group"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <Input
            label="Associated Owner / Trust (Optional)"
            placeholder="e.g. NISA Education Trust"
            value={form.ownerNote}
            onChange={(e) => setForm({ ...form, ownerNote: e.target.value })}
          />
        </div>

        <div className="px-8 py-5 bg-[var(--bg)] border-t border-[var(--border)] flex justify-end items-center relative z-10">
          <button
            className="px-6 py-2.5 bg-(--primary) text-white rounded-xl font-bold text-[11px] uppercase hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-(--primary)/20 flex items-center gap-2"
            onClick={save}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Provisioning..." : "Finalize Registration"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase ml-1 opacity-70">{label}</label>
      <input className="input" {...props} />
    </div>
  );
}
