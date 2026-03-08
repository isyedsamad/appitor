"use client";

import { useEffect, useState } from "react";
import {
    Settings,
    Shield,
    ToggleLeft,
    ToggleRight,
    Plus,
    Trash2,
    Save,
    Info,
    ChevronLeft,
} from "lucide-react";
import Link from "next/link";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

export default function PayrollSettings() {
    const router = useRouter();
    const { schoolUser, setLoading, isLoaded } = useSchool();
    const { branch } = useBranch();
    const [settings, setSettings] = useState({
        isAdvanced: false,
        components: {
            earnings: [],
            deductions: []
        }
    });

    const loadSettings = async () => {
        setLoading(true);
        try {
            const resp = await secureAxios.get("/api/school/payroll/settings", {
                headers: { "x-branch-id": branch }
            });
            setSettings(resp.data);
        } catch (err) {
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await secureAxios.post("/api/school/payroll/settings", settings, {
                headers: { "x-branch-id": branch }
            });
            toast.success("Settings saved successfully!");
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    const addComponent = (type) => {
        const name = prompt(`Enter ${type} name (e.g., HRA, PF):`);
        if (!name) return;
        setSettings(prev => ({
            ...prev,
            components: {
                ...prev.components,
                [type]: [...prev.components[type], { name, type: "percentage", value: 0 }]
            }
        }));
    };

    const removeComponent = (type, index) => {
        setSettings(prev => ({
            ...prev,
            components: {
                ...prev.components,
                [type]: prev.components[type].filter((_, i) => i !== index)
            }
        }));
    };

    const updateComponent = (type, index, field, value) => {
        setSettings(prev => {
            const newList = [...prev.components[type]];
            newList[index] = { ...newList[index], [field]: value };
            return {
                ...prev,
                components: { ...prev.components, [type]: newList }
            };
        });
    };

    useEffect(() => {
        if (branch && isLoaded && schoolUser) loadSettings();
    }, [branch, isLoaded, schoolUser]);

    return (
        <RequirePermission permission="payroll.manage">
            <div className="space-y-6 pb-20 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                        <Link
                            href={`/school/${schoolUser.schoolId}/payroll`}
                            className="p-2.5 rounded-lg border border-(--border) bg-(--bg-card) text-(--text-muted) hover:text-(--primary) transition"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Payroll Settings</h1>
                            <p className="text-xs font-semibold text-(--text-muted)">
                                Configure payroll modes and individual components
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 bg-(--primary) text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-(--primary-hover) shadow-md shadow-orange-500/10 transition active:scale-[0.98]"
                    >
                        <Save size={16} /> Save Changes
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Mode Selection */}
                    <section className="bg-(--bg-card) p-6 rounded-2xl border border-(--border) shadow-sm space-y-6">
                        <div className="flex items-center justify-between p-4 bg-(--bg-soft)/50 rounded-xl border border-(--border)">
                            <div className="space-y-1">
                                <h3 className="text-sm font-bold flex items-center gap-2">
                                    <Shield size={16} className="text-(--primary)" /> Advanced Payroll Mode
                                </h3>
                                <p className="text-[11px] text-(--text-muted) font-medium">
                                    Enable attendance integration, LOP calculations, and itemized salary components.
                                </p>
                            </div>
                            <button
                                onClick={() => setSettings(p => ({ ...p, isAdvanced: !p.isAdvanced }))}
                                className="transition-all active:scale-95"
                            >
                                {settings.isAdvanced ? (
                                    <ToggleRight size={48} className="text-(--primary)" />
                                ) : (
                                    <ToggleLeft size={48} className="text-(--text-muted)" />
                                )}
                            </button>
                        </div>

                        {!settings.isAdvanced ? (
                            <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                <Info size={16} className="text-blue-500 mt-0.5" />
                                <div className="text-xs text-blue-700/80 leading-relaxed font-medium">
                                    <p className="font-bold text-blue-600 mb-1">Simple Mode Active</p>
                                    <p>Payroll will use the fixed salary defined in the employee profiles. You can create monthly payruns and add simple adjustments (Bonus/Deduction) manually during the review process.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-top-2 duration-300">
                                {/* Earnings Configuration */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">Earnings Detail</h4>
                                        <button
                                            onClick={() => addComponent("earnings")}
                                            className="text-[10px] font-bold text-(--primary) flex items-center gap-1 hover:underline"
                                        >
                                            <Plus size={12} /> Add Earning
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {settings.components.earnings.map((c, i) => (
                                            <ComponentItem
                                                key={`e-${i}`}
                                                component={c}
                                                onUpdate={(f, v) => updateComponent("earnings", i, f, v)}
                                                onRemove={() => removeComponent("earnings", i)}
                                            />
                                        ))}
                                        {settings.components.earnings.length === 0 && <EmptyState text="No custom earnings defined" />}
                                    </div>
                                </div>

                                {/* Deductions Configuration */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">Mandatory Deductions</h4>
                                        <button
                                            onClick={() => addComponent("deductions")}
                                            className="text-[10px] font-bold text-red-500 flex items-center gap-1 hover:underline"
                                        >
                                            <Plus size={12} /> Add Deduction
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {settings.components.deductions.map((c, i) => (
                                            <ComponentItem
                                                key={`d-${i}`}
                                                component={c}
                                                onUpdate={(f, v) => updateComponent("deductions", i, f, v)}
                                                onRemove={() => removeComponent("deductions", i)}
                                                isDeduction
                                            />
                                        ))}
                                        {settings.components.deductions.length === 0 && <EmptyState text="No custom deductions defined" />}
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </RequirePermission>
    );
}

function ComponentItem({ component, onUpdate, onRemove, isDeduction }) {
    return (
        <div className="flex items-center gap-4 p-4 bg-(--bg-soft)/30 rounded-xl border border-(--border)">
            <div className="flex-1">
                <p className="text-xs font-bold">{component.name}</p>
                <div className="flex items-center gap-2 mt-2">
                    <select
                        value={component.type}
                        onChange={(e) => onUpdate("type", e.target.value)}
                        className="bg-(--bg-card) border border-(--border) text-[10px] px-2 py-1 rounded outline-none"
                    >
                        <option value="percentage">% of Basic</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                    <input
                        type="number"
                        value={component.value}
                        onChange={(e) => onUpdate("value", parseFloat(e.target.value) || 0)}
                        placeholder="Value"
                        className="bg-(--bg-card) border border-(--border) text-[10px] px-2 py-1 rounded w-20 outline-none font-bold"
                    />
                </div>
            </div>
            <button
                onClick={onRemove}
                className="p-2 text-(--text-muted) hover:text-red-500 transition"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="p-4 bg-(--bg-soft)/10 border border-dashed border-(--border) rounded-xl text-center">
            <p className="text-[10px] text-(--text-muted) font-medium italic">{text}</p>
        </div>
    );
}
