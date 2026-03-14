"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, BookOpen, Calendar, User, ArrowDown, RotateCcw, Download, FileText, X, Info, CreditCard, Wallet as WalletIcon, CheckCircle2, AlertTriangle, Filter } from "lucide-react";
import { collection, query, where, orderBy, limit, startAfter, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { exportLedgerToExcel } from "@/lib/exports/fees/exportLedgerExcel";
import { generateLedgerPDF } from "@/lib/exports/fees/exportLedgerPdf";
import { formatDateSlash, formatMonthYear } from "@/lib/dateUtils";

const PAGE_SIZE = 50;

export default function FeeLedgerPage() {
  const { schoolUser, setLoading, currentSession, sessionList, schoolInfo } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [sessionId, setSessionId] = useState(null);
  const [searchType, setSearchType] = useState("date");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [queryText, setQueryText] = useState("");
  const [rows, setRows] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [filterType, setFilterType] = useState("all");
  const [filterMode, setFilterMode] = useState("all");
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    if (currentSession) setSessionId(currentSession);
  }, [currentSession]);

  const searchLedger = async (loadMore = false) => {
    if (searchType === "date") {
      if (!startDate || !endDate) {
        toast.error("Please select both dates");
        return;
      }
      const s = new Date(startDate);
      const e = new Date(endDate);
      const diffTime = Math.abs(e - s);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 2) {
        toast.error("Date range cannot exceed 3 days");
        return;
      }
    } else if (!queryText) {
      toast.error("Enter App ID");
      return;
    }

    setLoading(true);
    try {
      const baseRef = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "ledger", "items");
      let q;

      if (searchType === "date") {
        const startTs = Timestamp.fromDate(new Date(new Date(startDate).setHours(0, 0, 0, 0)));
        const endTs = Timestamp.fromDate(new Date(new Date(endDate).setHours(23, 59, 59, 999)));

        q = query(
          baseRef,
          where("createdAt", ">=", startTs),
          where("createdAt", "<=", endTs),
          orderBy("createdAt", "desc"),
          ...(loadMore && lastDoc ? [startAfter(lastDoc)] : []),
          limit(PAGE_SIZE)
        );
      } else {
        q = query(
          baseRef,
          where("appId", "==", queryText.toUpperCase()),
          where("sessionId", "==", sessionId),
          orderBy("createdAt", "desc"),
          ...(loadMore && lastDoc ? [startAfter(lastDoc)] : []),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRows(loadMore ? [...rows, ...data] : data);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchType = filterType === "all" || r.type === filterType;
      const matchMode = filterMode === "all" || r.paymentMode === filterMode;
      return matchType && matchMode;
    });
  }, [rows, filterType, filterMode]);

  const summary = useMemo(() => {
    return filteredRows.reduce((acc, r) => {
      if (r.type === "refund") {
        acc.totalRefund += Math.abs(r.amount);
      } else {
        acc.totalPaid += r.amount;
      }
      acc.netBalance = acc.totalPaid - acc.totalRefund;
      return acc;
    }, { totalPaid: 0, totalRefund: 0, netBalance: 0 });
  }, [filteredRows]);

  return (
    <RequirePermission permission="fee.reports.view">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Fee Ledger</h1>
              <p className="text-xs font-semibold text-(--text-muted)">{branchInfo?.name} · Transaction Insights</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => generateLedgerPDF({ schoolName: schoolUser?.schoolName, branchInfo, schoolInfo, transactions: filteredRows, filters: { startDate, endDate }, summary })}
              disabled={!filteredRows.length}
              className="btn-primary flex gap-2"
            >
              <FileText size={16} /> PDF Report
            </button>
            <button
              onClick={() => exportLedgerToExcel({ rows: filteredRows, schoolName: schoolUser.schoolName, branchName: branchInfo?.name, fromLabel: searchType === "date" ? `${startDate} to ${endDate}` : queryText })}
              disabled={!filteredRows.length}
              className="btn-outline flex gap-2"
            >
              <Download size={16} className="text-green-500" /> Excel
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard label="Total Collections" value={summary.totalPaid} color="accent" />
          <SummaryCard label="Total Refunds" value={summary.totalRefund} color="danger" />
          <SummaryCard label="Net Balance" value={summary.netBalance} color="primary" />
        </div>

        <div className="bg-(--bg-card) border border-(--border) p-5 rounded-xl shadow-sm space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            <div className="flex-none">
              <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Search By</label>
              <div className="flex border border-(--border) w-fit rounded-md overflow-hidden h-10">
                {["date", "student"].map(t => (
                  <button
                    key={t}
                    onClick={() => { setSearchType(t); setRows([]); setLastDoc(null); }}
                    className={`px-4 text-sm font-medium transition-colors ${searchType === t ? "bg-(--primary) text-white" : "bg-(--bg) text-(--text-muted) hover:bg-(--bg-soft)"}`}
                  >
                    {t === "date" ? <Calendar size={14} className="inline" /> : <User size={14} className="inline" />}
                    {t === "date" ? "Date" : "App ID"}
                  </button>
                ))}
              </div>
            </div>

            {searchType === "date" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 flex-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">From</label>
                  <input type="date" className="input w-full" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">To</label>
                  <input type="date" className="input w-full" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs hidden sm:block opacity-0 mb-1 block">Search</label>
                  <button onClick={() => searchLedger()} className="btn-primary w-full h-10">
                    <Search size={18} /> Search
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 flex-1 gap-3">
                <div>
                  <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Session</label>
                  <select className="input w-full h-10" value={sessionId || ""} onChange={e => setSessionId(e.target.value)}>
                    {sessionList?.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">App ID</label>
                  <input className="input w-full h-10 uppercase" placeholder="A1001" value={queryText} onChange={e => setQueryText(e.target.value)} onKeyDown={e => e.key === "Enter" && searchLedger()} />
                </div>
                <div>
                  <label className="text-xs hidden sm:block opacity-0 mb-1 block">Search</label>
                  <button onClick={() => searchLedger()} className="btn-primary w-full h-10">
                    <Search size={18} /> Search
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-(--border) flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-(--text-muted)" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <select className="input py-1.5 h-auto text-xs font-semibold w-32" value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="payment">Payments</option>
              <option value="refund">Refunds</option>
              <option value="discount">Discount</option>
            </select>
            <select className="input py-1.5 h-auto text-xs font-semibold w-32" value={filterMode} onChange={e => setFilterMode(e.target.value)}>
              <option value="all">All Modes</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank</option>
              <option value="cheque">Cheque</option>
            </select>
          </div>
        </div>

        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-(--bg-soft) border-b border-(--border)">
                  <th className="px-5 py-4 font-semibold text-(--text-muted)">Receipt No</th>
                  <th className="px-5 py-4 font-semibold text-(--text-muted)">Student ID</th>
                  <th className="px-5 py-4 font-semibold text-(--text-muted)">Date</th>
                  <th className="px-5 py-4 font-semibold text-(--text-muted)">Mode</th>
                  <th className="px-5 py-4 font-semibold text-(--text-muted) text-right">Amount</th>
                  <th className="px-5 py-4 font-semibold text-(--text-muted) text-right">Type</th>
                  <th className="px-5 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-(--text-muted)">
                      No transaction records found matching active filters.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map(r => (
                    <tr key={r.id} className="hover:bg-(--bg-soft)/50 transition-colors">
                      <td className="px-5 py-4 font-semibold">{r.receiptNo || formatMonthYear(r.createdMonth) || '--'}</td>
                      <td className="px-5 py-4 uppercase font-medium">{r.appId || '--'}</td>
                      <td className="px-5 py-4 text-(--text-muted)">{formatDateSlash(r.createdAt?.toDate())}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {r.type == "discount" ? '' : r.paymentMode === "cash" ? <WalletIcon size={14} /> : <CreditCard size={14} />}
                          <span className="capitalize">{r.paymentMode || "N/A"}</span>
                        </div>
                      </td>
                      <td className={`px-5 py-4 text-right font-bold ${r.type === "refund" ? "text-(--status-a-text)" : r.type == "payroll" ? "text-(--status-l-text)" : "text-(--status-p-text)"}`}>
                        ₹ {Math.abs(r.amount).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end">
                          <span className={`px-2.5 py-1 text-[10px] uppercase font-bold rounded-md border ${r.type === "refund" ? "bg-(--status-a-bg) text-(--status-a-text) border-(--status-a-border)" : r.type == "payroll" ? "bg-(--status-o-bg) text-(--status-o-text) border-(--status-o-border)" : "bg-(--status-p-bg) text-(--status-p-text) border-(--status-p-border)"}`}>
                            {r.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button onClick={() => setSelectedTransaction(r)} className="text-(--text-muted) hover:text-(--primary) transition-colors p-1">
                          <Info size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="p-4 border-t border-(--border) flex justify-center">
              <button onClick={() => searchLedger(true)} className="btn-secondary flex items-center gap-2 text-xs font-semibold px-6">
                Load More Records <ArrowDown size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-(--bg-card) border border-(--border) w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-(--border) bg-(--bg-soft)">
              <h3 className="font-bold text-lg">Transaction Details</h3>
              <button onClick={() => setSelectedTransaction(null)} className="p-1.5 hover:bg-(--border) rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">{selectedTransaction.type == "payroll" ? "Payrun Month" : "Receipt No"}</p>
                  <p className="font-semibold">{selectedTransaction.receiptNo || formatMonthYear(selectedTransaction.createdMonth)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">Date & Time</p>
                  <p className="font-semibold">{selectedTransaction.createdAt?.toDate().toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-4 border-t border-(--border)">
                <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">Remark / Note</p>
                <p className="text-sm mt-1">{selectedTransaction.remark || "N/A"}</p>
              </div>
              <div className="pt-4 border-t border-(--border) bg-(--bg-soft)/50 -mx-6 px-6 py-4">
                <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">Processed By</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="w-8 h-8 rounded-full bg-(--primary) text-white flex items-center justify-center text-xs font-bold uppercase">
                    {selectedTransaction.createdBy?.name?.[0] || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-bold">{selectedTransaction.createdBy?.name || "System"}</p>
                    <p className="text-[10px] text-(--text-muted) uppercase">{selectedTransaction.createdBy?.role || "Admin"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </RequirePermission>
  );
}

function SummaryCard({ label, value, color }) {
  const getTheme = () => {
    switch (color) {
      case "danger": return { bg: "bg-(--status-o-bg)", text: "text-(--status-o-text)", border: "border-(--status-o-border)", gradient: "from-(--status-o-bg)/50 to-transparent", icon: <AlertTriangle size={20} /> };
      case "accent": return { bg: "bg-(--status-p-bg)", text: "text-(--status-p-text)", border: "border-(--status-p-border)", gradient: "from-(--status-p-bg)/50 to-transparent", icon: <CheckCircle2 size={20} /> };
      default: return { bg: "bg-(--status-l-bg)", text: "text-(--status-l-text)", border: "border-(--status-l-border)", gradient: "from-(--status-l-bg)/50 to-transparent", icon: <Filter size={20} /> };
    }
  };
  const theme = getTheme();
  return (
    <div className={`relative overflow-hidden rounded-lg border ${theme.border} bg-gradient-to-br ${theme.gradient} bg-(--bg-card) px-5 py-4 shadow-sm transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-(--text-muted)">{label}</p>
          <h3 className={`text-2xl font-bold tracking-tight ${theme.text}`}>₹ {value.toLocaleString()}</h3>
        </div>
        <div className={`p-2 rounded-xl border ${theme.bg} ${theme.text} ${theme.border}`}>{theme.icon}</div>
      </div>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.gradient} opacity-20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none`} />
    </div>
  );
}
