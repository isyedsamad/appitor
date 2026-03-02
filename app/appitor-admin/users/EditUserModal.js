"use client";

import { useState, useEffect } from "react";
import { X, Save, ShieldCheck, Landmark, GitBranch, UserCog } from "lucide-react";
import { fetchRoles } from "@/lib/admin/roleService";
import { fetchSchools } from "@/lib/admin/schoolService";
import { fetchSchoolBranches } from "@/lib/admin/branchService";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function EditUserModal({ open, onClose, user }) {
  const { setLoading } = useSuperAdmin();
  const [roles, setRoles] = useState([]);
  const [schools, setSchools] = useState([]);
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({
    uid: "",
    id: "",
    name: "",
    username: "",
    roleId: "",
    role: "",
    schoolId: "",
    schoolCode: "",
    branchIds: [],
    branchNames: [],
  });

  useEffect(() => {
    fetchSchools().then(setSchools);
    fetchRoles().then(setRoles);
  }, []);

  useEffect(() => {
    if (form.schoolId) {
      fetchSchoolBranches(form.schoolId).then(setBranches);
    } else {
      setBranches([]);
    }
  }, [form.schoolId]);

  useEffect(() => {
    if (user) {
      setForm({
        uid: user.uid,
        id: user.id,
        name: user.name,
        username: user.username,
        roleId: user.roleId,
        role: user.role,
        schoolId: user.schoolId,
        schoolCode: user.schoolCode,
        branchIds: user.branchIds || [],
        branchNames: user.branchNames || [],
      });
    }
  }, [user]);

  if (!open || !user) return null;

  async function save() {
    if (!form.schoolId || !form.roleId || (form.branchIds.length === 0)) {
      toast.error("Institutional node, Role, and branch access required.", { theme: "colored" });
      return;
    }

    setLoading(true);
    try {
      await secureAxios.post("/api/admin/users/update", form);
      toast.success("Security permissions updated!", { theme: "colored" });
      onClose();
    } catch (error) {
      toast.error("Error updating permissions", { theme: "colored" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden relative font-sans">
        <div className="absolute top-0 right-0 w-24 h-24 bg-(--primary)/5 blur-3xl rounded-full translate-x-10 -translate-y-10" />

        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)] relative z-10">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">Modify Access</h2>
            <p className="text-[9px] font-bold text-(--primary) uppercase mt-0.5">Security Matrix Tuning</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-500 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide relative z-10">
          <section className="flex flex-col items-center justify-center py-6 px-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] text-center">
            <div className="w-12 h-12 bg-(--primary) rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-(--primary)/20 mb-3">
              {form.name?.charAt(0)}
            </div>
            <h3 className="text-base font-bold text-[var(--text)]">{form.name}</h3>
            <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mt-0.5">{form.username}@{form.schoolCode?.toLowerCase()}</p>
          </section>

          <section className="space-y-4">
            <SectionTitle icon={<Landmark size={12} />} title="Institutional Mapping" />
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Primary School Node"
                value={form.schoolId}
                onChange={(e) => {
                  const selected = schools.find(s => s.id === e.target.value);
                  setForm({
                    ...form,
                    schoolId: e.target.value,
                    schoolCode: selected ? selected.code : "",
                    branchIds: [],
                    branchNames: []
                  });
                }}
              >
                <option value="">Select Institutional Group</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                ))}
              </Select>
              <Select
                label="Global Security Role"
                value={form.roleId}
                onChange={(e) => {
                  const r = roles.find(x => x.id === e.target.value);
                  setForm({ ...form, roleId: e.target.value, role: r ? r.name : "" });
                }}
              >
                <option value="">Select Role</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
            </div>
          </section>

          <section className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-400">
            <SectionTitle icon={<GitBranch size={12} />} title="Security Matrix (Branches)" />

            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setForm({ ...form, branchIds: form.branchIds.includes("*") ? [] : ["*"], branchNames: [] })}
                className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${form.branchIds.includes("*") ? 'bg-(--primary) border-(--primary) text-white shadow-lg shadow-(--primary)/20' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-(--primary)/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${form.branchIds.includes("*") ? 'bg-white/20' : 'bg-(--primary)/10 text-(--primary)'}`}>
                    <ShieldCheck size={16} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-xs">Global Access</p>
                    <p className={`text-[8px] uppercase font-bold ${form.branchIds.includes("*") ? 'text-white/60' : 'text-[var(--text-muted)]'}`}>Super-User</p>
                  </div>
                </div>
                {form.branchIds.includes("*") && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              </button>

              {!form.branchIds.includes("*") && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {branches.map((b) => {
                    const isActive = form.branchIds.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        onClick={() => {
                          const nextIds = isActive ? form.branchIds.filter(id => id !== b.id) : [...form.branchIds, b.id];
                          const nextNames = isActive ? form.branchNames.filter(n => n !== b.name) : [...form.branchNames, b.name];
                          setForm({ ...form, branchIds: nextIds, branchNames: nextNames });
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${isActive ? 'bg-(--primary-soft) border-(--primary) text-(--primary)' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text)] hover:border-(--primary)/30'}`}
                      >
                        <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-(--primary)' : 'bg-[var(--border)]'}`} />
                        <span className="text-[10px] font-bold truncate uppercase">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="px-8 py-5 bg-[var(--bg)] border-t border-[var(--border)] flex justify-end items-center relative z-10">
          <button
            className="px-6 py-2.5 bg-(--primary) text-white rounded-xl font-bold text-[11px] uppercase hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-(--primary)/20 flex items-center gap-2"
            onClick={save}
          >
            <Save size={16} />
            Commit Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="text-(--primary)">{icon}</div>
      <h3 className="text-[9px] font-bold text-[var(--text-muted)] uppercase">{title}</h3>
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1.5 flex-1">
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
