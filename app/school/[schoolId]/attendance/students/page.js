"use client";

import { useEffect, useState, useMemo } from "react";
import { Calendar, LayoutGrid, List, Users, Search, Download, CheckCircle2 } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { formatInputDate } from "@/lib/dateUtils";
import { toast } from "react-toastify";
import { exportStudentMonthlyPDF, exportStudentMonthlyExcel } from "@/lib/exports/attendance/studentMonthlyReport";
import { exportStudentDailyPDF, exportStudentDailyExcel } from "@/lib/exports/attendance/studentDailyReport";
import AttendanceExportButtons from "@/components/school/attendance/AttendanceExportButtons";
import StudentAttendanceHeatmap, { ClassAttendanceHeatmap } from "@/components/school/attendance/StudentHeatmap";
import RequirePermission from "@/components/school/RequirePermission";
import { canManage } from "@/lib/school/permissionUtils";
const STATUS_CLASS = {
  P: "bg-(--status-p-bg) text-(--status-p-text) border-(--status-p-border)",
  A: "bg-(--status-a-bg) text-(--status-a-text) border-(--status-a-border)",
  L: "bg-(--status-l-bg) text-(--status-l-text) border-(--status-l-border)",
  M: "bg-(--status-m-bg) text-(--status-m-text) border-(--status-m-border)",
};
function statusPill(status) {
  if (!status) return "text-(--text-muted)";
  return STATUS_CLASS[status] || "";
}
export default function ViewStudentAttendancePage() {
  const { classData, schoolUser, setLoading } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [mode, setMode] = useState("date");
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [dateRecords, setDateRecords] = useState({});
  const [monthRecords, setMonthRecords] = useState({});
  const [days, setDays] = useState([]);
  const selectedClass = classData?.find(c => c.id === className);
  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;

  const stats = useMemo(() => {
    if (mode === "date") {
      let P = 0, A = 0, L = 0, M = 0;
      students.forEach(s => {
        const st = dateRecords[s.uid];
        if (st === "P") P++;
        else if (st === "A") A++;
        else if (st === "L") L++;
        else if (st === "M") M++;
      });
      const marked = P + A + L + M;
      const percent = marked === 0 ? 0 : Math.round((P / marked) * 100);
      return { P, A, L, M, percent, total: students.length, marked };
    } else {
      const summary = calculateMonthSummary();
      let totalP = 0;
      let totalMarked = 0;
      days.forEach(d => {
        totalP += summary[d].P;
        totalMarked += summary[d].P + summary[d].A + summary[d].L + summary[d].M;
      });
      const percent = totalMarked === 0 ? 0 : Math.round((totalP / totalMarked) * 100);
      const lowAttendanceCount = students.filter(s => {
        const sStats = calculateStudentAttendance(s.uid);
        return sStats.percent < 75;
      }).length;
      return { percent, total: students.length, lowAttendance: lowAttendanceCount };
    }
  }, [students, dateRecords, monthRecords, mode, days]);

  async function loadStudents() {
    if (!className || !section) {
      toast.error("Select class & section");
      return;
    }
    setLoading(true);
    try {
      const rosterRef = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "meta",
        `${className}_${section}_${schoolUser.currentSession}`
      );
      const snap = await getDoc(rosterRef);
      let data = [];
      if (snap.exists()) {
        const roster = snap.data();
        data = (roster.students || [])
          .filter(
            (s) => s.status === "active" && s.rollNo !== null
          )
          .map((s) => ({
            ...s,
            classId: roster.classId,
            sectionId: roster.sectionId,
          }));
      }
      setStudents(data);
    } catch (err) {
      console.error("LOAD STUDENTS META ERROR:", err);
      toast.error("Error: " + err);
    } finally {
      setLoading(false);
    }
  }
  async function loadByDate() {
    if (!date) {
      toast.error("Select date");
      return;
    }
    setLoading(true);
    try {
      await loadStudents();
      const formattedDate = formatInputDate(date);
      const docId = `student_${formattedDate}_${className}_${section}`;
      const snap = await getDoc(
        doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "attendance",
          docId
        )
      );
      setDateRecords(snap.exists() ? snap.data().records || {} : {});
    } catch (err) {
      toast.error('Error: ' + err);
    } finally {
      setLoading(false);
    }
  }
  async function loadByMonth() {
    if (!month) {
      toast.error("Select month");
      return;
    }
    setLoading(true);
    try {
      await loadStudents();
      const [year, m] = month.split("-");
      const totalDays = new Date(year, m, 0).getDate();
      const dList = Array.from({ length: totalDays }, (_, i) => i + 1);
      setDays(dList);
      const promises = dList.map(async (d) => {
        const day = String(d).padStart(2, "0");
        const formattedDate = `${day}-${m}-${year}`;
        const docId = `student_${formattedDate}_${className}_${section}`;
        const snap = await getDoc(doc(db, "schools", schoolUser.schoolId, "branches", branch, "attendance", docId));
        if (snap.exists()) {
          const rec = snap.data().records || {};
          return rec;
        }
        return {};
      });
      const allRecords = await Promise.all(promises);
      const matrix = {};
      allRecords.forEach((dayRecords, dayIndex) => {
        Object.entries(dayRecords).forEach(([uid, status]) => {
          if (!matrix[uid]) matrix[uid] = {};
          matrix[uid][dList[dayIndex]] = status;
        });
      });
      setMonthRecords(matrix);
    } catch (err) {
      toast.error('Error: ' + err);
    } finally {
      setLoading(false);
    }
  }
  function calculateStudentAttendance(uid) {
    const record = monthRecords[uid] || {};
    let present = 0;
    let total = 0;
    days.forEach(d => {
      const status = record[d];
      if (!status) return;
      total++;
      if (status === "P") present++;
    });
    const percent = total === 0 ? 0 : Math.round((present / total) * 100);
    return { present, total, percent };
  }
  function calculateMonthSummary() {
    const summary = {};
    const totalStudents = students.length;
    days.forEach(d => {
      const daySummary = { P: 0, A: 0, L: 0, M: 0 };
      students.forEach(s => {
        const status = monthRecords[s.uid]?.[d];
        if (status && daySummary[status] !== undefined) {
          daySummary[status]++;
        }
      });
      const marked =
        daySummary.P + daySummary.A + daySummary.L + daySummary.M;
      const presentScore =
        daySummary.P + 0.5 * (daySummary.L + daySummary.M);
      const percent =
        marked === 0 ? 0 : Math.round((presentScore / marked) * 100);
      summary[d] = {
        ...daySummary,
        total: marked,
        percent,
        strength: totalStudents,
      };
    });
    return summary;
  }
  useEffect(() => {
    setStudents([]);
    setDateRecords({});
    setMonthRecords({});
  }, [mode]);

  return (
    <RequirePermission permission="attendance.student.view">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-(--primary-soft) text-(--primary) shadow-sm ring-1 ring-(--primary)/10">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Student Attendance</h1>
              <p className="text-sm font-medium text-(--text-muted)">
                Attendance: {branchInfo?.name || "Campus View"}
              </p>
            </div>
          </div>

          <div className="flex bg-(--bg-card) p-1 rounded-xl border border-(--border)">
            <button
              onClick={() => setMode("month")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === "month"
                ? "bg-(--primary-soft) text-(--primary)"
                : "text-(--text-muted) hover:text-(--text)"
                }`}
            >
              <LayoutGrid size={16} /> Month
            </button>
            <button
              onClick={() => setMode("date")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${mode === "date"
                ? "bg-(--primary-soft) text-(--primary)"
                : "text-(--text-muted) hover:text-(--text)"
                }`}
            >
              <Calendar size={16} /> Date
            </button>
          </div>
        </div>

        {/* Filters */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-(--text-muted) px-1">
                {mode === "month" ? "Target Month" : "Target Date"}
              </label>
              {mode === "month" ? (
                <input
                  type="month"
                  className="input w-full"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                />
              ) : (
                <input
                  type="date"
                  className="input w-full"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-(--text-muted) px-1">Academic Class</label>
              <select
                className="input w-full"
                value={className}
                onChange={e => {
                  setClassName(e.target.value);
                  setSection("");
                }}
              >
                <option value="">Select Class</option>
                {classData?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase text-(--text-muted) px-1">Section</label>
              <select
                className="input w-full"
                disabled={!selectedClass}
                value={section}
                onChange={e => setSection(e.target.value)}
              >
                <option value="">Select Section</option>
                {selectedClass?.sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={mode === "month" ? loadByMonth : loadByDate}
              className="btn-primary"
            >
              <Search size={18} />
              <span className="font-semibold">Load Data</span>
            </button>

            {students.length > 0 && (
              <AttendanceExportButtons
                onExportPDF={() => {
                  if (mode === 'month') {
                    exportStudentMonthlyPDF({ branchInfo, className: getClassName(className), section: getSectionName(className, section), month, students, days, monthRecords });
                  } else {
                    exportStudentDailyPDF({ branchInfo, className: getClassName(className), section: getSectionName(className, section), date, students, dateRecords, stats });
                  }
                }}
                onExportExcel={() => {
                  if (mode === 'month') {
                    exportStudentMonthlyExcel({ branchInfo, className: getClassName(className), section: getSectionName(className, section), month, students, days, monthRecords });
                  } else {
                    exportStudentDailyExcel({ branchInfo, className: getClassName(className), section: getSectionName(className, section), date, students, dateRecords, stats });
                  }
                }}
              />
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Avg. Attendance"
            value={stats.percent}
            color="primary"
            unit="%"
            icon={<Users size={20} />}
          />
          <SummaryCard
            label="Total Students"
            value={students.length}
            color="accent"
            isCount
            icon={<List size={20} />}
          />
          {mode === "date" && (
            <>
              <SummaryCard
                label="Present Today"
                value={stats.P}
                color="success"
                isCount
                icon={<Calendar size={20} />}
              />
              <SummaryCard
                label="Absent Today"
                value={stats.A}
                color="warning"
                isCount
                icon={<Search size={20} />}
              />
            </>
          )}
          {mode === "month" && (
            <>
              <SummaryCard
                label="Days Tracked"
                value={days.length}
                color="warning"
                isCount
                icon={<Calendar size={20} />}
              />
              <SummaryCard
                label="Low Attendance"
                value={stats.lowAttendance || 0}
                color="danger"
                isCount
                icon={<Search size={20} />}
              />
            </>
          )}
        </div>

        {/* Content Area */}
        {students.length > 0 ? (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Status Legend */}
            <div className="flex flex-wrap gap-3 items-center p-4 bg-(--bg-card) border border-(--border) rounded-lg">
              <span className="text-xs font-bold text-(--text-muted) uppercase tracking-wider mr-2">Legend:</span>
              {[
                { label: 'Present', k: 'P' },
                { label: 'Absent', k: 'A' },
                { label: 'Leave', k: 'L' },
                { label: 'Medical', k: 'M' }
              ].map(item => (
                <div key={item.k} className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full border ${STATUS_CLASS[item.k]}`} />
                  <span className="text-xs font-semibold text-(--text)">{item.label}</span>
                </div>
              ))}
            </div>

            {mode === "month" ? (
              <div className="space-y-3">
                <div className="bg-(--bg-card) border border-(--border) p-5 rounded-lg shadow-xs">
                  <h3 className="text-sm font-bold text-(--text) mb-4 flex items-center gap-2">
                    <LayoutGrid size={16} className="text-(--primary)" />
                    Attendance Heatmap
                  </h3>
                  <ClassAttendanceHeatmap
                    days={days}
                    summary={calculateMonthSummary()}
                    totalStudents={students.length}
                  />
                </div>

                <div className="bg-(--bg-card) border border-(--border) rounded-lg overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                      <thead>
                        <tr className="bg-(--bg-soft) border-b border-(--border)">
                          <th className="px-5 py-4 font-semibold text-(--text-muted) w-20">App ID</th>
                          <th className="px-5 py-4 font-semibold text-(--text-muted)">Student Name</th>
                          <th className="px-5 py-4 font-semibold text-(--text-muted) text-center">Score</th>
                          {days.map(d => (
                            <th key={d} className="px-2 py-4 font-semibold text-(--text-muted) text-center w-8">
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-(--border)">
                        {students.map(s => {
                          const sStats = calculateStudentAttendance(s.uid);
                          return (
                            <tr key={s.uid} className="hover:bg-(--bg-soft)/50 transition-colors">
                              <td className="px-5 py-3 font-semibold text-(--primary) uppercase tracking-wider">{s.appId}</td>
                              <td className="px-5 py-3">
                                <div className="font-semibold text-(--text) capitalize">{s.name}</div>
                                <div className="text-xs font-semibold text-(--text-muted)">
                                  Roll No: {s.rollNo?.toString().padStart(2, '0') || 'N/A'}
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                <div className="flex justify-center">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${sStats.percent >= 75 ? 'bg-(--status-p-bg) text-(--status-p-text) border-(--status-p-border)' : sStats.percent >= 50 ? 'bg-(--status-l-bg) text-(--status-l-text) border-(--status-l-border)' : 'bg-(--status-a-bg) text-(--status-a-text) border-(--status-a-border)'}`}>
                                    {sStats.percent}%
                                  </span>
                                </div>
                              </td>
                              {days.map(d => (
                                <td key={d} className="px-1 py-3 text-center">
                                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold border border-(--border) transition-all ${statusPill(monthRecords[s.uid]?.[d]) || 'bg-(--bg-card) border-(--border) text-(--text-muted)/30'}`}>
                                    {monthRecords[s.uid]?.[d] || "-"}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-(--bg-card) border border-(--border) rounded-lg overflow-hidden shadow-xs">
                  <div className="px-5 py-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)/50">
                    <h2 className="font-semibold text-sm text-(--text)">Daily Roster</h2>
                    <span className="text-xs font-semibold text-(--primary) bg-(--primary-soft) px-2 py-1 rounded-lg border border-(--primary)/10 uppercase tracking-widest">
                      {stats.marked}/{stats.total} Marked
                    </span>
                  </div>
                  <div className="divide-y divide-(--border)">
                    {students.map(s => (
                      <div key={s.uid} className="flex justify-between items-center px-5 py-4 hover:bg-(--bg-soft)/50 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 text-sm rounded-xl bg-(--bg-soft) border border-(--border) flex items-center justify-center font-bold text-(--text-muted) group-hover:border-(--primary-soft) group-hover:text-(--primary) transition-all">
                            {s.rollNo?.toString().padStart(2, '0') || "-"}
                          </div>
                          <div>
                            <p className="font-semibold text-(--text) capitalize group-hover:text-(--primary) transition-colors">{s.name}</p>
                            <p className="text-xs font-semibold text-(--text-muted)">
                              App ID: {s.appId}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border shadow-sm transition-all ${statusPill(dateRecords[s.uid]) || "bg-(--bg-soft) text-(--text-muted) border-(--border)"}`}>
                          {dateRecords[s.uid] ? (
                            dateRecords[s.uid] === 'P' ? 'Present' :
                              dateRecords[s.uid] === 'A' ? 'Absent' :
                                dateRecords[s.uid] === 'L' ? 'On Leave' : 'Medical'
                          ) : "Not Marked"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-(--bg-card) border border-(--border) rounded-lg p-6 shadow-xs relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="text-sm font-semibold text-(--text) mb-4 flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-green-500" />
                        Distribution
                      </h3>
                      <div className="space-y-4">
                        <ProgressIndicator label="Present" count={stats.P} total={stats.total} color="bg-green-500" />
                        <ProgressIndicator label="Absent" count={stats.A} total={stats.total} color="bg-red-500" />
                        <ProgressIndicator label="Leave" count={stats.L} total={stats.total} color="bg-orange-500" />
                        <ProgressIndicator label="Medical" count={stats.M} total={stats.total} color="bg-blue-500" />
                      </div>
                    </div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-(--primary) opacity-5 blur-3xl rounded-full" />
                  </div>

                  <div className="bg-gradient-to-br from-(--status-o-bg) to-(--status-o-bg)/60 rounded-lg p-6 text-white shadow-lg shadow-(--primary)/20 relative overflow-hidden group">
                    <div className="relative z-10 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-2xl bg-(--status-o-bg) backdrop-blur-md flex items-center justify-center mb-4 ring-1 ring-white/30 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Users size={32} color="var(--status-o-text)" />
                      </div>
                      <p className="text-xs font-semibold uppercase text-(--status-o-text) mb-1">Marking Strength</p>
                      <h4 className="text-4xl font-bold text-(--status-o-text) mb-2">{stats.percent}%</h4>
                      <div className="w-full h-1.5 bg-(--status-o-bg)/20 rounded-full mt-2 overflow-hidden shadow-inner">
                        <div
                          className="h-full bg-(--status-o-text) rounded-full shadow-[0_0_10px_var(--status-o-bg)]"
                          style={{ width: `${stats.percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)] pointer-events-none" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-(--bg-card) border border-(--border) border-dashed rounded-xl animate-in fade-in zoom-in-95 duration-700">
            <div className="w-20 h-20 rounded-2xl bg-(--bg-soft) flex items-center justify-center text-(--text-muted) mb-6 ring-1 ring-(--border) shadow-inner">
              <Search size={32} />
            </div>
            <h3 className="text-lg font-bold text-(--text) mb-2">No attendance data to display</h3>
            <p className="text-sm text-(--text-muted) font-medium text-center max-w-[280px]">
              Please adjust your filters and click <span className="text-(--primary) font-bold">Load Data</span> above.
            </p>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function SummaryCard({ label, value, color, icon, isCount, unit = "" }) {
  const getThemeVars = () => {
    switch (color) {
      case "danger":
        return {
          bg: "bg-(--status-o-bg)",
          text: "text-(--status-o-text)",
          border: "border-(--status-o-border)",
          gradient: "from-(--status-o-bg)/50 to-transparent",
        };
      case "success":
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
      case "accent":
        return {
          bg: "bg-(--status-m-bg)",
          text: "text-(--status-m-text)",
          border: "border-(--status-m-border)",
          gradient: "from-(--status-m-bg)/50 to-transparent",
        };
      case "info":
        return {
          bg: "bg-(--status-l-bg)",
          text: "text-(--status-l-text)",
          border: "border-(--status-l-border)",
          gradient: "from-(--status-l-bg)/50 to-transparent",
        };
      default:
        return {
          bg: "bg-(--primary-soft)",
          text: "text-(--primary)",
          border: "border-(--primary)/20",
          gradient: "from-(--primary)/10 to-transparent",
        };
    }
  };

  const theme = getThemeVars();

  return (
    <div className={`relative overflow-hidden rounded-lg border ${theme.border} bg-gradient-to-br ${theme.gradient} bg-(--bg-card) px-5 py-4 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] duration-300`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-(--text-muted)">{label}</p>
          <div className="flex items-baseline gap-1">
            <h3 className={`text-2xl font-bold tracking-tight ${theme.text}`}>
              {value == 0 ? '-' : value.toString().padStart(2, "0")}
              <span className="text-xs font-bold opacity-60 ml-0.5">{unit}</span>
            </h3>
          </div>
        </div>
        <div className={`p-2 rounded-xl ${theme.bg} ${theme.text} ${theme.border} border shadow-inner`}>
          {icon}
        </div>
      </div>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.gradient} opacity-20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none`} />
    </div>
  );
}

function ProgressIndicator({ label, count, total, color }) {
  const percent = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-semibold">
        <span className="text-(--text-muted)">{label}</span>
        <span className="text-(--text)">{count} ({percent}%)</span>
      </div>
      <div className="h-1.5 bg-(--bg) rounded-full overflow-hidden border border-(--border)/50">
        <div
          className={`h-full ${color} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

