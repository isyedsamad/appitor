"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Calendar,
  Wallet,
  IndianRupee,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  FileText,
  FileSpreadsheet,
  History,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/dateUtils";
import { canManage } from "@/lib/school/permissionUtils";
import { generateDayBookPDF } from "@/lib/exports/finance/exportDayBookPdf";
import { exportDayBookToExcel } from "@/lib/exports/finance/exportDayBookExcel";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DayBookPage() {
  const { schoolUser, setLoading } = useSchool();
  const { branch, branchInfo } = useBranch();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayBook, setDayBook] = useState(null);

  const loadDayBook = async (dateObj) => {
    const key = formatDate(dateObj);
    setLoading(true);

    try {
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "fees",
        "day_book",
        "items",
        key
      );

      const snap = await getDoc(ref);
      setDayBook(snap.exists() ? snap.data() : null);
    } catch (e) {
      toast.error("Failed to load day book");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (schoolUser && branch) loadDayBook(selectedDate);
  }, [schoolUser, branch]);

  const collectionData = dayBook?.collections
    ? Object.entries(dayBook.collections)
      .filter(([key, val]) => key !== "total" && val > 0)
      .map(([key, val]) => ({ name: key.toUpperCase(), value: val }))
    : [];

  const comparisonData = dayBook
    ? [
      { name: "Collection", amount: dayBook.collections?.total || 0 },
      { name: "Refund", amount: dayBook.refunds?.total || 0 },
    ]
    : [];

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "fee.reports.manage", currentPlan);

  return (
    <RequirePermission permission="fee.reports.view">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <History size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Day Book Analytics</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Daily collection, refund insights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <input
                type="date"
                className="input h-10"
                value={selectedDate.toISOString().split("T")[0]}
                onChange={(e) => {
                  const d = new Date(e.target.value);
                  setSelectedDate(d);
                  loadDayBook(d);
                }}
              />
            </div>
            {editable && (
              <button
                onClick={() => loadDayBook(selectedDate)}
                className="btn-outline h-10 px-4 flex gap-2 items-center"
              >
                <RefreshCcw size={16} />
                Sync
              </button>
            )}
            <div className="flex items-center justify-end gap-1 bg-(--bg-card) rounded-lg border border-(--border)">
              <button
                onClick={() => generateDayBookPDF({ schoolName: schoolUser?.schoolName, branchInfo, dayData: dayBook, selectedDate })}
                className="p-2 text-(--text-muted) hover:text-(--primary) hover:bg-(--primary-soft) rounded-md transition-all tooltip"
                title="Export PDF"
                disabled={!dayBook}
              >
                <FileText size={18} /> PDF
              </button>
              <button
                onClick={() => exportDayBookToExcel({ dayData: dayBook, branchInfo, selectedDate })}
                className="p-2 text-(--text-muted) hover:text-green-600 hover:bg-(--status-p-bg) rounded-md transition-all tooltip"
                title="Export Excel"
                disabled={!dayBook}
              >
                <FileSpreadsheet size={18} /> Excel
              </button>
            </div>
          </div>
        </div>

        {!dayBook && (
          <div className="bg-(--bg-card) border border-(--border) rounded-2xl py-20 text-center shadow-sm">
            <div className="max-w-xs mx-auto space-y-3">
              <div className="w-16 h-16 bg-(--bg-soft) rounded-full flex items-center justify-center mx-auto text-(--text-muted)">
                <Calendar size={32} />
              </div>
              <p className="text-(--text-muted) font-medium">No transactions recorded for {selectedDate.toDateString()}</p>
            </div>
          </div>
        )}

        {dayBook && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                label="Total Collection"
                value={dayBook.collections?.total || 0}
                color="accent"
                icon={<Wallet size={20} />}
              />
              <SummaryCard
                label="Total Refund"
                value={dayBook.refunds?.total || 0}
                color="danger"
                icon={<ArrowDownLeft size={20} />}
              />
              <SummaryCard
                label="Net Balance"
                value={dayBook.net || 0}
                color="primary"
                icon={<IndianRupee size={20} />}
              />
              <SummaryCard
                label="Transactions"
                value={dayBook.transactions || 0}
                color="warning"
                isCount
                icon={<ArrowUpRight size={20} />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
                <h3 className="text-md font-bold mb-6 flex items-center gap-2">
                  < IndianRupee size={18} className="text-(--primary)" /> Collection vs Refund Comparison
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                        cursor={{ fill: 'var(--bg-soft)', opacity: 0.4 }}
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                        {comparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "var(--status-p-text)" : "var(--status-a-text)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
                <h3 className="text-md font-bold mb-6">Mode Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={collectionData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {collectionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px' }}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BreakdownCard
                title="Detailed Collection Breakdown"
                rows={[
                  { label: "Cash", value: dayBook.collections?.cash || 0 },
                  { label: "UPI", value: dayBook.collections?.upi || 0 },
                  { label: "Card", value: dayBook.collections?.card || 0 },
                  { label: "Net Banking", value: dayBook.collections?.netbanking || 0 },
                  { label: "Wallet (PayTM, PhonePe)", value: dayBook.collections?.wallet || 0 },
                  { label: "Cheque", value: dayBook.collections?.cheque || 0 },
                ]}
                themeColor="text-green-600"
              />
              <BreakdownCard
                title="Detailed Refund Breakdown"
                rows={[
                  { label: "Cash", value: dayBook.refunds?.cash || 0 },
                  { label: "UPI / QR", value: dayBook.refunds?.upi || 0 },
                  { label: "Card", value: dayBook.refunds?.card || 0 },
                  { label: "Net Banking", value: dayBook.refunds?.netbanking || 0 },
                  { label: "Wallet (PayTM, PhonePe)", value: dayBook.refunds?.wallet || 0 },
                  { label: "Cheque", value: dayBook.refunds?.cheque || 0 },
                ]}
                themeColor="text-red-600"
              />
            </div>

            <div className="flex items-center justify-between px-2 pt-2">
              <div className="text-[11px] font-bold text-(--text-muted) uppercase tracking-widest">
                Daily Summary Snapshot
              </div>
              <div className="text-[11px] font-medium text-(--text-muted) flex items-center gap-2">
                <Clock size={12} /> Last synced: {dayBook.updatedAt?.toDate ? dayBook.updatedAt.toDate().toLocaleString() : "-"}
              </div>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}

function SummaryCard({ label, value, color, isCount, icon }) {
  const getThemeVars = () => {
    switch (color) {
      case "danger":
        return {
          bg: "bg-(--status-o-bg)",
          text: "text-(--status-o-text)",
          border: "border-(--status-o-border)",
          gradient: "from-(--status-o-bg)/30 to-transparent",
          icon: icon || <AlertTriangle size={20} />
        };
      case "accent":
        return {
          bg: "bg-(--status-p-bg)",
          text: "text-(--status-p-text)",
          border: "border-(--status-p-border)",
          gradient: "from-(--status-p-bg)/30 to-transparent",
          icon: icon || <CheckCircle2 size={20} />
        };
      case "warning":
        return {
          bg: "bg-(--status-a-bg)",
          text: "text-(--status-a-text)",
          border: "border-(--status-a-border)",
          gradient: "from-(--status-a-bg)/30 to-transparent",
          icon: icon || <Clock size={20} />
        };
      default:
        return {
          bg: "bg-(--status-l-bg)",
          text: "text-(--status-l-text)",
          border: "border-(--status-l-border)",
          gradient: "from-(--status-l-bg)/30 to-transparent",
          icon: icon || <Wallet size={20} />
        };
    }
  };

  const theme = getThemeVars();

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.gradient} bg-(--bg-card) px-5 py-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-(--text-muted)">{label}</p>
          <h3 className={`text-2xl font-bold tracking-tight ${theme.text}`}>
            {!isCount && "₹ "}{(value == 0 ? 0 : value.toString().padStart(2, "0") || 0).toLocaleString()}
          </h3>
        </div>
        <div className={`p-2.5 rounded-xl ${theme.bg} ${theme.text} border ${theme.border} shadow-sm`}>
          {theme.icon}
        </div>
      </div>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${theme.gradient} opacity-20 blur-2xl rounded-full -mr-12 -mt-12 pointer-events-none`} />
    </div>
  );
}

function BreakdownCard({ title, rows, themeColor }) {
  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
      <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-(--text-muted)">{title}</h3>
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="font-medium">{r.label}</span>
              <span className="font-bold">₹ {r.value.toLocaleString()}</span>
            </div>
            <div className="w-full h-1.5 bg-(--bg-soft) rounded-full overflow-hidden">
              <div
                className={`h-full ${themeColor.replace('text', 'bg')} transition-all duration-1000`}
                style={{ width: `${Math.min(100, (r.value / (rows.reduce((a, b) => a + b.value, 0) || 1)) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
