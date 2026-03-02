"use client";

import { useState, useEffect } from "react";
import secureAxios from "@/lib/secureAxios";
import { X, Save, Settings, Layers, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

export default function EditSchoolModal({ open, onClose, school, onUpdate }) {
    const [form, setForm] = useState({
        name: "",
        status: "active",
        studentLimit: 9999,
        address: "",
        city: "",
        state: "",
        phone: "",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (school) {
            setForm({
                name: school.name || "",
                status: school.status || "active",
                studentLimit: school.studentLimit || 9999,
                address: school.address || "",
                city: school.city || "",
                state: school.state || "",
                phone: school.phone || "",
            });
        }
    }, [school]);

    if (!open) return null;

    async function save() {
        setSaving(true);
        try {
            await secureAxios.post("/api/admin/edit-school", {
                schoolId: school.id,
                updates: form,
            });
            toast.success("School Node Synchronized!", { theme: "colored" });
            onUpdate();
            onClose();
        } catch (error) {
            toast.error("Error: " + (error.response?.data?.error || error.message), { theme: "colored" });
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-3xl shadow-2xl border border-[var(--border)] overflow-hidden relative font-sans">
                <div className="absolute top-0 right-0 w-32 h-32 bg-(--primary)/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />

                <div className="flex items-center justify-between px-8 py-5 border-b border-[var(--border)] relative z-10">
                    <div>
                        <h2 className="text-xl font-bold text-[var(--text)]">Adjust Configuration</h2>
                        <p className="text-[9px] font-bold text-(--primary) uppercase mt-0.5">{school.name}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-500 transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="px-8 py-6 space-y-4 max-h-[70vh] overflow-y-auto scrollbar-hide relative z-10">
                    <div className="space-y-2">
                        <Input label="Legal School Name" placeholder="e.g. International Heritage School" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

                        <div className="grid grid-cols-2 gap-4">
                            <Select label="Node Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                            </Select>
                            <Input label="Student Limit" type="number" onWheel={(e) => e.preventDefault()}
                                placeholder="e.g. 5000"
                                value={form.studentLimit}
                                onChange={(e) => setForm({ ...form, studentLimit: Number(e.target.value) })}
                            />
                        </div>

                        <Input label="Physical Address" placeholder="e.g. 123 Education Lane, Sector 4" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />

                        <div className="grid grid-cols-2 gap-4">
                            <Input label="City" placeholder="City" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                            <Input label="State" placeholder="State" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
                        </div>

                        <Input label="Contact Phone" placeholder="e.g. +91 9876543210" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    </div>
                </div>

                <div className="px-8 py-5 bg-[var(--bg)] border-t border-[var(--border)] flex justify-end items-center relative z-10">
                    <button
                        className="px-6 py-2.5 bg-(--primary) text-white rounded-xl font-bold text-[11px] uppercase hover:opacity-90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-(--primary)/20 flex items-center gap-2"
                        onClick={save}
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? "Synchronizing..." : "Update Configuration"}
                    </button>
                </div>
            </div>
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
