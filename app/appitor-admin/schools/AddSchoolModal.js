"use client";

import { useState } from "react";
import secureAxios from "@/lib/secureAxios";
import { X, Save, Building2, MapPin } from "lucide-react";
import { toast } from "react-toastify";

export default function AddSchoolModal({ open, onClose, orgList }) {
  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    email: "",
    orgId: "",
    orgName: "",
    capacity: 9999,
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function save() {
    if (!form.name || !form.code || !form.email || !form.orgId) {
      toast.error("Required fields missing (Name, Code, Email, Organization)", { theme: "colored" });
      return;
    }
    setSaving(true);
    try {
      await secureAxios.post("/api/admin/create-school", { school: form });
      toast.success("School Node Provisioned!", { theme: "colored" });
      onClose();
    } catch (error) {
      toast.error("Error: " + (error.response?.data?.error || error.message), { theme: "colored" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--bg-card)] w-full max-w-xl rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden relative font-sans">
        <div className="absolute top-0 right-0 w-32 h-32 bg-(--primary)/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />

        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)] relative z-10">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">Provision Node</h2>
            <p className="text-[9px] font-bold text-(--primary) uppercase mt-0.5">Institutional Architecture</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-500 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-hide relative z-10">
          <div className="space-y-3">
            <SectionTitle icon={<Building2 size={12} />} title="Entity Mapping & Profile" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select label="Parent Organization" value={form.orgId} onChange={(e) => {
                const o = orgList.find(x => x.id === e.target.value);
                setForm({ ...form, orgId: e.target.value, orgName: o ? o.name : "" });
              }}>
                <option value="">Select Organization</option>
                {orgList.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
              <Input label="Short Node Code" placeholder="e.g. ISM" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            </div>
            <Input label="Legal School Name" placeholder="e.g. International Heritage School" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <Input label="Administrative Email" placeholder="e.g. admin@school.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />

            <div className="pt-2">
              <SectionTitle icon={<MapPin size={12} />} title="Geographic Coordinates" />
              <Input label="Physical Address" placeholder="e.g. 123 Education Lane, Sector 4" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="City" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                <Input label="State / Province" placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-5 bg-[var(--bg)] border-t border-[var(--border)] flex justify-end items-center relative z-10">
          <button
            className="px-6 py-2.5 bg-(--primary) text-white rounded-xl font-bold text-[11px] uppercase hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-(--primary)/20 flex items-center gap-2"
            onClick={save}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Provisioning..." : "Finalize Node"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-(--primary)">{icon}</div>
      <h3 className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{title}</h3>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase ml-1 opacity-70">{label}</label>
      <input className="input" {...props} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase ml-1 opacity-70">{label}</label>
      <div className="relative">
        <select className="input appearance-none outline-none cursor-pointer" {...props}>
          {children}
        </select>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 9-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );
}
