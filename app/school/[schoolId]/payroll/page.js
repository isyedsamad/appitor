"use client";

import { useEffect, useState } from "react";
import {
    Banknote,
    Plus,
    Settings,
    History,
    ChevronRight,
    CircleDollarSign,
    Users,
    Calendar,
    ArrowUpRight,
    AlertCircle,
    Info,
    Shield,
    ToggleLeft,
    ToggleRight,
    Trash2,
    Save,
    X,
} from "lucide-react";
import Link from "next/link";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { formatMonth, formatMonthYear, formatFullDateTime } from "@/lib/dateUtils";

export default function PayrollDashboard() {
    const { schoolUser, setLoading, isLoaded, sessionList, currentSession } = useSchool();
    const { branch, branchInfo } = useBranch();
    const [payruns, setPayruns] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(formatMonth());
    const [selectedSession, setSelectedSession] = useState("");
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settings, setSettings] = useState({
        isAdvanced: false,
        components: { earnings: [], deductions: [] }
    });

    useEffect(() => {
        if (currentSession && !selectedSession) {
            setSelectedSession(currentSession);
        }
    }, [currentSession]);

    const loadPayruns = async () => {
        if (!selectedSession) return;
        setLoading(true);
        try {
            const resp = await secureAxios.get(`/api/school/payroll/payruns?session=${selectedSession}`, {
                headers: { "x-branch-id": branch }
            });
            setPayruns(resp.data);
        } catch (err) {
            toast.error("Failed to load payroll history");
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!selectedMonth) return;
        if (!confirm(`Do you want to generate the payslip and freeze salary calculations for the month: ${formatMonthYear(selectedMonth)}?`)) return;
        setLoading(true);
        try {
            await secureAxios.post("/api/school/payroll/payruns", {
                monthYear: selectedMonth
            }, {
                headers: { "x-branch-id": branch }
            });
            toast.success("Payrun generated successfully!");
            loadPayruns();
        } catch (err) {
            toast.error(err.response?.data?.message || "Generation failed");
        } finally {
            setLoading(false);
        }
    };

    const loadSettings = async () => {
        try {
            const resp = await secureAxios.get("/api/school/payroll/settings", {
                headers: { "x-branch-id": branch }
            });
            setSettings(resp.data);
        } catch (err) {
            toast.error("Failed to load settings");
        }
    };

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            await secureAxios.post("/api/school/payroll/settings", settings, {
                headers: { "x-branch-id": branch }
            });
            toast.success("Settings saved successfully!");
            setShowSettingsModal(false);
            loadPayruns();
        } catch (err) {
            toast.error("Failed to save settings");
        } finally {
            setLoading(false);
        }
    };

    const addComponent = (type) => {
        const name = prompt(`Enter ${type} name:`);
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
        if (branch && isLoaded && schoolUser && selectedSession) {
            loadPayruns();
            loadSettings();
        }
    }, [branch, isLoaded, schoolUser, selectedSession]);

    const handleDelete = async (id) => {
        if (!confirm(`Are you sure you want to delete the payrun for ${formatMonthYear(id)}?`)) return;
        setLoading(true);
        try {
            await secureAxios.delete(`/api/school/payroll/payruns/${id}`, {
                headers: { "x-branch-id": branch }
            });
            toast.success("Payrun deleted");
            loadPayruns();
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    };

    return (
        <RequirePermission permission="payroll.view">
            <div className="space-y-4 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-3 shadow-sm rounded-lg border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
                            <Banknote size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Payroll Management</h1>
                            <p className="text-xs font-semibold text-(--text-muted)">
                                Manage employee salaries, payruns and payslips
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="btn-outline flex gap-2 items-center shadow-sm px-4"
                        >
                            <Settings size={18} /> Settings
                        </button>
                    </div>
                </div>

                <div className="flex">
                    <div className="flex items-end gap-2">
                        <div>
                            <p className="text-xs font-semibold text-(--text-muted)">Generate Month</p>
                            <div className="flex items-center gap-2">
                                <input
                                    type="month"
                                    value={selectedMonth.split('-').reverse().join('-')}
                                    onChange={(e) => {
                                        const [y, m] = e.target.value.split('-');
                                        setSelectedMonth(`${m}-${y}`);
                                    }}
                                    className="input"
                                />
                                <button
                                    onClick={handleGenerate}
                                    className="btn-primary"
                                >
                                    <Plus size={14} /> Generate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        title="Total Payout"
                        value={payruns.length > 0 ? `₹${payruns[0]?.totalPayout?.toLocaleString() || '0'}` : "₹0"}
                        icon={CircleDollarSign}
                        trend="Current active run"
                        color="accent"
                    />
                    <StatCard
                        title="Active Employees"
                        value={payruns[0]?.totalEmployees ? payruns[0]?.totalEmployees == 0 ? '--' : payruns[0]?.totalEmployees.toString().padStart(2, '0') : '0'}
                        icon={Users}
                        trend={payruns.length > 0 ? "Onboarded for payroll" : "No active run"}
                        color="primary"
                    />
                    <StatCard
                        title="Last Status"
                        value={payruns[0]?.status?.toUpperCase() || 'NO DATA'}
                        icon={ArrowUpRight}
                        trend={
                            payruns[0]?.updatedAt
                                ? `Last updated on ${payruns[0].updatedAt._seconds
                                    ? formatFullDateTime(payruns[0].updatedAt._seconds * 1000)
                                    : formatFullDateTime(payruns[0].updatedAt)}`
                                : "N/A"
                        }
                        color="warning"
                    />
                </div>

                <div className="bg-(--bg-card) rounded-2xl border border-(--border) shadow-sm overflow-hidden">
                    <div className="py-3 px-5 border-b border-(--border) flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History size={18} className="text-(--primary)" />
                            <h2 className="text-sm font-bold">Payroll History</h2>
                        </div>
                        <div>
                            <select
                                className="input py-1 text-sm"
                                value={selectedSession}
                                onChange={(e) => setSelectedSession(e.target.value)}
                            >
                                <option value="">Select Session</option>
                                {sessionList && sessionList.map(s => (
                                    <option key={s.id} value={s.id}>{s.id}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-(--bg-soft)/50 text-(--text-muted) text-[10px] uppercase tracking-wider font-bold">
                                    <th className="px-5 py-3 border-b border-(--border)">Month</th>
                                    <th className="px-5 py-3 border-b border-(--border)">Mode</th>
                                    <th className="px-5 py-3 border-b border-(--border)">Staff Count</th>
                                    <th className="px-5 py-3 border-b border-(--border)">Total Payout</th>
                                    <th className="px-5 py-3 border-b border-(--border)">Status</th>
                                    <th className="px-5 py-3 border-b border-(--border) text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border)">
                                {payruns.length > 0 ? (
                                    payruns.map((run) => (
                                        <tr key={run.id} className="hover:bg-(--bg-soft)/30 transition-colors group">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-(--text-muted)" />
                                                    <span className="text-xs font-bold">{formatMonthYear(run.id)}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${run.isAdvanced ? 'bg-purple-500/10 text-purple-600 border border-purple-500/20' : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'}`}>
                                                    {run.isAdvanced ? "Advanced" : "Simple"}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs font-medium">{run.totalEmployees} Staff</td>
                                            <td className="px-5 py-4 text-xs font-bold">₹{run.totalPayout?.toLocaleString()}</td>
                                            <td className="px-5 py-4">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase 
                                                    ${run.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' :
                                                        run.status === 'partial' ? 'bg-blue-500/10 text-blue-600' :
                                                            'bg-orange-500/10 text-orange-600'}`}>
                                                    {run.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3">
                                                    {run.status === 'draft' && (
                                                        <button
                                                            onClick={() => handleDelete(run.id)}
                                                            className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded hover:bg-red-500 hover:text-white transition"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                    <Link
                                                        href={`/school/${schoolUser.schoolId}/payroll/${run.id}`}
                                                        className="inline-flex items-center gap-1 text-xs font-bold text-(--primary) hover:underline"
                                                    >
                                                        Review <ChevronRight size={14} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="6" className="px-5 py-12 text-center">
                                            <div className="flex flex-col items-center gap-2 text-(--text-muted)">
                                                <AlertCircle size={32} strokeWidth={1.5} />
                                                <p className="text-sm font-medium">No payroll records found</p>
                                                <p className="text-xs">Select a month and click 'Generate' to start</p>
                                            </div>
                                        </td>
                                    </tr>
                                )
                                }
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex gap-3 items-start">
                    <Info size={16} className="text-blue-500 mt-0.5" />
                    <div className="text-xs text-blue-700/80 leading-relaxed font-medium">
                        <p className="font-bold text-blue-600 mb-1">Getting Started with Payroll</p>
                        <p>Generate a new payrun to freeze salary calculations for the month. You can then review individual records, add bonuses or deductions, and download professional payslips. Switch to Advanced mode in settings to enable attendance-linked LOP and itemized components.</p>
                    </div>
                </div>
            </div>

            {showSettingsModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-(--bg-card) w-full max-w-2xl rounded-2xl border border-(--border) shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
                            <div className="flex items-center gap-2">
                                <Settings size={20} className="text-(--primary)" />
                                <h3 className="font-bold">Payroll Settings</h3>
                            </div>
                            <button onClick={() => setShowSettingsModal(false)} className="p-1.5 hover:bg-(--border) rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-6">
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
                                    {settings.isAdvanced ? <ToggleRight size={44} className="text-(--primary)" /> : <ToggleLeft size={44} className="text-(--text-muted)" />}
                                </button>
                            </div>

                            {!settings.isAdvanced ? (
                                <div className="flex items-start gap-3 p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                                    <Info size={16} className="text-blue-500 mt-0.5" />
                                    <div className="text-xs text-blue-700/80 leading-relaxed font-medium">
                                        <p className="font-bold text-blue-600 mb-1">Simple Mode Active</p>
                                        <p>Payroll will use the fixed salary defined in the employee profiles. Manual adjustments can be added during review.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-(--text-muted)">Earnings</h4>
                                            <button onClick={() => addComponent("earnings")} className="text-sm font-semibold text-(--primary) flex items-center gap-1 hover:underline">
                                                <Plus size={12} /> Add
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {settings.components.earnings.map((c, i) => (
                                                <div key={i} className="flex items-center gap-3 py-3 px-4 bg-(--bg)/30 rounded-lg border border-(--border)">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold">{c.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <select value={c.type} onChange={(e) => updateComponent("earnings", i, "type", e.target.value)} className="input">
                                                                <option value="percentage">% of Basic</option>
                                                                <option value="fixed">Fixed</option>
                                                            </select>
                                                            <input type="number" value={c.value} onChange={(e) => updateComponent("earnings", i, "value", parseFloat(e.target.value) || 0)} className="input w-16" />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeComponent("earnings", i)} className="p-1.5 text-(--status-a-text) bg-(--status-a-bg) hover:text-red-500 transition">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-(--text-muted)">Deductions</h4>
                                            <button onClick={() => addComponent("deductions")} className="text-sm font-semibold text-(--primary) hover:text-red-500 transition">
                                                <Plus size={12} /> Add
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {settings.components.deductions.map((c, i) => (
                                                <div key={i} className="flex items-center gap-3 py-3 px-4 bg-(--bg)/30 rounded-lg border border-(--border)">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-semibold">{c.name}</p>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <select value={c.type} onChange={(e) => updateComponent("deductions", i, "type", e.target.value)} className="input">
                                                                <option value="percentage">% of Basic</option>
                                                                <option value="fixed">Fixed</option>
                                                            </select>
                                                            <input type="number" value={c.value} onChange={(e) => updateComponent("deductions", i, "value", parseFloat(e.target.value) || 0)} className="input w-16" />
                                                        </div>
                                                    </div>
                                                    <button onClick={() => removeComponent("deductions", i)} className="p-1.5 text-(--status-a-text) bg-(--status-a-bg) hover:text-red-500 transition">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-(--bg-soft) border-t border-(--border) flex justify-end gap-3">
                            <button onClick={() => setShowSettingsModal(false)} className="px-4 py-2 text-xs font-bold text-(--text-muted) hover:text-(--text)">Cancel</button>
                            <button onClick={handleSaveSettings} className="flex items-center gap-2 bg-(--primary) text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-(--primary-hover) shadow-lg shadow-orange-500/10">
                                <Save size={14} /> Save Settings
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RequirePermission>
    );
}

function StatCard({ title, value, icon: Icon, trend, color, bg }) {
    const getThemeVars = () => {
        switch (color) {
            case "danger":
                return {
                    bg: "bg-(--status-o-bg)",
                    text: "text-(--status-o-text)",
                    border: "border-(--status-o-border)",
                    gradient: "from-(--status-o-bg)/50 to-transparent",
                };
            case "accent":
                return {
                    bg: "bg-(--status-p-bg)",
                    text: "text-(--status-p-text)",
                    border: "border-(--status-p-border)",
                    gradient: "from-(--status-p-bg)/50 to-transparent",
                };
            case "warning":
                return {
                    bg: "bg-(--status-a-bg)",
                    text: "text-(--status-a-text)",
                    border: "border-(--status-a-border)",
                    gradient: "from-(--status-a-bg)/50 to-transparent",
                };
            default:
                return {
                    bg: "bg-(--status-l-bg)",
                    text: "text-(--status-l-text)",
                    border: "border-(--status-l-border)",
                    gradient: "from-(--status-l-bg)/50 to-transparent",
                };
        }
    };

    const theme = getThemeVars();

    return (
        <div className={`relative overflow-hidden rounded-xl border ${theme.border} bg-gradient-to-br ${theme.gradient} bg-(--bg-card) px-5 py-4 shadow-sm transition-all hover:shadow-md`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-(--text-muted)">{title}</p>
                    <div className="mt-1">
                        <h3 className={`text-2xl font-bold tracking-tight ${theme.text}`}>
                            {value}
                        </h3>
                        {trend && <p className="text-[10px] font-medium text-(--text-muted) mt-1">{trend}</p>}
                    </div>
                </div>
                <div className={`p-2 rounded-xl ${theme.bg} ${theme.text} ${theme.border} border`}>
                    <Icon size={20} />
                </div>
            </div>
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.gradient} opacity-20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none`} />
        </div>
    );
}
