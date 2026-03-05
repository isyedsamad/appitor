"use client";

import { useState, useEffect } from "react";
import { X, Save, ShieldCheck, Landmark, UserPlus, GitBranch } from "lucide-react";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { fetchSchools } from "@/lib/admin/schoolService";
import { fetchSchoolBranches } from "@/lib/admin/branchService";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function AddRoleModal({ open, onClose }) {
  const { setLoading } = useSuperAdmin();
  const [schools, setSchools] = useState([]);
  const [branches, setBranches] = useState([]);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState({});
  const [createUser, setCreateUser] = useState(false);
  const [userData, setUserData] = useState({
    name: "",
    username: "",
    password: "",
    schoolId: "",
    schoolName: "",
    branchIds: [],
    branchNames: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSchools().then(setSchools);
    }
  }, [open]);

  useEffect(() => {
    if (userData.schoolId) {
      fetchSchoolBranches(userData.schoolId).then(setBranches);
    } else {
      setBranches([]);
    }
  }, [userData.schoolId]);

  if (!open) return null;

  async function save() {
    if (!name.trim()) {
      toast.error("Role identity is required", { theme: "colored" });
      return;
    }

    if (createUser && (!userData.name || !userData.username || !userData.password || !userData.schoolId || userData.branchIds.length === 0)) {
      toast.error("Incomplete user assignment data", { theme: "colored" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        permissions: Object.keys(permissions).filter((p) => permissions[p]),
      };

      if (createUser) {
        const userPayload = { ...userData };
        if (userPayload.branchIds.includes("*")) {
          userPayload.currentBranch = "*";
        } else {
          userPayload.currentBranch = userPayload.branchIds[0];
        }
        payload.userData = userPayload;
      }

      await secureAxios.post("/api/admin/roles/create", payload);
      toast.success('Global security profile synchronized!', { theme: 'colored' });
      onClose();
    } catch (error) {
      toast.error('Error: ' + (error.response?.data?.error || error.message), { theme: 'colored' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[var(--bg-card)] w-full max-w-4xl rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden relative font-sans">
        <div className="absolute top-0 right-0 w-32 h-32 bg-(--primary)/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />

        <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)] relative z-10">
          <div>
            <h2 className="text-xl font-bold text-[var(--text)]">Initialize Global Role</h2>
            <p className="text-[9px] font-bold text-(--primary) uppercase mt-0.5">System-Wide Access Matrix</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-500 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="px-8 py-6 grid md:grid-cols-2 gap-8 max-h-[75vh] overflow-y-auto scrollbar-hide relative z-10">
          <div className="space-y-6">
            <section className="space-y-4">
              <SectionTitle icon={<ShieldCheck size={12} />} title="Security Template Identity" />
              <Input
                label="Role Alias"
                placeholder="e.g. Regional Supervisor"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <SectionTitle icon={<UserPlus size={12} />} title="Institutional User Assignment" />
                <button
                  onClick={() => setCreateUser(!createUser)}
                  className={`text-[9px] font-bold uppercase px-2 py-1 rounded-md transition-all ${createUser ? 'bg-rose-50 text-rose-500 border border-rose-100' : 'bg-(--primary-soft) text-(--primary) border border-(--primary)/20'}`}
                >
                  {createUser ? 'Cancel Assignment' : 'Assign First User'}
                </button>
              </div>

              {createUser && (
                <div className="space-y-4 animate-in slide-in-from-top-4 duration-300 p-5 rounded-2xl bg-[var(--bg)]/50 border border-[var(--border)]">
                  <Select
                    label="Target Institutional Node"
                    value={userData.schoolId}
                    onChange={(e) => {
                      const s = schools.find(x => x.id === e.target.value);
                      setUserData({ ...userData, schoolId: e.target.value, schoolName: s ? s.name : "", branchIds: [], branchNames: [] });
                    }}
                  >
                    <option value="">Select School</option>
                    {schools.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </Select>

                  <Input
                    label="User Full Name"
                    placeholder="e.g. Jane Smith"
                    value={userData.name}
                    onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Username"
                      placeholder="e.g. jsmith"
                      value={userData.username}
                      onChange={(e) => setUserData({ ...userData, username: e.target.value })}
                    />
                    <Input
                      label="Password"
                      type="password"
                      placeholder="••••••••"
                      value={userData.password}
                      onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                    />
                  </div>

                  {userData.schoolId && (
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase ml-1 opacity-70">Branch Access Control</label>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setUserData({ ...userData, branchIds: userData.branchIds.includes("*") ? [] : ["*"], branchNames: [] })}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${userData.branchIds.includes("*") ? 'bg-(--primary) border-(--primary) text-white' : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text-muted)]'}`}
                        >
                          <ShieldCheck size={12} />
                          Global
                        </button>
                        {!userData.branchIds.includes("*") && branches.map(b => {
                          const active = userData.branchIds.includes(b.id);
                          return (
                            <button
                              key={b.id}
                              onClick={() => {
                                const nextIds = active ? userData.branchIds.filter(id => id !== b.id) : [...userData.branchIds, b.id];
                                const nextNames = active ? userData.branchNames.filter(n => n !== b.name) : [...userData.branchNames, b.name];
                                setUserData({ ...userData, branchIds: nextIds, branchNames: nextNames });
                              }}
                              className={`px-3 py-1.5 rounded-xl border text-[9px] font-bold uppercase transition-all ${active ? 'bg-(--primary-soft) border-(--primary) text-(--primary)' : 'bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)]'}`}
                            >
                              {b.name}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <SectionTitle icon={<GitBranch size={12} />} title="Global Permission Matrix" />
            <div className="space-y-4 pr-1">
              {Object.entries(PERMISSIONS).map(([group, perms]) => {
                const isAllSelected = perms.every((p) => permissions[p]);

                return (
                  <div key={group} className="space-y-2 bg-[var(--bg)]/30 rounded-2xl p-4 border border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-bold text-[var(--text)] uppercase">{group}</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const nextPerms = { ...permissions };
                          if (isAllSelected) {
                            perms.forEach((p) => (nextPerms[p] = false));
                          } else {
                            perms.forEach((p) => (nextPerms[p] = true));
                          }
                          setPermissions(nextPerms);
                        }}
                        className={`text-[9px] font-bold uppercase transition-all px-2 py-0.5 rounded-md border ${isAllSelected
                          ? "bg-(--primary-soft) text-(--primary) border-(--primary)/20 hover:bg-(--primary) hover:text-white"
                          : "bg-[var(--bg)] text-[var(--text-muted)] border-[var(--border)] hover:bg-[var(--border)] hover:text-[var(--text)]"
                          }`}
                      >
                        {isAllSelected ? "Deselect All" : "Select All"}
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {perms.map((p) => {
                        const isActive = permissions[p];
                        return (
                          <label
                            key={p}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all cursor-pointer hover:bg-[var(--bg)]/50 ${isActive ? 'text-(--primary)' : 'text-[var(--text-muted)]'}`}
                          >
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={!!isActive}
                              onChange={(e) => setPermissions({ ...permissions, [p]: e.target.checked })}
                            />
                            <div className={`w-3.5 h-3.5 rounded-md border-2 flex items-center justify-center transition-all ${isActive ? 'bg-(--primary) border-(--primary)' : 'border-[var(--border)] bg-[var(--bg)]'}`}>
                              {isActive && <div className="w-1 h-1 rounded-full bg-white" />}
                            </div>
                            <span className="text-[10px] font-bold uppercase">{p}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
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
            {saving ? "Finalizing..." : "Seal Global Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, icon }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <div className="text-(--primary)">{icon}</div>
      <h3 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{title}</h3>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1.5 flex-1 w-full">
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
