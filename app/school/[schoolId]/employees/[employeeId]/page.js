"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Phone,
  IndianRupee,
  Power,
  Shuffle,
  Save,
  ArrowLeft,
  BadgeCheck,
  Calendar,
  CreditCard,
  Briefcase,
  FileText,
  TrendingUp,
  History,
  Info,
  ChevronRight,
  UserCircle,
  Mail,
  Locate,
  MapPin,
  ChevronLeft,
} from "lucide-react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import { useBranch } from "@/context/BranchContext";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { formatMonth, formatMonthMMYYYYToYYYYMM } from "@/lib/dateUtils";

export default function EmployeeProfilePage() {
  const { theme } = useTheme();
  const { employeeId } = useParams();
  const router = useRouter();
  const { schoolUser, branches, setLoading, currentSession, sessionList } = useSchool();
  const { branch } = useBranch();
  const [employee, setEmployee] = useState(null);
  const [form, setForm] = useState({});
  const [newBranch, setNewBranch] = useState("");
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("overview");
  const [selectedSession, setSelectedSession] = useState(currentSession);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [searchMode, setSearchMode] = useState("month");
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [monthlyLogs, setMonthlyLogs] = useState(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  useEffect(() => {
    if (schoolUser && employeeId && branch) {
      fetchEmployee();
    }
  }, [schoolUser, employeeId, branch]);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendance();
    }
  }, [activeTab, selectedSession, selectedMonth, searchMode, employeeId, branch]);

  async function fetchEmployee() {
    setLoading(true);
    try {
      const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "employees", employeeId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        toast.error("Employee not found");
        router.back();
        return;
      }
      const data = snap.data();
      setEmployee(data);
      setForm(data);
    } catch (err) {
      toast.error("Error fetching employee details");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAttendance() {
    if (!employeeId || !branch) return;
    setLoadingAttendance(true);
    try {
      const [y, m] = selectedMonth.split('-');
      const firestoreMonthKey = `${y}-${m}`;

      if (searchMode === "session") {
        const sessRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "employees", employeeId, "attendance_session", selectedSession);
        const sessSnap = await getDoc(sessRef);
        if (sessSnap.exists()) {
          const sessData = sessSnap.data();
          const months = sessData.months || {};
          const aggregated = { P: 0, A: 0, L: 0, H: 0, O: 0, M: 0 };
          Object.values(months).forEach(m => {
            Object.entries(m).forEach(([status, count]) => {
              if (aggregated.hasOwnProperty(status)) {
                aggregated[status] += count;
              }
            });
          });
          setAttendanceStats(aggregated);
          setMonthlyLogs(null);
        } else {
          setAttendanceStats(null);
        }
      } else {
        const sessRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "employees", employeeId, "attendance_session", selectedSession);
        const summSnap = await getDoc(sessRef);
        if (summSnap.exists()) {
          const sessData = summSnap.data();
          const monthData = sessData.months?.[firestoreMonthKey] || null;
          setAttendanceStats(monthData);
        } else {
          setAttendanceStats(null);
        }

        const monthLogsRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "employees", employeeId, "attendance_month", firestoreMonthKey);
        const logsSnap = await getDoc(monthLogsRef);
        if (logsSnap.exists()) {
          setMonthlyLogs(logsSnap.data().days || {});
        } else {
          setMonthlyLogs(null);
        }
      }
    } catch (err) {
      console.error("Attendance fetch error:", err);
      toast.error("Failed to load attendance data");
    } finally {
      setLoadingAttendance(false);
    }
  }
  const update = (k, v) =>
    setForm(prev => ({ ...prev, [k]: v }));
  const isActive = employee?.status === "active" || employee?.status === "pending";
  async function saveProfile() {
    setSaving(true);
    setLoading(true);
    try {
      await secureAxios.put("/api/school/employees/update", {
        branch,
        employeeId,
        updates: {
          name: form.name,
          mobile: form.mobile,
          salary: form.salary,
          roleId: form.roleId,
        },
      });
      toast.success("Profile updated");
      fetchEmployee();
    } catch (err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }
  async function toggleStatus() {
    setLoading(true);
    try {
      await secureAxios.put("/api/school/employees/status", {
        branch,
        employeeId,
        status: isActive ? "disabled" : "active",
      });
      toast.success(
        `Employee ${isActive ? "disabled" : "activated"}`
      );
      fetchEmployee();
    } catch (err) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }
  async function transferEmployee() {
    if (!newBranch) {
      toast.error("Please select a branch");
      return;
    }
    if (newBranch === branch) {
      toast.error("Employee is already in this branch");
      return;
    }
    const confirm = window.confirm("Are you sure you want to transfer this employee?");
    if (!confirm) return;
    setLoading(true);
    try {
      await secureAxios.put("/api/school/employees/transfer", {
        branch,
        employeeId,
        newBranchId: newBranch,
      });
      toast.success("Employee transferred");
      fetchEmployee();
      setNewBranch("");
    } catch (err) {
      toast.error("Transfer failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  if (!employee) return null;
  const tabs = [
    { id: "overview", label: "Overview", icon: UserCircle },
    { id: "attendance", label: "Attendance", icon: Calendar },
  ];

  if (!employee) return null;

  return (
    <div className="space-y-4 pb-20 text-sm">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-3 rounded-xl hover:bg-(--bg-soft) transition-colors border border-(--border)"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-(--primary-soft) border border-(--primary) text-(--primary) flex items-center justify-center text-xl font-semibold uppercase">
              {employee.name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-(--text) capitalize flex items-center gap-2">
                {employee.name}
                {isActive && <BadgeCheck size={20} className="text-green-500" />}
              </h1>
              <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                <span className="flex font-semibold items-center gap-1 bg-(--bg-soft) px-2 py-0.5 rounded-md border border-(--border)">
                  {employee.employeeId}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg shadow-md shadow-(--primary-soft)"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-(--bg-card) p-1 rounded-xl border border-(--border) w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id
              ? "bg-(--primary) text-white shadow-md shadow-(--primary-soft)"
              : "text-(--text-muted) hover:bg-(--bg-soft)"
              }`}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className={`${activeTab === 'attendance' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
          {activeTab === "overview" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                  <UserCircle size={14} className="text-(--primary)" /> Personal Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name" value={form.name} onChange={(v) => update("name", v)} />
                  <Field label="Mobile Number" value={form.mobile} onChange={(v) => update("mobile", v)} />
                  <Field label="Email Address" value={form.email || "N/A"} icon={Mail} onChange={(v) => update("email", v)} />
                  <Field label="Gender" value={form.gender || "Select"} type="select" options={["Male", "Female", "Other"]} onChange={(v) => update("gender", v)} />
                </div>
              </section>

              <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                  <Briefcase size={14} className="text-(--primary)" /> Employment Info
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Salary (₹)" value={form.salary} icon={IndianRupee} onChange={(v) => update("salary", v)} />
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                      Current Role
                    </label>
                    <div className="py-2 px-3 cursor-not-allowed border-[1.5px] border-(--border) rounded-xl flex items-center gap-2 text-sm">
                      {employee.role}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                  <CreditCard size={14} className="text-(--primary)" /> Bank Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Bank Name" value={form.bankName || ""} placeholder="e.g. HDFC Bank" onChange={(v) => update("bankName", v)} />
                  <Field label="Account Number" value={form.bankAccount || ""} placeholder="e.g. 50100..." onChange={(v) => update("bankAccount", v)} />
                  <Field label="IFSC Code" value={form.bankIfsc || ""} placeholder="e.g. HDFC0001234" onChange={(v) => update("bankIfsc", v)} />
                </div>
              </section>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard label="Present" value={attendanceStats?.P ? attendanceStats.P > 0 ? attendanceStats.P.toString().padStart(2, '0') : attendanceStats.P : 0} icon={BadgeCheck} statusKey="p" />
                <StatCard label="Absent" value={attendanceStats?.A ? attendanceStats.A > 0 ? attendanceStats.A.toString().padStart(2, '0') : attendanceStats.A : 0} icon={Power} statusKey="a" />
                <StatCard label="Leave" value={attendanceStats?.L ? attendanceStats.L > 0 ? attendanceStats.L.toString().padStart(2, '0') : attendanceStats.L : 0} icon={Calendar} statusKey="l" />
                <StatCard label="Half Time" value={attendanceStats?.H ? attendanceStats.H > 0 ? attendanceStats.H.toString().padStart(2, '0') : attendanceStats.H : 0} icon={TrendingUp} statusKey="h" />
                <StatCard label="OverTime" value={attendanceStats?.O ? attendanceStats.O > 0 ? attendanceStats.O.toString().padStart(2, '0') : attendanceStats.O : 0} icon={History} statusKey="o" />
              </div>

              <div className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start gap-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <TrendingUp size={16} className="text-(--primary)" /> Attendance Analytics
                  </h3>
                  <div className="flex items-center gap-2 p-1 bg-(--bg-soft) rounded-lg border border-(--border)">
                    <button
                      onClick={() => setSearchMode("month")}
                      className={`px-3 py-1 rounded text-xs font-semibold uppercase transition-all ${searchMode === "month" ? "bg-(--primary) text-white" : "text-(--text-muted) hover:text-(--text)"
                        }`}
                    >
                      Month
                    </button>
                    <button
                      onClick={() => setSearchMode("session")}
                      className={`px-3 py-1 rounded text-xs font-semibold uppercase transition-all ${searchMode === "session" ? "bg-(--primary) text-white" : "text-(--text-muted) hover:text-(--text)"
                        }`}
                    >
                      Session
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {searchMode === "session" && (
                      <select
                        className="input py-1 text-sm rounded-lg"
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                      >
                        {sessionList?.map((s) => (
                          <option key={s.id} value={s.id}>{s.id}</option>
                        ))}
                      </select>
                    )}
                    {searchMode === "month" && (
                      <input
                        type="month"
                        className="input py-1 text-sm rounded-lg"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="h-[250px] w-full">
                    {attendanceStats && Object.values(attendanceStats).some(v => v > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Present', value: attendanceStats.P || 0, fill: theme === 'dark' ? '#4ade80' : '#22c55e' },
                              { name: 'Absent', value: attendanceStats.A || 0, fill: theme === 'dark' ? '#fb7185' : '#ef4444' },
                              { name: 'Leave', value: attendanceStats.L || 0, fill: theme === 'dark' ? '#fbbf24' : '#f59e0b' },
                              { name: 'Others', value: (attendanceStats.H || 0) + (attendanceStats.O || 0) + (attendanceStats.M || 0), fill: theme === 'dark' ? '#60a5fa' : '#3b82f6' },
                            ].filter(d => d.value > 0)}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                              borderColor: theme === 'dark' ? '#374151' : '#e5e7eb',
                              color: theme === 'dark' ? '#f9fafb' : '#111827'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-(--text-muted) border-2 border-dashed border-(--border) rounded-xl">
                        <History size={32} className="mb-2 opacity-20" />
                        <p className="text-xs">No data for this period</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-(--text-muted)">Performance Metrics</h4>
                    <div className="space-y-2 px-4">
                      <MetricRow label="Regularity Rate" value={attendanceStats ? `${Math.round(((attendanceStats.P || 0) / (Object.values(attendanceStats).reduce((a, b) => a + b, 0) || 1)) * 100)}%` : '0%'} />
                      <MetricRow label="Total Present" value={attendanceStats?.P || 0} color="text-green-500" />
                      <MetricRow label="Total Absent" value={attendanceStats?.A || 0} color="text-red-500" />
                      <MetricRow label="Total Leave" value={attendanceStats?.L || 0} color="text-orange-500" />
                      <MetricRow label="Half Time Days" value={attendanceStats?.H || 0} color="text-teal-500" />
                      <MetricRow label="OverTime Days" value={attendanceStats?.O || 0} color="text-purple-500" />
                    </div>
                  </div>
                </div>
              </div>

              {searchMode === "month" && (
                <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <History size={16} className="text-(--primary)" /> Monthly Daily Logs
                  </h3>
                  {loadingAttendance ? (
                    <div className="py-12 text-center text-(--text-muted)">Loading logs...</div>
                  ) : monthlyLogs ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-7 gap-1">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                          <div key={d} className="text-center text-[10px] font-semibold uppercase text-(--text-muted) py-1">
                            {d}
                          </div>
                        ))}
                        {(() => {
                          const [y, m] = selectedMonth.split('-').map(Number);
                          const firstDay = new Date(y, m - 1, 1).getDay();
                          const daysInMonth = new Date(y, m, 0).getDate();
                          const cells = [];
                          for (let i = 0; i < firstDay; i++) {
                            cells.push(<div key={`empty-${i}`} className="py-5 opacity-0 " />);
                          }
                          for (let d = 1; d <= daysInMonth; d++) {
                            const statusKey = (monthlyLogs[d] || '').toLowerCase();
                            const statusMap = {
                              p: 'Present',
                              a: 'Absent',
                              l: 'Leave',
                              h: 'HalfTime',
                              o: 'OverTime',
                              m: 'Modified'
                            };
                            const statusLabel = statusMap[statusKey] || statusKey;

                            const style = statusKey ? {
                              backgroundColor: `var(--status-${statusKey}-bg)`,
                              color: `var(--status-${statusKey}-text)`,
                              borderColor: `var(--status-${statusKey}-border)`,
                            } : {};

                            cells.push(
                              <div
                                key={d}
                                style={style}
                                className={`py-5 flex flex-col items-center justify-center rounded-lg border transition-all ${!statusKey ? "bg-(--bg-soft) border-(--border) text-(--text-muted) opacity-40" : ""
                                  }`}
                              >
                                <span className="text-md font-semibold">{d}</span>
                                <span className="text-[10px] uppercase font-semibold text-center px-0.5">{statusLabel || '-'}</span>
                              </div>
                            );
                          }
                          return cells;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-(--text-muted) border-2 border-dashed border-(--border) rounded-xl">
                      No logs found for {selectedMonth}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>

        {activeTab !== 'attendance' && (
          <div className="lg:col-span-4 space-y-4">
            <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                <Info size={14} className="text-(--primary)" /> System & Security
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-(--bg-soft) rounded-lg border border-(--border)">
                  <span className="text-xs text-(--text-muted)">Login Status</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isActive ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                    {employee.status === 'pending' ? 'active' : employee.status}
                  </span>
                </div>
                <div className="p-2 bg-(--bg-soft) rounded-lg border border-(--border) space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">Credentials</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-(--text-muted)">Username</span>
                    <span className="font-mono font-semibold">{employee.employeeId}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-(--text-muted)">Password</span>
                    <span className="font-mono font-semibold">{employee.password}</span>
                  </div>
                </div>

                <button
                  onClick={toggleStatus}
                  className={`w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-lg font-semibold transition-all text-xs ${!isActive ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20 rotate-on-hover' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                    }`}
                >
                  <Power size={14} />
                  {isActive ? "Deactivate Account" : "Activate Account"}
                </button>
              </div>
            </section>

            <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                <Locate size={14} className="text-(--primary)" /> Branch Management
              </h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">Transfer Employee</label>
                  <select
                    className="input text-sm rounded-lg bg-(--bg-soft)"
                    value={newBranch}
                    onChange={e => setNewBranch(e.target.value)}
                  >
                    <option value="">Select Target Branch</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={transferEmployee}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-(--border) rounded-lg hover:bg-(--bg-soft) text-xs font-semibold transition-all"
                >
                  <Shuffle size={14} className="text-(--primary)" /> Transfer Now
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", options = [], icon: Icon }) {
  return (
    <div className="space-y-1 group">
      <label className="text-xs font-semibold text-(--text-muted) group-focus-within:text-(--primary) transition-colors flex items-center gap-2">
        {Icon && <Icon size={12} />} {label}
      </label>
      {type === "select" ? (
        <select
          className="input rounded-xl bg-(--bg-soft) focus:bg-(--bg-card)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : (
        <input
          className="input rounded-xl bg-(--bg-soft) focus:bg-(--bg-card)"
          placeholder={placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, statusKey }) {
  const bgVar = `--status-${statusKey}-bg`;
  const textVar = `--status-${statusKey}-text`;
  const borderVar = `--status-${statusKey}-border`;

  return (
    <div
      style={{
        backgroundColor: `var(${bgVar})`,
        color: `var(${textVar})`,
        borderColor: `var(${borderVar})`
      }}
      className="py-4 px-5 rounded-xl border shadow-sm transition-all hover:scale-[1.02] cursor-default"
    >
      <div className="flex items-center justify-between mb-1">
        <Icon size={18} />
        <ChevronRight size={14} className="opacity-30" />
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs font-semibold">{label}</div>
    </div>
  );
}

function MetricRow({ label, value, color = "text-(--text)" }) {
  return (
    <div className="flex items-center justify-between border-b border-(--border) pb-2 last:border-0">
      <span className="text-xs text-(--text-muted)">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}
