"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  GraduationCap,
  Calendar,
  Save,
  Power,
  Shuffle,
  Lock,
  BadgeCheck,
  Info,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Mail,
  MapPin,
  TrendingUp,
  History,
  Briefcase
} from "lucide-react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import { useBranch } from "@/context/BranchContext";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

export default function StudentProfilePage() {
  const { uid } = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { branch } = useBranch();
  const { classData, branches, schoolUser, setLoading, currentSession, sessionList } = useSchool();
  const [student, setStudent] = useState(null);
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

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "attendance", label: "Attendance", icon: Calendar },
  ];
  useEffect(() => {
    if (schoolUser && branch) {
      fetchStudent();
    }
  }, [schoolUser, branch]);

  useEffect(() => {
    if (activeTab === "attendance" && student) {
      fetchAttendance();
    }
  }, [activeTab, selectedSession, selectedMonth, searchMode]);


  async function fetchStudent() {
    setLoading(true);
    const snap = await getDoc(doc(db, "schools", schoolUser.schoolId, 'branches', branch, 'students', uid));
    if (!snap.exists()) return;
    setStudent(snap.data());
    setForm(snap.data());
    setLoading(false);
  }

  async function fetchAttendance() {
    if (!uid || !branch) return;
    setLoadingAttendance(true);
    try {
      const [y, m] = selectedMonth.split('-');
      const firestoreMonthKey = `${y}-${m}`;

      if (searchMode === "session") {
        const sessRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "students", uid, "attendance_session", selectedSession);
        const sessSnap = await getDoc(sessRef);
        if (sessSnap.exists()) {
          const sessData = sessSnap.data();
          const months = sessData.months || {};
          const aggregated = { P: 0, A: 0, L: 0, M: 0 };
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
        const sessRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "students", uid, "attendance_session", selectedSession);
        const summSnap = await getDoc(sessRef);
        if (summSnap.exists()) {
          const sessData = summSnap.data();
          const monthData = sessData.months?.[firestoreMonthKey] || null;
          setAttendanceStats(monthData);
        } else {
          setAttendanceStats(null);
        }

        const monthLogsRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "students", uid, "attendance_month", firestoreMonthKey);
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
    setForm(p => ({ ...p, [k]: v }));
  const selectedClass = classData && classData.find(
    c => c.name === form.className
  );
  const password = form.dob
    ? (() => {
      const [d, m, y] = form.dob.split("-");
      return `${d}${m}${y}`;
    })()
    : "";
  const isActive = student?.status === "active";
  async function saveProfile() {
    setSaving(true);
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/update", {
        uid,
        branch,
        updates: {
          name: form.name,
          className: form.className,
          section: form.section,
          gender: form.gender,
          dob: form.dob,
        },
      });
      toast.success("Student Profile updated!");
      fetchStudent();
    } catch (err) {
      toast.error("Update failed: " + err);
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }
  async function updatePassword() {
    const [d, m, y] = form.dob.split("-");
    const password = `${d}${m}${y}`;
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/password", {
        uid,
        branch,
        password,
      });
      toast.success("Password reset successfully");
    } catch (err) {
      toast.error("Password update failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  async function toggleStatus() {
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/status", {
        uid,
        branch,
        status: isActive ? "disabled" : "active",
      });
      toast.success('Student status updated!')
      fetchStudent();
    } catch (err) {
      toast.error('Error: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  async function transferStudent() {
    if (!newBranch) {
      toast.error("Please select a branch");
      return;
    }
    if (newBranch === branch) {
      toast.error("Student is already in this branch");
      return;
    }
    const confirm = window.confirm("Are you sure you want to transfer this student?");
    if (!confirm) return;
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/transfer", {
        uid,
        branch,
        newBranchId: newBranch,
      });
      toast.success("Student transferred");
      setNewBranch("");
      fetchStudent();
    } catch (err) {
      toast.error('Error: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  if (!student || !schoolUser || !branches) return null;

  return (
    <div className="space-y-4 pb-20 text-sm">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl border border-(--border) hover:bg-(--bg-soft) transition-all text-(--text-muted) hover:text-(--text)"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-(--primary-soft) border border-(--primary) text-(--primary) flex items-center justify-center text-xl font-semibold uppercase">
              {student.name?.[0]}
            </div>
            <div>
              <h1 className="text-xl font-semibold capitalize flex items-center gap-2">
                {student.name}
                {isActive && <BadgeCheck size={20} className="text-green-500" />}
              </h1>
              <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                <span className="flex font-semibold items-center gap-1 bg-(--bg-soft) px-2 py-0.5 rounded-md border border-(--border)">
                  App ID: {student.appId}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 bg-(--bg-card) p-1 rounded-xl border border-(--border) w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold transition-all text-xs ${activeTab === t.id ? "bg-(--primary) text-white shadow-sm" : "text-(--text-muted) hover:bg-(--bg-soft) hover:text-(--text)"
              }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Main Content Area */}
        <div className={`${activeTab === 'attendance' ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
          {activeTab === "overview" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                  <User size={14} className="text-(--primary)" /> Personal Details
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name" value={form.name || ""} onChange={v => update("name", v)} icon={User} />
                  <Field label="Gender" value={form.gender || ""} onChange={v => update("gender", v)} options={["Male", "Female", "Other"]} icon={User} />
                  <Field label="Date of Birth" value={toInputDate(form.dob) || ""} onChange={v => update("dob", formatInputDate(v))} type="date" icon={Calendar} />
                </div>
              </section>

              <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                  <GraduationCap size={14} className="text-(--primary)" /> Academic Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                      <Calendar size={12} /> Current Session
                    </label>
                    <div className="py-2 px-3 border-[1.5px] border-(--border) rounded-lg bg-(--bg-soft) opacity-80 cursor-not-allowed text-sm">
                      {student.currentSession}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                      <GraduationCap size={12} /> Class
                    </label>
                    <div className="py-2 px-3 border-[1.5px] border-(--border) rounded-lg bg-(--bg-soft) opacity-80 cursor-not-allowed text-sm">
                      {classData.find(c => c.id == student.className)?.name || '-'}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                      <GraduationCap size={12} /> Section
                    </label>
                    <div className="py-2 px-3 border-[1.5px] border-(--border) rounded-lg bg-(--bg-soft) opacity-80 cursor-not-allowed text-sm">
                      {classData.find(c => c.id == student.className)?.sections?.find(s => s.id == student.section)?.name || '-'}
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                  <History size={14} className="text-(--primary)" /> Academic History
                </h2>
                {student.academicHistory?.length ? (
                  <div className="space-y-3">
                    {student.academicHistory.slice().reverse().map((h, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-(--border) bg-(--bg-soft)/50">
                        <div className="w-0.5 h-8 rounded-lg bg-(--primary) text-(--primary) flex items-center justify-center font-semibold text-xs">
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">{h.session}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-(--primary-soft) text-(--primary) font-bold uppercase">{h.action}</span>
                          </div>
                          <p className="text-xs font-semibold text-(--text-muted)">
                            {h.action.toLowerCase() == 'passed_out' ? 'Passed Out' : `Class: ${classData.find(c => c.id == h.className)?.name} – ${classData.find(c => c.id == h.className)?.sections?.find(s => s.id == h.section)?.name}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-(--text-muted) bg-(--bg-soft) rounded-lg border border-dashed border-(--border)">
                    No academic history found
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <StatCard label="Attendance %age" value={attendanceStats?.P ? `${Math.round(((attendanceStats.P || 0) / (Object.values(attendanceStats).reduce((a, b) => a + b, 0) || 1)) * 100)}%` : '0%'} icon={BadgeCheck} statusKey="p" />
                <StatCard label="Present" value={attendanceStats?.P ? attendanceStats.P > 0 ? attendanceStats.P.toString().padStart(2, '0') : attendanceStats.P : 0} icon={BadgeCheck} statusKey="p" />
                <StatCard label="Absent" value={attendanceStats?.A ? attendanceStats.A > 0 ? attendanceStats.A.toString().padStart(2, '0') : attendanceStats.A : 0} icon={Power} statusKey="a" />
                <StatCard label="Leave" value={attendanceStats?.L ? attendanceStats.L > 0 ? attendanceStats.L.toString().padStart(2, '0') : attendanceStats.L : 0} icon={Calendar} statusKey="l" />
                <StatCard label="Medical" value={attendanceStats?.M ? attendanceStats.M > 0 ? attendanceStats.M.toString().padStart(2, '0') : attendanceStats.M : 0} icon={TrendingUp} statusKey="m" />
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
                              { name: 'Medical', value: attendanceStats.M || 0, fill: theme === 'dark' ? '#60a5fa' : '#3b82f6' },
                            ].filter(d => d.value > 0)}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          />
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
                      <MetricRow label="Medical Leave" value={attendanceStats?.M || 0} color="text-blue-500" />
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
                              m: 'Medical',
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
                <Info size={14} className="text-(--primary)" /> System Info
              </h2>
              <div className="space-y-3">
                <div className="py-2 px-3 bg-(--bg-soft) rounded-lg border border-(--border) space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">Credentials</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-(--text-muted)">App ID</span>
                    <span className="font-mono font-semibold">{student.appId}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-(--text-muted)">Password</span>
                    <span className="font-mono font-semibold">{password}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center justify-center gap-2 py-2.5 bg-(--primary) text-white rounded-lg font-semibold hover:bg-(--primary-hover) transition-all text-xs"
                  >
                    <Save size={14} /> Save
                  </button>
                  <button
                    onClick={updatePassword}
                    className="flex items-center justify-center gap-2 py-2.5 border border-(--border) rounded-lg font-semibold hover:bg-(--bg-soft) transition-all text-xs"
                  >
                    <Lock size={14} /> Reset Password
                  </button>
                </div>

                <button
                  onClick={toggleStatus}
                  className={`w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-lg font-semibold transition-all text-xs ${!isActive ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'}`}
                >
                  <Power size={14} />
                  {isActive ? "Disable Student" : "Activate Student"}
                </button>
              </div>
            </section>

            <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                <Shuffle size={14} className="text-(--primary)" /> Transfer Branch
              </h2>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">New Branch</label>
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
                  onClick={transferStudent}
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
    <div className="flex justify-between items-center py-1.5 border-b border-(--border) last:border-0">
      <span className="text-xs text-(--text-muted) font-semibold uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", options = [], icon: Icon }) {
  return (
    <div className="space-y-1 group">
      <label className="text-xs font-semibold text-(--text-muted) group-focus-within:text-(--primary) transition-colors flex items-center gap-2">
        {Icon && <Icon size={12} />} {label}
      </label>
      {options.length > 0 ? (
        <select
          className="input text-sm rounded-xl"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select {label}</option>
          {options.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          className="input text-sm rounded-xl"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
