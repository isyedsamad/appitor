"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Percent,
  AlertTriangle,
  Wallet,
  Search,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from "recharts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { formatMonth, formatMonthMMYYYYToYYYYMM, toInputDate } from "@/lib/dateUtils";
import { buildMonthsForSession } from "@/lib/school/fees/monthUtil";

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
const pct = (cur, prev) =>
  !prev ? 0 : Number((((cur - prev) / prev) * 100).toFixed(1));

export default function FinanceReportsPage() {
  const { schoolUser, sessionList, setLoading } = useSchool();
  const { branch } = useBranch();
  const [mode, setMode] = useState("month");
  const [month, setMonth] = useState(formatMonth());
  const [sessionId, setSessionId] = useState("");
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [pieData, setPieData] = useState('');
  const loadMonth = async () => {
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
        toast.error("No data found!");
        return;
      }
      setSummary(snap.data());
      setTrend([]);
    } catch {
      toast.error("Failed to Load Month Report");
    }
  };

  const loadSession = async () => {
    if(sessionId == '') return;
    setLoading(true);
    try {
      const session = sessionList.find(s => s.id === sessionId);
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
            modes: d.collections || {},
          };
        }
        return null;
      });
      const results = await Promise.all(fetchPromises);
      const rows = results.filter(Boolean);
      const totals = rows.reduce(
        (a, b) => ({
          'collections': (a.collections?.total || 0) + (b.collections?.total || 0),
          'refunds': (a.refunds?.total || 0) + (b.refunds?.total || 0),
          net: (a.net || 0) + (b.net || 0),
        }),
        { 'collections': 0, 'refunds': 0, net: 0 }
      );
      setSummary(totals);
      setTrend(rows);
    } catch(err) {
      console.log(err);
      toast.error("Failed to Load Session Report");
    } finally {
      setLoading(false);
    }
  };

  const refundRatio = summary
    ? mode == 'month' ? ((summary.refunds.total / summary.collections.total) * 100).toFixed(2)
    : ((summary.refunds / summary.collections) * 100).toFixed(2)
    : 0;

  useEffect(() => {
    setPieData(trend[0]?.collections
      ? Object.entries(trend[0].collections)
          .filter(([k]) => k !== "total")
          .map(([k, v]) => ({ name: k, value: v }))
      : []);
  }, [trend])
  
  const bestMonth = trend.reduce(
    (a, b) => (b.net > a.net ? b : a),
    trend[0] || {}
  );
  const worstMonth = trend.reduce(
    (a, b) => (b.net < a.net ? b : a),
    trend[0] || {}
  );

  return (
    <RequirePermission permission="fee.view">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-(--primary-soft) text-(--primary)">
            <BarChart3 />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Finance Report</h1>
            <p className="text-sm text-(--text-muted)">
              Deep financial analytics & performance comparison
            </p>
          </div>
        </div>
        <div className="flex rounded-xl overflow-hidden w-fit">
          {["month", "session"].map(t => (
            <button
              key={t}
              onClick={() => {
                setMode(t);
                setSummary(null);
                setTrend([]);
              }}
              className={`px-4 py-2 border border-(--border) rounded-none mt-2
                ${mode === t ? "bg-(--primary) text-white" : "bg-(--bg-card)"}
                ${t === "month" ? "rounded-l-md" : "rounded-r-md"}`}
            >
              {t === "month" ? "Month View" : "Session View"}
            </button>
          ))}
        </div>
        <div className="flex max-w-sm gap-4">
          {mode === "month" ? (
            <>
              <input
                type="month"
                className="input"
                value={month && formatMonthMMYYYYToYYYYMM(month)}
                onChange={e => {
                  setMonth(formatMonth(new Date(e.target.value)))
                }}
              />
              <button onClick={loadMonth} className="btn-primary">
                <Search size={16} /> Analyze
              </button>
            </>
          ) : (
            <>
              <select
                className="input"
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
              >
                <option value="">Select Session</option>
                {sessionList.map(s => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
              <button onClick={loadSession} className="btn-primary">
              <Search size={16} /> Analyze
              </button>
            </>
          )}
        </div>
        {summary && (
          <div className="grid md:grid-cols-4 gap-4">
            <Stat title="Collections" value={mode == 'month' ? summary.collections.total : summary.collections} icon={TrendingUp} />
            <Stat title="Refunds" value={mode == 'month' ? summary.refunds.total : summary.refunds} negative icon={TrendingDown} />
            <Stat title="Net Revenue" value={summary.net} icon={IndianRupee} />
            <Stat title="Refund %" value={`${refundRatio}%`} icon={Percent} />
          </div>
        )}
        {trend.length > 0 && (
          <div className="grid lg:grid-cols-2 gap-6">
            <ChartCard title="Cash Flow Trend">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trend}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Line dataKey="collections.total" stroke="#22c55e" />
                  <Line dataKey="refunds.total" stroke="#ef4444" />
                  <Line dataKey="net" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Net Revenue Momentum">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Area dataKey="net" stroke="#3b82f6" fill="#3b82f633" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Payment Mode Dependency">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie 
                    data={pieData} 
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Key Insights">
              <div className="space-y-3 text-sm">
                <Insight label="Best Month" value={bestMonth.label} />
                <Insight label="Worst Month" value={worstMonth.label} />
                <Insight
                  label="Refund Risk"
                  value={
                    refundRatio > 10
                      ? "High – needs attention"
                      : "Normal"
                  }
                  danger={refundRatio > 10}
                />
              </div>
            </ChartCard>

          </div>
        )}
      </div>
    </RequirePermission>
  );
}

/* ---------- UI BLOCKS ---------- */

function Stat({ title, value, icon: Icon, negative }) {
  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-xl p-4">
      <div className="flex items-center gap-2 text-sm text-(--text-muted)">
        <Icon size={16} />
        {title}
      </div>
      <div className={`text-2xl font-semibold mt-2 ${negative ? "text-red-500" : ""}`}>
        {typeof value === "number" ? `₹ ${value}` : value}
      </div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Insight({ label, value, danger }) {
  return (
    <div className="flex justify-between">
      <span className="text-(--text-muted)">{label}</span>
      <span className={danger ? "text-red-500 font-semibold" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}
