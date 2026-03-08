"use client";

import { useEffect, useState, useMemo } from "react";
import {
    ChevronLeft,
    Download,
    Printer,
    CheckCircle2,
    History,
    Search,
    Edit2,
    CircleDollarSign,
    Calendar,
    AlertCircle,
    User,
    X,
} from "lucide-react";
import Link from "next/link";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useParams, useRouter } from "next/navigation";
import { exportPayslipPDF } from "@/lib/exports/payroll/payslipPdf";
import { formatMonthYear } from "@/lib/dateUtils";

export default function PayrunDetail() {
    const { monthYear, schoolId } = useParams();
    const router = useRouter();
    const { schoolUser, setLoading, isLoaded } = useSchool();
    const { branch, branchInfo } = useBranch();
    const [run, setRun] = useState(null);
    const [search, setSearch] = useState("");
    const [showPayModal, setShowPayModal] = useState(false);
    const [payData, setPayData] = useState({ uid: '', name: '', amount: '', method: 'cash' });
    const [editingUid, setEditingUid] = useState(null);
    const [editValue, setEditValue] = useState("");
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [pdfOptions, setPdfOptions] = useState({ size: '1/2', showOfficeCopy: true });

    const confirmDownload = () => {
        const recordsToPrint = selectedRecord ? [selectedRecord] : run.employeeRecords;
        if (recordsToPrint.length === 0) {
            toast.error("No records to print");
            return;
        }

        exportPayslipPDF({
            schoolUser,
            schoolName: branchInfo.name,
            branchName: branchInfo.address,
            payrollItems: recordsToPrint,
            monthYear,
            format: pdfOptions.size,
            includeOfficeCopy: pdfOptions.showOfficeCopy
        });

        setShowDownloadModal(false);
    };

    const handleRecordPayment = async () => {
        if (!payData.amount || parseFloat(payData.amount) <= 0) return;
        setLoading(true);
        try {
            await secureAxios.patch(`/api/school/payroll/payruns/${monthYear}`, {
                type: "record_payment",
                uid: payData.uid,
                amount: payData.amount,
                method: payData.method
            }, {
                headers: { "x-branch-id": branch }
            });
            toast.success("Payment recorded");
            setShowPayModal(false);
            loadRun();
        } catch (err) {
            toast.error("Failed to record payment");
        } finally {
            setLoading(false);
        }
    };

    const loadRun = async () => {
        setLoading(true);
        try {
            const resp = await secureAxios.get(`/api/school/payroll/payruns/${monthYear}`, {
                headers: { "x-branch-id": branch }
            });
            setRun(resp.data);
        } catch (err) {
            toast.error("Failed to load payrun details");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateRecord = async (uid, netPayable, adjustments) => {
        const updatedRecords = run.employeeRecords.map(r =>
            r.uid === uid ? { ...r, netPayable, adjustments } : r
        );

        const newTotalPayout = updatedRecords.reduce((sum, r) => sum + (r.netPayable || 0), 0);

        setLoading(true);
        try {
            await secureAxios.patch(`/api/school/payroll/payruns/${monthYear}`, {
                employeeRecords: updatedRecords
            }, {
                headers: { "x-branch-id": branch }
            });
            setRun({ ...run, employeeRecords: updatedRecords, totalPayout: newTotalPayout });
            setEditingUid(null);
            toast.success("Record updated");
        } catch (err) {
            toast.error("Failed to update record");
        } finally {
            setLoading(false);
        }
    };

    const handleMarkPaid = async () => {
        if (!confirm("Are you sure you want to mark this whole month as PAID? This will clear all remaining balances and generate expense entries.")) return;
        setLoading(true);
        try {
            await secureAxios.patch(`/api/school/payroll/payruns/${monthYear}`, {
                status: "paid"
            }, {
                headers: { "x-branch-id": branch }
            });
            loadRun();
            toast.success("Payroll marked as paid!");
        } catch (err) {
            toast.error("Failed to update status");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (branch && isLoaded && schoolUser) loadRun();
    }, [branch, monthYear, isLoaded, schoolUser]);

    const filtered = useMemo(() => {
        if (!run) return [];
        return run.employeeRecords.filter(r =>
            r.name.toLowerCase().includes(search.toLowerCase()) ||
            r.employeeId.toLowerCase().includes(search.toLowerCase())
        );
    }, [run, search]);

    if (!run) return null;

    const totalPaidRun = run.employeeRecords.reduce((s, r) => s + (r.paidAmount || 0), 0);
    const totalRemainingRun = run.totalPayout - totalPaidRun;

    return (
        <RequirePermission permission="payroll.view">
            <div className="space-y-4 pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={`/school/${schoolId}/payroll`}
                            className="p-2.5 rounded-lg border border-(--border) bg-(--bg-card) text-(--text-muted) hover:text-(--primary) transition shadow-sm"
                        >
                            <ChevronLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Review Payroll: <span className="text-(--primary) font-bold">{formatMonthYear(monthYear)}</span></h1>
                            <p className="text-xs font-semibold text-(--text-muted)">
                                {run.status === 'paid' ? "Payroll finalized and paid" : 
                                 run.status === 'partial' ? "Payments started - Review and settle remaining balances" :
                                 "Draft - Review records and record initial payments"}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {run.status !== 'paid' && (
                            <button
                                onClick={handleMarkPaid}
                                className="flex items-center gap-2 bg-(--status-p-bg) text-(--status-p-text) border border-(--status-p-border) px-4 py-2 rounded-lg text-sm font-bold hover:bg-(--status-p-bg)/60 hover:-translate-y-0.5 shadow-md shadow-emerald-500/10 transition"
                            >
                                <CheckCircle2 size={16} /> Mark as Paid
                            </button>
                        )}
                        <button
                            onClick={() => { setSelectedRecord(null); setShowDownloadModal(true); }}
                            className="bg-(--bg-card) px-4 h-10 rounded-lg border border-(--border) text-(--text-muted) hover:text-(--primary) transition shadow-sm flex items-center gap-2 text-sm font-semibold"
                        >
                            <Printer size={16} /> Print All
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3 bg-(--bg-card) rounded-xl border border-(--border) shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-(--border) flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by name or employee ID..."
                                    className="w-full bg-(--bg-soft)/50 border border-(--border) pl-10 pr-4 py-2 rounded-xl text-xs outline-none focus:ring-2 focus:ring-(--primary)/20"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="text-xs font-medium text-(--text-muted)">
                                Showing {filtered.length} of {run.totalEmployees} records
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-(--bg-soft)/50 text-(--text-muted) text-[10px] uppercase tracking-wider font-bold">
                                        <th className="px-5 py-3 border-b border-(--border)">Staff</th>
                                        <th className="px-5 py-3 border-b border-(--border)">Adjustments</th>
                                        <th className="px-5 py-3 border-b border-(--border)">Net / Paid</th>
                                        <th className="px-5 py-3 border-b border-(--border)">Status</th>
                                        <th className="px-5 py-3 border-b border-(--border) text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--border)">
                                    {filtered.map((r) => {
                                        const remaining = r.netPayable - (r.paidAmount || 0);
                                        return (
                                            <tr key={r.uid} className="hover:bg-(--bg-soft)/30 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center font-bold text-xs">
                                                                {r.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold capitalize">{r.name}</p>
                                                                <p className="text-[10px] text-(--text-muted) font-medium">{r.employeeId} • {r.role}</p>
                                                            </div>
                                                        </div>
                                                        {run.isAdvanced && (
                                                            <div className="flex flex-wrap gap-1 mt-1 pl-11">
                                                                {r.earnings.map(e => (
                                                                    <span key={e.name} className="text-[8px] bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded border border-emerald-500/20">+{e.name}: Rs.{e.amount}</span>
                                                                ))}
                                                                {r.deductions.map(d => (
                                                                    <span key={d.name} className="text-[8px] bg-red-500/10 text-red-600 px-1 py-0.5 rounded border border-red-500/20">-{d.name}: Rs.{d.amount}</span>
                                                                ))}
                                                                {r.lopAmount > 0 && (
                                                                    <span className="text-[8px] bg-orange-500/10 text-orange-600 px-1 py-0.5 rounded border border-orange-500/20">LOP ({r.lopDays}d): Rs.{r.lopAmount}</span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {editingUid === r.uid ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                className="w-20 bg-(--bg-soft) border border-(--border) px-2 py-1 rounded text-xs outline-none font-bold"
                                                                autoFocus
                                                            />
                                                            <button
                                                                onClick={() => {
                                                                    const val = parseFloat(editValue) || 0;
                                                                    const baseForNet = r.fixedSalary + (r.earnings?.reduce((s, e) => s + e.amount, 0) || 0) - (r.deductions?.reduce((s, d) => s + d.amount, 0) || 0) - (r.lopAmount || 0);
                                                                    handleUpdateRecord(r.uid, baseForNet + val, val);
                                                                }}
                                                                className="text-[10px] bg-(--primary) text-white px-2 py-1 rounded font-bold"
                                                            >
                                                                Done
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 group/adj">
                                                            <span className={`text-xs font-bold ${r.adjustments > 0 ? 'text-emerald-500' : r.adjustments < 0 ? 'text-red-500' : 'text-(--text-muted)'}`}>
                                                                {r.adjustments > 0 ? `+Rs.${r.adjustments}` : r.adjustments < 0 ? `-Rs.${Math.abs(r.adjustments)}` : '0'}
                                                            </span>
                                                            {run.status !== 'paid' && r.status === 'unpaid' && (
                                                                <button
                                                                    onClick={() => { setEditingUid(r.uid); setEditValue(r.adjustments || ""); }}
                                                                    className="opacity-0 group-hover/adj:opacity-100 p-1 text-(--text-muted) hover:text-(--primary) transition"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-(--text)">Rs.{r.netPayable?.toLocaleString()}</span>
                                                        {(r.paidAmount > 0) && (
                                                            <span className="text-[10px] font-bold text-emerald-500">Paid: Rs.{r.paidAmount.toLocaleString()}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${r.status === 'paid' ? 'bg-emerald-500/10 text-emerald-600' : r.status === 'partial' ? 'bg-blue-500/10 text-blue-600' : 'bg-orange-500/10 text-orange-600'}`}>
                                                        {r.status || 'unpaid'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {run.status !== 'paid' && remaining > 0 && (
                                                            <button
                                                                onClick={() => { setPayData({ uid: r.uid, name: r.name, amount: remaining, method: 'cash' }); setShowPayModal(true); }}
                                                                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500 hover:text-white transition"
                                                            >
                                                                <CircleDollarSign size={12} /> Pay
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => { setSelectedRecord(r); setShowDownloadModal(true); }}
                                                            className="inline-flex items-center gap-1.5 text-[10px] font-bold text-(--primary) border border-(--primary)/20 bg-(--primary-soft)/50 px-3 py-1.5 rounded-lg hover:bg-(--primary) hover:text-white transition"
                                                        >
                                                            <Printer size={12} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <section className="bg-(--bg-card) p-5 rounded-xl border border-(--border) shadow-sm space-y-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                                <CircleDollarSign size={14} className="text-(--primary)" /> Payout Summary
                            </h2>
                            <div className="space-y-3">
                                <SummaryItem label="Total Employees" value={run.totalEmployees} />
                                <SummaryItem label="Net Payout" value={`Rs. ${run.totalPayout?.toLocaleString()}`} />
                                <SummaryItem label="Total Paid" value={<span className="text-emerald-500">{`Rs. ${totalPaidRun.toLocaleString()}`}</span>} />
                                <div className="pt-3 border-t border-(--border)">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-(--text-muted)">Remaining</p>
                                        <p className="text-lg font-bold text-(--primary)">Rs. {totalRemainingRun.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-(--bg-card) p-5 rounded-xl border border-(--border) shadow-sm space-y-4">
                            <h2 className="text-xs font-bold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                                <AlertCircle size={14} className="text-(--primary)" /> Info
                            </h2>
                            <div className="space-y-3 text-[11px] font-medium leading-relaxed">
                                <div className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-(--primary) mt-1 shrink-0" />
                                    <p>You can record partial payments for each employee separately.</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-(--primary) mt-1 shrink-0" />
                                    <p>The payrun auto-finalizes when all employees are fully paid.</p>
                                </div>
                                <div className="flex gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-(--primary) mt-1 shrink-0" />
                                    <p>Bulk "Mark as Paid" will clear all remaining balances at once.</p>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            {showPayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-(--bg-card) w-full max-w-sm rounded-2xl border border-(--border) shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
                            <h3 className="font-bold flex items-center gap-2 text-sm">
                                <CircleDollarSign size={18} className="text-emerald-500" /> Record Payment
                            </h3>
                            <button onClick={() => setShowPayModal(false)} className="p-1.5 hover:bg-(--border) rounded-full">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <p className="text-[10px] font-bold text-(--text-muted) uppercase mb-1">Employee</p>
                                <p className="text-sm font-bold capitalize">{payData.name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-(--text-muted) uppercase">Amount to Pay</p>
                                <input
                                    type="number"
                                    className="input w-full font-bold text-lg"
                                    value={payData.amount}
                                    onChange={(e) => setPayData({ ...payData, amount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-(--text-muted) uppercase">Method</p>
                                <select
                                    className="input w-full font-semibold"
                                    value={payData.method}
                                    onChange={(e) => setPayData({ ...payData, method: e.target.value })}
                                >
                                    <option value="cash">Cash</option>
                                    <option value="bank">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                        </div>
                        <div className="p-4 bg-(--bg-soft) border-t border-(--border)">
                            <button
                                onClick={handleRecordPayment}
                                className="btn-primary w-full py-3 font-semibold shadow-lg shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-700"
                            >
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showDownloadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-(--bg-card) w-full max-w-md rounded-2xl border border-(--border) shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
                            <h3 className="font-bold flex items-center gap-2">
                                <Printer size={18} className="text-(--primary)" /> Print Payslip{selectedRecord ? '' : 's'}
                            </h3>
                            <button onClick={() => setShowDownloadModal(false)} className="p-1.5 hover:bg-(--border) rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-(--text-muted) uppercase">Layout Size</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'full', label: 'Full A4 (1 Per Page)' },
                                        { id: '1/2', label: 'Half A4 (2 Per Page)' },
                                    ].map(sz => (
                                        <button
                                            key={sz.id}
                                            onClick={() => setPdfOptions({ ...pdfOptions, size: sz.id })}
                                            className={`p-3 rounded-xl border text-sm font-semibold transition-all
                                                ${pdfOptions.size === sz.id ? "border-(--primary) bg-(--primary-soft) text-(--primary)" : "border-(--border) hover:border-(--text-muted)"}`}
                                        >
                                            {sz.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {pdfOptions.size === '1/2' && (
                                <div className="p-4 rounded-xl border border-(--border) bg-(--bg-soft)/50 flex items-center justify-between">
                                    <div>
                                        <p className="font-semibold text-sm">Include Office Copy</p>
                                        <p className="text-[11px] text-(--text-muted) font-semibold uppercase tracking-wider h-auto leading-normal mt-1">
                                            Prints 1 Employee + 1 Office Copy on the same page
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setPdfOptions({ ...pdfOptions, showOfficeCopy: !pdfOptions.showOfficeCopy })}
                                        className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${pdfOptions.showOfficeCopy ? 'bg-(--primary)' : 'bg-(--border)'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${pdfOptions.showOfficeCopy ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>
                            )}

                            <div className="bg-(--bg-soft) p-4 rounded-xl border border-(--border) text-sm space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-(--text-muted)">Selected:</span>
                                    <span className="font-semibold text-(--primary)">
                                        {selectedRecord ? `1 Employee (${selectedRecord.name})` : `${run.totalEmployees} Employees`}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-(--bg-soft) border-t border-(--border)">
                            <button
                                onClick={confirmDownload}
                                className="btn-primary w-full py-3 font-semibold shadow-lg shadow-(--primary-soft)/20"
                            >
                                Generate PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RequirePermission>
    );
}

function SummaryItem({ label, value }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-(--text-muted) font-medium">{label}</span>
            <span className="font-bold">{value}</span>
        </div>
    );
}
