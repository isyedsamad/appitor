"use client";

import { useEffect, useMemo, useState } from "react";
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
  Briefcase,
  Hash,
  IndianRupee,
  Bell,
  Download,
  ExternalLink,
  X,
  Zap
} from "lucide-react";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import { useBranch } from "@/context/BranchContext";
import { formatInputDate, toInputDate, formatDateTime } from "@/lib/dateUtils";
import RequirePermission from "@/components/school/RequirePermission";
import { canManage } from "@/lib/school/permissionUtils";
import { buildMonthsForSession } from "@/lib/school/fees/monthUtil";
import { generateReceiptPDF } from "@/lib/exports/fees/receiptPdf";
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
  const { branch, branchInfo } = useBranch();
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
  const [feeSummary, setFeeSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feePeriodId, setFeePeriodId] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;

  const tabs = [
    { id: "overview", label: "Overview", icon: User },
    { id: "attendance", label: "Attendance", icon: Calendar },
    { id: "fees", label: "Fees", icon: IndianRupee },
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
    if (activeTab === "fees" && student) {
      fetchFees();
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

  async function fetchFees() {
    if (!uid || !branch || !selectedSession) return;
    setLoadingFees(true);
    try {
      const summaryRef = doc(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "session_summaries", "items", `${uid}_${selectedSession}`);
      const summarySnap = await getDoc(summaryRef);
      setFeeSummary(summarySnap.exists() ? summarySnap.data() : null);

      const paymentsRef = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "payments", "items");
      const pQuery = query(paymentsRef, where("studentId", "==", uid), where("sessionId", "==", selectedSession));
      const pSnap = await getDocs(pQuery);
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      const refundsRef = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "refunds", "items");
      const rQuery = query(refundsRef, where("studentId", "==", uid), where("sessionId", "==", selectedSession));
      const rSnap = await getDocs(rQuery);
      setRefunds(rSnap.docs.map(d => ({ id: d.id, ...d.data() })));

    } catch (err) {
      console.error("Fees fetch error:", err);
      toast.error("Failed to load fee data");
    } finally {
      setLoadingFees(false);
    }
  }

  const handlePrintReceipt = (payment) => {
    generateReceiptPDF({
      receipt: payment,
      student: {
        ...student,
        className: getClassName(student.className),
        sectionName: getSectionName(student.className, student.section),
      },
      schoolUser,
      branchInfo: branchInfo,
      options: {
        size: "1/2",
        copies: 2,
      }
    });
  };

  async function sendFeeReminder(period) {
    if (!uid || !branch || !student) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/fees/dues/notify", {
        branch,
        studentUids: [uid],
        period,
        schoolName: branchInfo?.name,
      });
      toast.success("Reminder sent successfully!");
    } catch (err) {
      toast.error("Failed to send reminder: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  const sessionMeta = useMemo(() => {
    return sessionList?.find(s => s.id === selectedSession);
  }, [sessionList, selectedSession]);

  const MONTHS = useMemo(() =>
    buildMonthsForSession(sessionMeta)
    , [sessionMeta]);

  const monthRows = useMemo(() => {
    if (!MONTHS?.length) return [];
    return MONTHS.map(m => {
      const monthData = feeSummary?.months?.[m.key];
      if (monthData) {
        return {
          ...m,
          ...monthData,
        };
      }
      return {
        ...m,
        total: 0,
        paid: 0,
        status: "pending",
      };
    });
  }, [feeSummary, MONTHS]);
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
  const currentPlan = branchInfo?.plan || schoolUser.plan || "trial";
  const editable = canManage(schoolUser, "student.profile.manage", currentPlan);

  return (
    <RequirePermission permission="student.profile.view">
      <div className="space-y-4 pb-20 text-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 h-[46px] w-[46px] flex items-center justify-center rounded-lg border border-(--border) hover:bg-(--bg-soft) transition-all text-(--text-muted) hover:text-(--text)"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
                <Zap size={20} fill="currentColor" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-(--text) capitalize flex items-center gap-2">
                  {student.name}
                  {isActive && <BadgeCheck size={20} className="text-green-500" />}
                </h1>
                <p className="text-xs font-semibold text-(--text-muted)">
                  App ID: {student.appId}
                </p>
              </div>
            </div>
          </div>
        </div>
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
          <div className={`${['attendance', 'fees'].includes(activeTab) ? 'lg:col-span-12' : 'lg:col-span-8'} space-y-4`}>
            {activeTab === "overview" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                    <User size={14} className="text-(--primary)" /> Personal Details
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Full Name" value={form.name || ""} onChange={v => update("name", v)} icon={User} disabled={!editable} />
                    <Field label="Gender" value={form.gender || ""} onChange={v => update("gender", v)} options={["Male", "Female", "Other"]} icon={User} disabled={!editable} />
                    <Field label="Date of Birth" value={toInputDate(form.dob) || ""} onChange={v => update("dob", formatInputDate(v))} type="date" icon={Calendar} disabled={!editable} />
                  </div>
                </section>

                <section className="bg-(--bg-card) p-4 rounded-xl border border-(--border) shadow-sm">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2 mb-4">
                    <GraduationCap size={14} className="text-(--primary)" /> Academic Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                        <Hash size={12} /> Roll Number
                      </label>
                      <div className="py-2 px-3 border-[1.5px] border-(--border) rounded-lg bg-(--bg-soft) opacity-80 cursor-not-allowed text-sm font-mono font-bold">
                        {student.rollNo ? student.rollNo.toString().padStart(2, '0') : '--'}
                      </div>
                    </div>
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
                  <StatCard label="Att. %age" value={attendanceStats?.P ? `${Math.round(((attendanceStats.P || 0) / (Object.values(attendanceStats).reduce((a, b) => a + b, 0) || 1)) * 100)}%` : '0%'} icon={BadgeCheck} statusKey="basic" />
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
            {activeTab === "fees" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-(--bg-card) py-4 px-5 rounded-xl border border-(--border) shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <IndianRupee size={23} className="text-(--primary) bg-(--primary-soft) p-1 rounded-lg" /> Fees Overview
                    </h3>
                    <div className="flex items-center gap-3">
                      <p className="text-xs text-(--text-muted) font-medium">Session</p>
                      <select
                        className="input py-1 text-sm rounded-lg"
                        value={selectedSession}
                        onChange={(e) => setSelectedSession(e.target.value)}
                      >
                        {sessionList?.map((s) => (
                          <option key={s.id} value={s.id}>{s.id}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-(--border) rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-(--bg)">
                        <tr>
                          <th className="px-4 py-3">Period</th>
                          <th className="px-4 py-3">Heads Breakdown</th>
                          <th className="px-4 py-3 text-right">Target</th>
                          <th className="px-4 py-3 text-right">Balance</th>
                          <th className="px-4 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-(--border)">
                        {loadingFees ? (
                          <tr><td colSpan={5} className="py-10 text-center text-(--text-muted)">Syncing fee data...</td></tr>
                        ) : monthRows.length > 0 ? (
                          monthRows.map(m => (
                            <tr key={m.key} className="hover:bg-(--bg-soft)/50 transition-colors">
                              <td className="px-4 py-3 font-semibold">{m.label}</td>
                              <td className="px-4 py-3 font-semibold text-[11px] text-(--text-muted) space-y-0.5">
                                {m.headsSnapshot?.map((h, i) => (
                                  <div key={i} className="flex gap-2">
                                    <span>{h.headName}:</span>
                                    <span>₹{h.amount}</span>
                                  </div>
                                ))}
                                {(!m.headsSnapshot || m.headsSnapshot.length === 0) && <span className="italic opacity-40">Not assigned</span>}
                              </td>
                              <td className="px-4 py-3 text-right font-medium">₹{m.total || 0}</td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex flex-col items-end">
                                  <span className={`font-semibold px-2 py-0.5 rounded-md ${m.status === 'paid' ? 'bg-(--status-p-bg) text-(--status-p-text)' : 'bg-(--status-a-bg) text-(--status-a-text)'}`}>
                                    ₹ {(m.total || 0) - (m.paid || 0)}
                                  </span>
                                  {m.paid > 0 && <span className="text-xs mt-1 text-yellow-500 font-semibold">Paid: ₹ {m.paid}</span>}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-2">
                                  {m.status !== 'paid' && (
                                    <button
                                      onClick={() => sendFeeReminder(m.key)}
                                      className="p-2 bg-(--bg) rounded-lg border border-(--border) hover:bg-(--status-l-bg) hover:text-(--status-l-text) hover:border-(--status-l-border) transition-all"
                                      title="Send Reminder"
                                    >
                                      <Bell size={14} />
                                    </button>
                                  )}
                                  {(m.paid > 0 || m.lastRefundAt) && (
                                    <button
                                      onClick={() => {
                                        setFeePeriodId(m.key);
                                        setShowPayModal(true);
                                      }}
                                      className="p-2 bg-(--bg) rounded-lg border border-(--border) hover:bg-(--status-a-bg) hover:text-(--status-a-text) hover:border-(--status-a-border) transition-all"
                                      title="Payment Details"
                                    >
                                      <Info size={14} />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={5} className="py-10 text-center text-(--text-muted)">No fee periods generated for this session.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {feeSummary?.flexible?.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-(--text-muted) uppercase tracking-wider">Flexible Fee Heads</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {feeSummary.flexible.map((f, i) => (
                          <div key={i} className="p-3 bg-(--bg-soft)/50 rounded-xl border border-(--border) flex justify-between items-center">
                            <div>
                              <p className="text-xs font-bold text-(--text-muted) uppercase">{f.label || f.headName}</p>
                              <p className="font-bold text-sm">₹{f.amount} <span className="text-[10px] text-green-600 ml-1">Paid: ₹{f.paid || 0}</span></p>
                            </div>
                            {(f.paid > 0 || f.refundedAmount > 0) && (
                              <button
                                onClick={() => {
                                  setFeePeriodId(f.id?.toString());
                                  setShowPayModal(true);
                                }}
                                className="p-1.5 rounded-lg border border-(--border) hover:bg-(--bg-soft)"
                              >
                                <Info size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!['attendance', 'fees'].includes(activeTab) && (
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
                      <span className="font-mono font-semibold">{editable ? password : "********"}</span>
                    </div>
                  </div>

                  {editable && (
                    <>
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
                    </>
                  )}
                </div>
              </section>

              {editable && (
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
              )}
            </div>
          )}
        </div>

        {showPayModal && feePeriodId && (
          <FeeInfoModal
            periodId={feePeriodId}
            payments={payments}
            refunds={refunds}
            loading={loadingFees}
            onClose={() => setShowPayModal(false)}
            onPrint={handlePrintReceipt}
          />
        )}
      </div>
    </RequirePermission>
  );
}

function StatCard({ label, value, icon: Icon, statusKey }) {
  const bg = `var(--status-${statusKey}-bg)`;
  const txt = `var(--status-${statusKey}-text)`;
  const brd = `var(--status-${statusKey}-border)`;

  return (
    <div
      className="relative overflow-hidden rounded-xl border px-5 py-4 shadow-sm transition-all hover:shadow-md group hover:-translate-y-0.5 cursor-default"
      style={{
        backgroundColor: "var(--bg-card)",
        backgroundImage: `linear-gradient(to bottom right, ${bg}, transparent)`,
        borderColor: brd,
      }}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider opacity-80 mb-0.5">{label}</p>
          <h4 className="text-2xl font-bold transition-colors group-hover:scale-[1.02] transform origin-left" style={{ color: txt }}>
            {value == 0 ? '--' : String(value).padStart(2, '0')}
          </h4>
        </div>
        <div
          className="p-2.5 rounded-xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: bg, color: txt, border: `1px solid ${brd}` }}
        >
          <Icon size={15} />
        </div>
      </div>
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

function Field({ label, value, onChange, placeholder, type = "text", options = [], icon: Icon, disabled = false }) {
  return (
    <div className="space-y-1 group">
      <label className="text-xs font-semibold text-(--text-muted) group-focus-within:text-(--primary) transition-colors flex items-center gap-2">
        {Icon && <Icon size={12} />} {label}
      </label>
      {options.length > 0 ? (
        <select
          className="input text-sm rounded-xl"
          value={value}
          disabled={disabled}
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
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function FeeInfoModal({ periodId, payments, refunds, loading, onClose, onPrint }) {
  const periodPayments = payments.filter(p => p.items?.some(i => i.period === periodId || (i.id && i.id.toString() === periodId)));
  const periodRefunds = refunds.filter(r => r.refundItems?.[periodId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-(--bg-card) border border-(--border) w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="py-4 px-6 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)/50">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Info size={18} className="text-(--primary)" /> Transaction Insights
            </h3>
            <p className="text-xs font-semibold text-(--text-muted)">Details for: <span className="font-semibold text-(--text)">{periodId}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-(--bg-soft) rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-(--primary-soft) border-t-(--primary) rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-(--text-muted)">Syncing transaction history...</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-(--text) flex items-center gap-2">
                    <BadgeCheck size={14} className="text-(--status-p-text)" /> Payments Received
                  </h4>
                  <span className="text-[10px] bg-(--status-p-bg) text-(--status-p-text) px-3 py-0.5 rounded-full font-semibold">
                    {periodPayments.length} Transactions
                  </span>
                </div>
                {periodPayments.length > 0 ? (
                  <div className="space-y-2">
                    {periodPayments.map((p) => (
                      <div key={p.id} className="p-4 rounded-xl border border-(--border) bg-(--bg) flex justify-between items-center transition-all group">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-md">₹ {p.paidAmount?.toLocaleString() || p.amount?.toLocaleString()}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-(--bg-card) border border-(--border) font-medium uppercase tracking-tighter">
                              {p.paymentMode || 'CASH'}
                            </span>
                          </div>
                          <p className="text-[10px] text-(--text-muted) font-medium">
                            Ref: {p.receiptNo}
                          </p>
                          <p className="text-[10px] text-(--text-muted) font-medium">
                            {p.createdAt?.toDate ? formatDateTime(p.createdAt.toDate()) : 'N/A'}
                          </p>
                        </div>
                        <button
                          onClick={() => onPrint(p)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--bg-card) border border-(--border) text-xs font-semibold hover:bg-(--primary-soft) hover:text-(--primary) hover:border-(--primary) transition-all shadow-sm"
                        >
                          <Download size={14} /> Receipt
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border-2 border-dashed border-(--border) rounded-xl text-(--text-muted) opacity-60 italic text-sm">
                    No payments found for this period
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-semibold text-(--text) flex items-center gap-2">
                    <History size={14} className="text-red-500" /> Refunds Issued
                  </h4>
                </div>
                {periodRefunds.length > 0 ? (
                  <div className="space-y-2">
                    {periodRefunds.map((r) => (
                      <div key={r.id} className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex justify-between items-center border-dashed">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-red-500">₹{r.refundItems[periodId]?.toLocaleString()}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-500 font-bold uppercase">
                              {r.payType || 'CASH'}
                            </span>
                          </div>
                          <p className="text-[10px] text-(--text-muted) font-medium">
                            {r.createdAt?.toDate ? formatDateTime(r.createdAt.toDate()) : 'N/A'}
                          </p>
                          {r.remark && <p className="text-[10px] italic opacity-60">"{r.remark}"</p>}
                        </div>
                        {/* <div className="p-2 rounded-full bg-red-500/10 text-red-500">
                          <ExternalLink size={14} />
                        </div> */}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center border border-(--border) rounded-xl text-(--text-muted) opacity-40 text-xs">
                    No refunds processed for this period
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-(--border) bg-(--bg-soft)/30 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-(--bg-card) border border-(--border) font-semibold text-sm hover:bg-(--bg-soft) transition-all shadow-sm"
          >
            Close Insights
          </button>
        </div>
      </div>
    </div>
  );
}
