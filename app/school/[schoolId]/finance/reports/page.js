"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Percent,
  AlertTriangle,
  Search,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { formatMonth, formatMonthMMYYYYToYYYYMM } from "@/lib/dateUtils";
import { buildMonthsForSession } from "@/lib/school/fees/monthUtil";
import { generateFinanceReportPDF } from "@/lib/exports/finance/exportFinanceReportPdf";
import { exportFinanceReportToExcel } from "@/lib/exports/finance/exportFinanceReportExcel";
import { canManage } from "@/lib/school/permissionUtils";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function FinanceReportsPage() {
  const { schoolUser, sessionList, setLoading } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [mode, setMode] = useState("month");
  const [month, setMonth] = useState(formatMonth());
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [pieData, setPieData] = useState([]);

  const loadMonth = async () => {
    setLoading(true);
    try {
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "fees",
        "month_book",
        "items",
        month
      );
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setSummary(null);
        setTrend([]);
        toast.error("No data found for this month!");
        return;
      }
      const data = snap.data();
      setSummary(data);
      setTrend([
        {
          label: month,
          collections: data.collections || { total: 0 },
          refunds: data.refunds || { total: 0 },
          net: data.net || 0,
        },
      ]);
    } catch {
      toast.error("Failed to Load Month Report");
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async () => {
    if (sessionId == "") return;
    setLoading(true);
    try {
      const session = sessionList.find((s) => s.id === sessionId);
      const months = buildMonthsForSession(session);
      const fetchPromises = months.map(async (m) => {
        const id = `${m.key.split("-")[1]}-${m.key.split("-")[0]}`;
        const snap = await getDoc(
          doc(
            db,
            "schools",
            schoolUser.schoolId,
            "branches",
            branch,
            "fees",
            "month_book",
            "items",
            id
          )
        );
        if (snap.exists()) {
          const d = snap.data();
          return {
            label: m.label,
            collections: d.collections || { total: 0 },
            refunds: d.refunds || { total: 0 },
            net: d.net || 0,
          };
        }
        return null;
      });
      const results = await Promise.all(fetchPromises);
      const rows = results.filter(Boolean);
      const totals = rows.reduce(
        (a, b) => ({
          collections: (a.collections || 0) + (b.collections?.total || 0),
          refunds: (a.refunds || 0) + (b.refunds?.total || 0),
          net: (a.net || 0) + (b.net || 0),
        }),
        { collections: 0, refunds: 0, net: 0 }
      );
      setSummary(totals);
      setTrend(rows);
    } catch (err) {
      console.log(err);
      toast.error("Failed to Load Session Report");
    } finally {
      setLoading(false);
    }
  };

  const refundRatio = useMemo(() => {
    if (!summary) return 0;
    const collections = mode === "month" ? summary.collections.total : summary.collections;
    const refunds = mode === "month" ? summary.refunds.total : summary.refunds;
    if (!collections) return 0;
    return ((refunds / collections) * 100).toFixed(2);
  }, [summary, mode]);

  useEffect(() => {
    if (trend.length > 0) {
      const target = trend[trend.length - 1];
      setPieData(
        target.collections
          ? Object.entries(target.collections)
            .filter(([k]) => k !== "total" && target.collections[k] > 0)
            .map(([k, v]) => ({ name: k.toUpperCase(), value: v }))
          : []
      );
    }
  }, [trend]);

  const bestMonth = trend.reduce((a, b) => ((b.net || 0) > (a.net || 0) ? b : a), trend[0] || {});
  const worstMonth = trend.reduce((a, b) => ((b.net || 0) < (a.net || 0) ? b : a), trend[0] || {});

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "fee.reports.manage", currentPlan);

  return (
    <RequirePermission permission="fee.reports.view">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 shadow-sm rounded-lg border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <TrendingUp size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Finance Analytics</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Comprehensive financial performance & reports
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-(--bg-card) p-1 rounded-lg border border-(--border)">
              {["month", "session"].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setMode(t);
                    setSummary(null);
                    setTrend([]);
                  }}
                  className={`px-4 py-2 text-xs font-bold rounded-md transition-all ${mode === t
                    ? "bg-(--primary) text-white shadow-sm"
                    : "text-(--text-muted) hover:text-(--text)"
                    }`}
                >
                  {t === "month" ? "Monthly" : "Session"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-2 grid-cols-1 md:grid-cols-3 items-end">
          {mode === "month" ? (
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs font-semibold text-(--text-muted) px-1">Select Month</label>
              <input
                type="month"
                className="input w-full h-10"
                value={month && formatMonthMMYYYYToYYYYMM(month)}
                onChange={(e) => setMonth(formatMonth(new Date(e.target.value)))}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-[200px] space-y-1">
              <label className="text-xs font-semibold text-(--text-muted) px-1">Academic Session</label>
              <select
                className="input w-full h-10"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="">Select Session</option>
                {sessionList.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
            </div>
          )}
          <button onClick={mode === "month" ? loadMonth : loadSession} className="btn-primary w-fit">
            <Search size={18} /> Analyze
          </button>

          <div className="flex items-center justify-end gap-1">
            <div className="flex items-center gap-1 bg-(--bg-card) rounded-lg border border-(--border) w-fit">
              <button
                onClick={() => generateFinanceReportPDF({ branchInfo, summary, trend, mode, label: mode === 'month' ? month : sessionId })}
                className="p-2 text-(--text-muted) hover:text-(--primary) hover:bg-(--primary-soft) rounded-md transition-all"
                title="Export PDF"
                disabled={!summary}
              >
                <FileText size={18} /> PDF
              </button>
              <button
                onClick={() => exportFinanceReportToExcel({ summary, trend, mode, label: mode === 'month' ? month : sessionId, branchInfo })}
                className="p-2 text-(--text-muted) hover:text-green-600 hover:bg-(--status-p-bg) rounded-md transition-all"
                title="Export Excel"
                disabled={!summary}
              >
                <FileSpreadsheet size={18} /> Excel
              </button>
            </div>
          </div>
        </div>

        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Collections"
              value={mode === "month" ? summary.collections.total : summary.collections}
              color="accent"
              icon={<TrendingUp size={20} />}
            />
            <SummaryCard
              label="Total Refunds"
              value={mode === "month" ? summary.refunds.total : summary.refunds}
              color="danger"
              icon={<TrendingDown size={20} />}
            />
            <SummaryCard
              label="Net Revenue"
              value={summary.net}
              color="primary"
              icon={<IndianRupee size={20} />}
            />
            <SummaryCard
              label="Refund Ratio"
              value={refundRatio}
              color="warning"
              isPercent
              icon={<Percent size={20} />}
            />
          </div>
        )}

        {trend.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-(--text-muted)">
                  Financial Flow Trend
                </h3>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                      <Area type="monotone" dataKey="collections.total" stroke="#10b981" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-widest text-(--text-muted)">
                  Payment Mode Dependency
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '12px', fontSize: '12px' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest text-(--text-muted)">
                  <AlertTriangle size={16} className="text-amber-500" /> Key Insights
                </h3>
                <div className="space-y-4">
                  <InsightItem label="Performance Peak" value={bestMonth.label} description="Highest net revenue period" />
                  <InsightItem label="Lowest Point" value={worstMonth.label} description="Minimum collection recorded" />
                  <div className={`p-4 rounded-xl border ${Number(refundRatio) > 10 ? 'bg-red-50 border-red-100 text-red-900' : 'bg-green-50 border-green-100 text-green-900'}`}>
                    <div className="text-xs font-bold uppercase mb-1">Health Status</div>
                    <div className="text-sm font-medium">
                      {Number(refundRatio) > 10
                        ? "High refund ratio detected. Review refund policies."
                        : "Financial status is healthy. Collections are stable."}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold mb-4 uppercase tracking-widest text-(--text-muted)">Modes Breakdown</h3>
                <div className="space-y-3">
                  {pieData.map((item, idx) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{item.name}</span>
                        <span>₹ {item.value.toLocaleString()}</span>
                      </div>
                      <div className="w-full h-1.5 bg-(--bg-soft) rounded-full overflow-hidden">
                        <div className="h-full bg-(--primary) transition-all duration-700" style={{ width: `${Math.min(100, (item.value / (summary.collections?.total || summary.collections || 1)) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function SummaryCard({ label, value, color, isCount, isPercent, icon }) {
  const getThemeVars = () => {
    switch (color) {
      case "danger":
        return {
          bg: "bg-(--status-o-bg)",
          text: "text-(--status-o-text)",
          border: "border-(--status-o-border)",
          gradient: "from-(--status-o-bg)/30 to-transparent",
          icon: icon || <TrendingDown size={20} />
        };
      case "accent":
        return {
          bg: "bg-(--status-p-bg)",
          text: "text-(--status-p-text)",
          border: "border-(--status-p-border)",
          gradient: "from-(--status-p-bg)/30 to-transparent",
          icon: icon || <TrendingUp size={20} />
        };
      case "warning":
        return {
          bg: "bg-(--status-a-bg)",
          text: "text-(--status-a-text)",
          border: "border-(--status-a-border)",
          gradient: "from-(--status-a-bg)/30 to-transparent",
          icon: icon || <Percent size={20} />
        };
      default:
        return {
          bg: "bg-(--status-l-bg)",
          text: "text-(--status-l-text)",
          border: "border-(--status-l-border)",
          gradient: "from-(--status-l-bg)/30 to-transparent",
          icon: icon || <IndianRupee size={20} />
        };
    }
  };

  const theme = getThemeVars();

  return (
    <div className={`relative overflow-hidden rounded-2xl border ${theme.border} bg-gradient-to-br ${theme.gradient} bg-(--bg-card) px-5 py-4 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-semibold text-(--text-muted) mb-1">{label}</p>
          <h3 className={`text-2xl font-bold tracking-tight ${theme.text}`}>
            {isPercent ? "" : isCount ? "" : "₹ "}{(value || 0).toLocaleString()}{isPercent ? "%" : ""}
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

function InsightItem({ label, value, description }) {
  return (
    <div className="space-y-0.5 border-l-2 border-(--border) pl-3 py-1">
      <div className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">{label}</div>
      <div className="text-sm font-bold">{value || "N/A"}</div>
      <div className="text-[11px] text-(--text-muted)">{description}</div>
    </div>
  );
}
