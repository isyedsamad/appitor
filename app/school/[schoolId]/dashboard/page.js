"use client";

import { useEffect, useState } from "react";
import {
  Users2,
  LayoutDashboard,
  Briefcase,
  IndianRupee,
  TrendingUp,
  ChevronRight,
  ArrowUpRight,
  Clock,
  GraduationCap,
  CalendarCheck,
  Receipt,
  BookOpen,
  Bell,
  Activity,
  UserPlus,
  ShieldCheck,
  Zap,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Stethoscope,
  Plane,
  Timer,
  TimerOff,
  ArrowRight,
  Search,
  Calendar
} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { toInputDate, formatInputDate } from "@/lib/dateUtils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import RequirePermission from "@/components/school/RequirePermission";
import { useTheme } from "next-themes";
import OnboardingWizard from "@/components/school/OnboardingWizard";

export default function SchoolDashboard() {
  const router = useRouter();
  const { schoolUser, employeeData, classData, subjectData, sessionList, loadClasses, loadSubjects } = useSchool();
  const { branch, branchInfo } = useBranch();
  const d = new Date();
  const todayIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [selectedDateSearch, setSelectedDateSearch] = useState(todayIso);
  const [analytics, setAnalytics] = useState(null);
  const [dayAnalytics, setDayAnalytics] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [timetableReady, setTimetableReady] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!branch || !schoolUser?.schoolId) return;
    const unsubGlobal = onSnapshot(
      doc(db, "schools", schoolUser.schoolId, "branches", branch, "analytics", "dashboard"),
      (doc) => {
        if (doc.exists()) {
          setAnalytics(doc.data());
        }
        setLoading(false);
      },
      (err) => {
        console.error("Dashboard Global Snapshot Error:", err);
        setLoading(false);
      }
    );

    return () => unsubGlobal();
  }, [branch, schoolUser?.schoolId]);

  useEffect(() => {
    if (!branch || !schoolUser?.schoolId || !selectedDate) return;
    setLoading(true);
    const formattedDate = formatInputDate(selectedDate);
    const unsubDay = onSnapshot(
      doc(db, "schools", schoolUser.schoolId, "branches", branch, "analytics", formattedDate),
      (doc) => {
        if (doc.exists()) {
          setDayAnalytics(doc.data());
        } else {
          setDayAnalytics(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Dashboard Day Snapshot Error:", err);
        setLoading(false);
      }
    );
    return () => unsubDay();
  }, [branch, schoolUser?.schoolId, selectedDateSearch]);

  useEffect(() => {
    if (!branch || !schoolUser?.schoolId || !branchInfo?.currentSession) return;
    const unsubHoliday = onSnapshot(
      doc(db, "schools", schoolUser.schoolId, "branches", branch, "holidays", branchInfo.currentSession),
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().items) {
          setHolidays(docSnap.data().items);
        } else {
          setHolidays([]);
        }
      },
      (err) => console.error("Holiday Snapshot Error:", err)
    );
    return () => unsubHoliday();
  }, [branch, schoolUser?.schoolId, branchInfo?.currentSession]);

  useEffect(() => {
    if (!branch || !schoolUser?.schoolId) return;
    const unsubTimetable = onSnapshot(
      doc(db, "schools", schoolUser.schoolId, "branches", branch, "timetable", "items", "timetableSettings", "global"),
      (docSnap) => {
        setTimetableReady(docSnap.exists());
      },
      (err) => console.error("Timetable Settings Snapshot Error:", err)
    );
    return () => unsubTimetable();
  }, [branch, schoolUser?.schoolId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-(--primary) border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const studentStats = dayAnalytics?.student || {};
  const employeeStats = dayAnalytics?.employee || {};
  const trendData = analytics?.history ? Object.entries(analytics.history)
    .sort((a, b) => {
      const dateA = a[0].split('-').reverse().join('-');
      const dateB = b[0].split('-').reverse().join('-');
      return dateA.localeCompare(dateB);
    })
    .slice(-7)
    .map(([date, data]) => ({
      name: date.split('-').slice(0, 2).join('-'),
      present: (data.student?.P || 0) + (data.employee?.P || 0),
      absent: (data.student?.A || 0) + (data.employee?.A || 0)
    })) : [];

  const upcomingHolidays = (Array.isArray(holidays) ? holidays : [])
    .filter(h => h && (h.to || h.from) >= todayIso)
    .sort((a, b) => (a?.from || "").localeCompare(b?.from || ""))
    .slice(0, 3);

  const quickActions = [
    { label: "Student Profile", icon: LayoutDashboard, path: "/students", color: "p" },
    { label: "Attendance", icon: CalendarCheck, path: "/attendance", color: "m" },
    { label: "Homework", icon: BookOpen, path: "/academics/homework", color: "o" },
    { label: "Fee Dues", icon: Receipt, path: "/fees/dues", color: "l" },
    { label: "Noticeboard", icon: Bell, path: "/communications/noticeboard", color: "a" },
  ];

  return (
    <RequirePermission permission="dashboard.view" isForAll={true}>
      <div className="space-y-4 pb-10 max-w-full animate-in fade-in duration-700">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-(--primary) text-white flex items-center justify-center shadow-lg shadow-(--primary)/20 shrink-0">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text) leading-none tracking-tight">Console v3.0</h1>
              <div className="flex items-center gap-1 mt-1 flex">
                <span className="text-[9px] font-bold text-(--primary) uppercase tracking-widest">{branchInfo?.name || "Global HQ"}</span>
                <span className="w-1 h-1 rounded-full bg-(--border)" />
                <span className="text-[9px] font-bold text-(--text-muted) uppercase tracking-widest">Session 2024-25</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
            <div></div>
            <div className="flex items-center gap-2">
              {/* <CalendarCheck size={25} className="text-(--primary)" /> */}
              <input
                type="date"
                className="bg-(--bg-card) text-sm font-semibold text-(--text) outline-none cursor-pointer"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={todayIso}
              />
              <button className="btn-primary px-3 min-h-[37px]" onClick={() => {
                setSelectedDateSearch(selectedDate);
              }}>
                <Search size={17} />
              </button>
            </div>
          </div>
        </div>
        <OnboardingWizard
          schoolId={schoolUser?.schoolId}
          sessions={sessionList}
          classes={classData}
          subjects={subjectData}
          timetableReady={timetableReady}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <VitalCard label="Total Students" value={analytics?.studentCount ? analytics.studentCount > 0 ? analytics.studentCount.toString().padStart(2, '0') : 0 : 0} icon={Users2} />
          <VitalCard label="Total Employees" value={employeeData?.length ? employeeData.length > 0 ? employeeData.length.toString().padStart(2, '0') : 0 : 0} icon={Briefcase} />
          <div className="bg-green-600 text-white p-4 rounded-xl shadow-lg shadow-green-600/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <ShieldCheck size={18} />
              <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">Secure</span>
            </div>
            <div>
              <h3 className="text-xl font-semibold leading-tight mt-1">Status: HEALTHY</h3>
              <p className="text-xs opacity-80">Systems Operational</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-(--text-muted) uppercase">Quick Access</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => router.push(`/school/${schoolUser.schoolId}${action.path}`)}
                className={`flex justify-start items-center gap-3 py-3 px-4 bg-(--bg-card) border border-(--border) rounded-xl hover:shadow-sm transition-all group hover:-translate-y-0.5`}
              >
                <div className={`w-8 h-8 rounded-lg bg-(--status-${action.color}-bg) text-(--status-${action.color}-text) flex items-center justify-center shrink-0`}>
                  <action.icon size={16} />
                </div>
                <span className={`text-xs font-semibold text-(--text) transition-colors`}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold text-(--text-muted) uppercase">Student Attendance</h2>
            <span className="text-xs text-(--primary) font-semibold uppercase">{new Date(selectedDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <SummaryCard label="Att. Total" value={studentStats.Total || 0} icon={Activity} s="basic" />
            <SummaryCard label="Present" value={studentStats.P || 0} icon={CheckCircle2} s="p" />
            <SummaryCard label="Absent" value={studentStats.A || 0} icon={XCircle} s="a" />
            <SummaryCard label="Leave" value={studentStats.L || 0} icon={Plane} s="l" />
            <SummaryCard label="Medical" value={studentStats.M || 0} icon={Stethoscope} s="m" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-(--text-muted) uppercase">Employee Attendance</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <SummaryCard label="Att. Total" value={employeeStats.Total || 0} icon={Briefcase} s="basic" />
            <SummaryCard label="Present" value={employeeStats.P || 0} icon={CheckCircle2} s="p" />
            <SummaryCard label="Absent" value={employeeStats.A || 0} icon={XCircle} s="a" />
            <SummaryCard label="Leave" value={employeeStats.L || 0} icon={Plane} s="l" />
            <SummaryCard label="Halftime" value={employeeStats.H || 0} icon={Timer} s="o" />
            <SummaryCard label="Overtime" value={employeeStats.O || 0} icon={TimerOff} s="m" />
          </div>
        </div>

        {/* ROW 5+: Visuals */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Velocity Chart */}
          <div className="lg:col-span-12 xl:col-span-6 bg-(--bg-card) border border-(--border) p-5 rounded-xl shadow-sm h-[300px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-semibold flex items-center gap-2">
                <TrendingUp size={16} className="text-(--primary)" /> Employee Attendance Velocity
              </h3>
              <div className="flex items-center gap-4">
                <Legend label="Present" color="var(--status-p-text)" />
                <Legend label="Absent" color="var(--status-a-text)" />
              </div>
            </div>
            <div className="flex-1 w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: 'var(--primary-soft)', opacity: 0.3 }}
                      contentStyle={{ borderRadius: '10px', border: '1px solid var(--border)', fontSize: '11px', fontWeight: '600' }}
                    />
                    <Bar dataKey="present" fill="var(--status-p-text)" radius={[2, 2, 0, 0]} barSize={12} />
                    <Bar dataKey="absent" fill="var(--status-a-text)" radius={[2, 2, 0, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center bg-(--bg) rounded-xl border border-dashed border-(--border)">
                  <p className="text-xs opacity-50 font-semibold uppercase">Collecting Attendance Data</p>
                </div>
              )}
            </div>
          </div>
          <div className="lg:col-span-12 xl:col-span-6 grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-6 xl:col-span-6 bg-(--bg-card) border border-(--border) p-5 rounded-xl shadow-sm overflow-hidden flex flex-col h-[300px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-semibold flex items-center gap-2">
                  <GraduationCap size={16} className="text-(--primary)" /> Classes Overview
                </h3>
                <button onClick={() => router.push(`/school/${schoolUser.schoolId}/academics/classes`)} className="text-xs font-semibold text-(--primary) hover:underline">
                  All Classes
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-semibold text-(--text-muted) uppercase border-b border-(--border)">
                      <th className="pb-3 pr-2">Class</th>
                      <th className="pb-3 px-2 text-center">Sections</th>
                      <th className="pb-3 pl-2 text-right">Capacity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {(classData || [])
                      .map(cls => {
                        let totalCapacity = 0;
                        let numSections = 0;

                        if (cls.sections && Array.isArray(cls.sections)) {
                          numSections = cls.sections.length;
                          cls.sections.forEach(sec => {
                            totalCapacity += parseInt(sec.capacity) || 40;
                          });
                        } else {
                          totalCapacity = parseInt(cls.capacity) || 40;
                        }

                        return { ...cls, totalCapacity, numSections };
                      })
                      .sort((a, b) => b.totalCapacity - a.totalCapacity)
                      .slice(0, 5)
                      .map((cls) => (
                        <tr key={cls.id} className="text-xs font-semibold hover:bg-(--bg)/50 transition-colors">
                          <td className="py-3 pr-2 text-(--text)">{cls.name}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-(--bg) text-(--text-muted) border border-(--border)/50 text-[10px]">
                              {cls.numSections}
                            </span>
                          </td>
                          <td className="py-3 pl-2 text-right">
                            <span className="text-[11px] font-bold text-(--text)">{cls.totalCapacity}</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-6 xl:col-span-6 bg-(--bg-card) border border-(--border) p-5 rounded-xl shadow-sm overflow-hidden flex flex-col h-[300px]">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-semibold flex items-center gap-2">
                  <Calendar size={16} className="text-(--primary)" /> Upcoming Holidays
                </h3>
                <button onClick={() => router.push(`/school/${schoolUser.schoolId}/holidays`)} className="text-xs font-semibold text-(--primary) hover:underline">
                  All Holidays
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                {upcomingHolidays.length > 0 ? (
                  upcomingHolidays.map(hol => {
                    const effectiveToDate = hol.to || hol.from;
                    const fromDate = new Date(hol.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    const toDate = new Date(effectiveToDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                    const isOngoing = todayIso >= hol.from && todayIso <= effectiveToDate;
                    const visibleDays = hol.daysList ? hol.daysList.slice(0, 3) : [];
                    const remaining = hol.daysList ? hol.daysList.length - visibleDays.length : 0;

                    return (
                      <div key={hol.id} className="relative rounded-xl px-4 py-3 border bg-(--bg-card) border-(--border)">
                        <div className="flex justify-between items-center gap-2">
                          <h4 className="font-semibold text-sm flex items-center gap-2 text-(--text)">
                            {hol.title}
                            <div className="px-1.5 py-0.5 rounded-md bg-(--status-m-bg) text-(--status-m-text)">
                              <p className="text-[10px] font-semibold">
                                {hol.days} Day{hol.days > 1 ? "s" : ""}
                              </p>
                            </div>
                          </h4>
                          <div className="flex justify-between items-center">
                            {isOngoing ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-(--status-p-bg) text-(--status-p-text) border border-(--status-p-border)">
                                ONGOING
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-(--primary-soft) text-(--primary) border border-(--primary)">
                                UPCOMING
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-(--text-muted) mt-1 mb-2">
                          <Calendar size={12} />
                          <span>
                            {(!hol.to || hol.from === hol.to) ? fromDate : `${fromDate} → ${toDate}`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {visibleDays.map((day, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium border bg-(--bg) border-(--border) text-(--text-muted)"
                            >
                              {day}
                            </span>
                          ))}
                          {remaining > 0 && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-(--bg) border border-(--border) text-(--text-muted)"
                            >
                              +{remaining} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center p-4 text-center border border-dashed border-(--border) rounded-lg bg-(--bg)/30">
                    <p className="text-xs font-semibold text-(--text-muted) uppercase">No upcoming holidays scheduled</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </RequirePermission>
  );
}

function VitalCard({ label, value, icon: Icon }) {
  return (
    <div className="bg-(--bg-card) px-6 py-4 rounded-xl border border-(--border) shadow-sm flex items-center justify-between hover:shadow-md transition-all">
      <div>
        <p className="text-xs font-bold text-(--text-muted) uppercase">{label}</p>
        <h3 className="text-2xl font-bold mt-1 text-(--text)">{value}</h3>
      </div>
      <div className="w-11 h-11 rounded-xl bg-(--bg) flex items-center justify-center text-(--text-muted) border border-(--border)">
        <Icon size={20} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, s }) {
  const bg = `var(--status-${s}-bg)`;
  const txt = `var(--status-${s}-text)`;
  const brd = `var(--status-${s}-border)`;

  return (
    <div
      className="relative overflow-hidden rounded-xl border px-4 py-4 shadow-sm transition-all hover:shadow-md group hover:-translate-y-0.5"
      style={{
        backgroundColor: "var(--bg-card)",
        backgroundImage: `linear-gradient(to bottom right, ${bg}, transparent)`,
        borderColor: brd,
      }}
    >
      <div className="flex justify-between items-start relative z-10">
        <div>
          <p className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider opacity-90">{label}</p>
          <h4 className="text-2xl font-bold transition-colors group-hover:scale-[1.02] transform origin-left" style={{ color: txt }}>
            {value > 0 ? String(value).padStart(2, '0') : '--'}
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

function Legend({ label, color }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs font-semibold text-(--text-muted) uppercase">{label}</span>
    </div>
  );
}
