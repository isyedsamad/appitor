"use client";

import { useEffect, useState } from "react";
import secureAxios from "@/lib/secureAxios";
import { X, Save, Layers, GitBranch, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";

export default function EditBranchModal({ open, onClose, branch, onUpdate }) {
    const [form, setForm] = useState({
        name: "",
        branchCode: "",
        appitorCode: "A",
        city: "",
        state: "",
        plan: "core",
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (branch) {
            setForm({
                name: branch.name || "",
                branchCode: branch.branchCode || "",
                appitorCode: branch.appitorCode || "A",
                city: branch.city || "",
                state: branch.state || "",
                plan: branch.plan || "core",
            });
        }
    }, [branch]);

    if (!open) return null;

    async function save() {
        if (!form.name || !form.branchCode) {
            toast.error("Please fill all required fields", { theme: "colored" });
            return;
        }
        setSaving(true);
        try {
            await secureAxios.post("/api/admin/branches/update", {
                branchId: branch.id,
                schoolId: branch.schoolId,
                updates: form,
            });
            toast.success("Branch Node Synchronized!", { theme: "colored" });
            onUpdate();
            onClose();
        } catch (error) {
            toast.error("Error: " + (error.response?.data?.error || error.message), {
                theme: "colored",
            });
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
                        <h2 className="text-xl font-bold text-[var(--text)]">
                            Adjust Branch Config
                        </h2>
                        <p className="text-[9px] font-bold text-(--primary) uppercase mt-0.5">
                            Refining Deployment: {branch?.name}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[var(--bg)] text-[var(--text-muted)] hover:text-rose-500 transition-all"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide relative z-10">
                    <section className="space-y-4">
                        <SectionTitle icon={<GitBranch size={12} />} title="Identity Matrix" />
                        <Input
                            label="Branch Designation"
                            placeholder="e.g. Siwan Main Campus"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Branch Code"
                                placeholder="e.g. ABC-SIW"
                                value={form.branchCode}
                                onChange={(e) => setForm({ ...form, branchCode: e.target.value })}
                            />
                            <Select
                                label="Routing Code"
                                value={form.appitorCode}
                                onChange={(e) => setForm({ ...form, appitorCode: e.target.value })}
                            >
                                {["A", "B", "C", "D", "E", "F", "G", "H"].map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    </section>

                    <section className="space-y-4">
                        <SectionTitle icon={<MapPin size={12} />} title="Coordinates" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="City"
                                placeholder="e.g. Siwan"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                            />
                            <Input
                                label="State"
                                placeholder="e.g. Bihar"
                                value={form.state}
                                onChange={(e) => setForm({ ...form, state: e.target.value })}
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <SectionTitle
                            icon={<ShieldCheck size={12} />}
                            title="Subscription Layer"
                        />
                        <div className="grid grid-cols-1 gap-2">
                            <PlanOption
                                active={form.plan === "core"}
                                onClick={() => setForm({ ...form, plan: "core" })}
                                title="Core Node"
                                desc="Base administrative modules"
                                price="Standard"
                            />
                            <PlanOption
                                active={form.plan === "connect"}
                                onClick={() => setForm({ ...form, plan: "connect" })}
                                title="Appitor Connect"
                                desc="Enhanced communication & multi-device sync"
                                price="Enterprise"
                                highlight
                            />
                            <PlanOption
                                active={form.plan === "plus"}
                                onClick={() => setForm({ ...form, plan: "plus" })}
                                title="Enterprise Plus"
                                desc="Full automation & advanced telemetry"
                                price="Premium"
                            />
                        </div>
                    </section>
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

function SectionTitle({ title, icon }) {
    return (
        <div className="flex items-center gap-2 mb-2">
            <div className="text-(--primary)">{icon}</div>
            <h3 className="text-[9px] font-bold text-[var(--text-muted)] uppercase">
                {title}
            </h3>
        </div>
    );
}

function Input({ label, ...props }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase ml-1 opacity-70">
                {label}
            </label>
            <input className="input" {...props} />
        </div>
    );
}

function Select({ label, children, ...props }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-[9px] font-bold text-[var(--text-muted)] uppercase ml-1 opacity-70">
                {label}
            </label>
            <div className="relative">
                <select
                    className="input appearance-none outline-none cursor-pointer"
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--text-muted)]">
                    <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="m19 9-7 7-7-7"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}

function PlanOption({ active, onClick, title, desc, price, highlight }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${active
                    ? "bg-(--primary-soft) border-(--primary) shadow-lg shadow-(--primary)/5"
                    : "bg-[var(--bg)] border-[var(--border)] hover:border-(--primary)/30"
                }`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${active
                            ? "bg-(--primary) text-white"
                            : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)]"
                        }`}
                >
                    <Layers size={16} />
                </div>
                <div className="text-left">
                    <p
                        className={`text-xs font-bold ${active ? "text-(--primary)" : "text-[var(--text)]"
                            }`}
                    >
                        {title}
                    </p>
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase">
                        {desc}
                    </p>
                </div>
            </div>
            <div
                className={`text-[10px] font-bold uppercase ${active ? "text-(--primary)" : "text-[var(--text-muted)] opacity-60"
                    }`}
            >
                {price}
            </div>
        </button>
    );
}
