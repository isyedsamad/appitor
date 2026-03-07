"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, CheckCircle, FileDown, LayoutGrid, List, Search, Download, Calendar, CheckCircle2, AlertTriangle, UserCog } from "lucide-react";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";
import { exportEmployeeMonthlyPDF, exportEmployeeMonthlyExcel } from "@/lib/exports/attendance/employeeMonthlyReport";
import { exportEmployeeDailyPDF, exportEmployeeDailyExcel } from "@/lib/exports/attendance/employeeDailyReport";
import AttendanceExportButtons from "@/components/school/attendance/AttendanceExportButtons";
const STATUS_PILL = status => {
  if (!status) return "text-(--text-muted)";
  if (status === "P")
    return "bg-[var(--status-p-bg)] text-[var(--status-p-text)]";
  if (status === "A")
    return "bg-[var(--status-a-bg)] text-[var(--status-a-text)]";
  if (status === "L")
    return "bg-[var(--status-l-bg)] text-[var(--status-l-text)]";
  if (status === "H")
    return "bg-[var(--status-h-bg)] text-[var(--status-h-text)]";
  if (status === "O")
    return "bg-[var(--status-o-bg)] text-[var(--status-o-text)]";
  return "text-(--text-muted)";
};
export default function ViewEmployeeAttendancePage() {
  const { schoolUser, setLoading, employeeData } = useSchool();
  const { branchInfo, branch } = useBranch();
  const todayInput = new Date().toISOString().split("T")[0];
  const [mode, setMode] = useState("date");
  const [inputValue, setInputValue] = useState(todayInput);
  const [value, setValue] = useState(formatInputDate(todayInput));
  const [employees, setEmployees] = useState([]);
  const [monthRecords, setMonthRecords] = useState({});
  const [dayRecords, setDayRecords] = useState({});

  const daysInMonth = useMemo(() => {
    if (mode !== "month") return [];
    const [y, m] = inputValue.split("-");
    const total = new Date(y, m, 0).getDate();
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [inputValue, mode]);

  const stats = useMemo(() => {
    if (mode === "date") {
      const s = calculateDateSummary(employees, dayRecords);
      return { ...s, percent: s.percent, total: employees.length, marked: s.marked };
    } else {
      let p = 0;
      let m = 0;
      let lowAttendanceCount = 0;

      employees.forEach(e => {
        let empP = 0;
        let empM = 0;
        daysInMonth.forEach(d => {
          const st = monthRecords[e.uid]?.[d];
          if (st) empM++;
          if (st === "P") empP++;
        });

        const empPercent = empM === 0 ? 0 : Math.round((empP / empM) * 100);
        if (empM > 0 && empPercent < 75) {
          lowAttendanceCount++;
        }

        p += empP;
        m += empM;
      });

      const percent = m === 0 ? 0 : Math.round((p / m) * 100);
      return { percent, total: employees.length, lowAttendanceCount };
    }
  }, [dayRecords, monthRecords, employees, daysInMonth, mode]);

  async function loadEmployees() {
    setLoading(true);
    try {
      const activeEmployees = employeeData.filter(e => e.status !== 'disabled');
      setEmployees(activeEmployees);
      if (mode === "month") {
        await loadMonthAttendance(activeEmployees);
      } else {
        await loadDayAttendance();
      }
    } catch (err) {
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }

  async function loadDayAttendance() {
    try {
      const formattedDate = value;
      const docId = `employee_${formattedDate}`;
      const docRef = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "attendance",
        docId
      );
      const snap = await getDoc(docRef);
      setDayRecords(snap.exists() ? snap.data().records || {} : {});
      setMonthRecords({});
    } catch (err) {
      toast.error("Failed to load daily attendance");
    }
  }

  function calculateDateSummary(list, dayRecords) {
    const summary = { total: list.length, marked: 0, P: 0, A: 0, L: 0, M: 0, H: 0, O: 0 };
    list.forEach(item => {
      const st = dayRecords[item.uid];
      if (!st) return;
      summary.marked++;
      if (summary[st] !== undefined) summary[st]++;
    });
    summary.percent = summary.marked === 0 ? 0 : Math.round((summary.P / summary.marked) * 100);
    return summary;
  }

  async function loadMonthAttendance(list) {
    setLoading(true);
    try {
      const records = {};
      list.forEach(e => (records[e.uid] = {}));
      const dayPromises = daysInMonth.map(async (d) => {
        const day = String(d).padStart(2, "0");
        const m = inputValue.split("-")[1].toString().padStart(2, "0");
        const y = inputValue.split("-")[0];
        const formatted = `${day}-${m}-${y}`;
        const ref = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "attendance",
          `employee_${formatted}`
        );
        const snap = await getDoc(ref);
        return snap.exists() ? { day: d, dayRecords: snap.data().records || {} } : null;
      });
      const results = await Promise.all(dayPromises);
      results.filter(Boolean).forEach(({ day, dayRecords }) => {
        Object.entries(dayRecords).forEach(([uid, status]) => {
          if (!records[uid]) records[uid] = {};
          records[uid][day] = status;
        });
      });
      setMonthRecords(records);
      setDayRecords({});
    } catch (error) {
      toast.error("Failed to load monthly attendance");
    } finally {
      setLoading(false);
    }
  }

  const STATUS_CONFIG = {
    P: { label: 'Present', color: 'success', bg: 'bg-(--status-p-bg)', text: 'text-(--status-p-text)', border: 'border-(--status-p-border)' },
    A: { label: 'Absent', color: 'danger', bg: 'bg-(--status-a-bg)', text: 'text-(--status-a-text)', border: 'border-(--status-a-border)' },
    L: { label: 'Leave', color: 'warning', bg: 'bg-(--status-l-bg)', text: 'text-(--status-l-text)', border: 'border-(--status-l-border)' },
    H: { label: 'Half Day', color: 'accent', bg: 'bg-(--status-h-bg)', text: 'text-(--status-h-text)', border: 'border-(--status-h-border)' },
    O: { label: 'Overtime', color: 'info', bg: 'bg-(--status-o-bg)', text: 'text-(--status-o-text)', border: 'border-(--status-o-border)' }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
            <UserCog size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">Employee Attendance</h1>
            <p className="text-xs font-semibold text-(--text-muted)">
              {branchInfo?.name || "Campus View"}
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
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px] space-y-1">
            <label className="text-xs font-semibold uppercase text-(--text-muted) px-1">
              {mode === "month" ? "Target Month" : "Target Date"}
            </label>
            <input
              type={mode === "month" ? "month" : "date"}
              className="input w-full"
              value={mode === "month" ? inputValue.slice(0, 7) : inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                setValue(formatInputDate(e.target.value));
              }}
            />
          </div>

          <button
            onClick={loadEmployees}
            className="btn-primary"
          >
            <Search size={18} />
            <span>Load Records</span>
          </button>

          <div className="flex flex-1"></div>

          {employees.length > 0 && (
            <AttendanceExportButtons
              onExportPDF={() => {
                if (mode === 'month') {
                  exportEmployeeMonthlyPDF({ schoolName: schoolUser?.schoolName, branchInfo, month: inputValue, employees, daysInMonth, monthRecords });
                } else {
                  exportEmployeeDailyPDF({ schoolName: schoolUser?.schoolName, branchInfo, date: value, employees, dayRecords, stats });
                }
              }}
              onExportExcel={() => {
                if (mode === 'month') {
                  exportEmployeeMonthlyExcel({ branchInfo, month: inputValue, employees, daysInMonth, monthRecords });
                } else {
                  exportEmployeeDailyExcel({ branchInfo, date: value, employees, dayRecords, stats });
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
        {mode === 'month' ? (
          <SummaryCard
            label="Low Attendance"
            value={stats.lowAttendanceCount || 0}
            color="danger"
            isCount
            icon={<AlertTriangle size={20} />}
          />
        ) : (
          <SummaryCard
            label="Total Staff"
            value={employees.length}
            color="accent"
            isCount
            icon={<List size={20} />}
          />
        )}
        {mode === "date" ? (
          <>
            <SummaryCard
              label="Present Today"
              value={stats.P || 0}
              color="success"
              isCount
              icon={<CheckCircle2 size={20} />}
            />
            <SummaryCard
              label="On Leave"
              value={stats.L || 0}
              color="warning"
              isCount
              icon={<Calendar size={20} />}
            />
          </>
        ) : (
          <>
            <SummaryCard
              label="Days Tracked"
              value={daysInMonth.length}
              color="info"
              isCount
              icon={<Calendar size={20} />}
            />
            <SummaryCard
              label="Working Branches"
              value={1}
              color="success"
              isCount
              icon={<LayoutGrid size={20} />}
            />
          </>
        )}
      </div>

      {/* Content Area */}
      {employees.length > 0 ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Status Legend */}
          <div className="flex flex-wrap gap-3 items-center p-4 bg-(--bg-card) border border-(--border) rounded-lg">
            <span className="text-xs font-bold text-(--text-muted) uppercase tracking-wider mr-2">Legend:</span>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border ${cfg.bg} ${cfg.border}`} />
                <span className="text-xs font-semibold text-(--text)">{cfg.label}</span>
              </div>
            ))}
          </div>

          {mode === "month" ? (
            <div className="bg-(--bg-card) border border-(--border) rounded-lg overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-(--bg-soft) border-b border-(--border)">
                      <th className="px-5 py-4 font-semibold text-(--text-muted) w-20">Staff ID</th>
                      <th className="px-5 py-4 font-semibold text-(--text-muted)">Employee</th>
                      <th className="px-5 py-4 font-semibold text-(--text-muted) text-center">Score</th>
                      {daysInMonth.map(d => (
                        <th key={d} className="px-2 py-4 font-semibold text-(--text-muted) text-center w-8">{d}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {employees.map(e => {
                      let p = 0, m = 0;
                      daysInMonth.forEach(d => {
                        const st = monthRecords[e.uid]?.[d];
                        if (st) m++;
                        if (st === "P") p++;
                      });
                      const percent = m ? Math.round((p / m) * 100) : 0;
                      return (
                        <tr key={e.uid} className="hover:bg-(--bg-soft)/50 transition-colors">
                          <td className="px-5 py-3 font-semibold uppercase">{e.employeeId}</td>
                          <td className="px-5 py-3">
                            <div className="font-semibold text-(--text) capitalize">{e.name}</div>
                            <div className="text-xs font-semibold text-(--text-muted)">
                              {e.role || 'Staff Member'}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex justify-center">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${percent >= 90 ? 'bg-(--status-p-bg) text-(--status-p-text) border-(--status-p-border)' : percent >= 75 ? 'bg-(--status-l-bg) text-(--status-l-text) border-(--status-l-border)' : 'bg-(--status-a-bg) text-(--status-a-text) border-(--status-a-border)'}`}>
                                {percent}%
                              </span>
                            </div>
                          </td>
                          {daysInMonth.map(d => {
                            const st = monthRecords[e.uid]?.[d];
                            const cfg = STATUS_CONFIG[st];
                            return (
                              <td key={d} className="px-1 py-3 text-center">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-semibold border transition-all ${cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : 'bg-(--bg-card) border-(--border) text-(--text-muted)/30'}`}>
                                  {st || "-"}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                  {employees.map((e, idx) => {
                    const st = dayRecords[e.uid];
                    const cfg = STATUS_CONFIG[st];
                    return (
                      <div key={e.uid} className="flex justify-between items-center px-5 py-4 hover:bg-(--bg-soft)/50 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-(--bg-soft) border border-(--border) flex items-center justify-center font-bold text-(--text-muted) group-hover:border-(--primary-soft) group-hover:text-(--primary) transition-all">
                            {(idx + 1).toString().padStart(2, "0")}
                          </div>
                          <div>
                            <p className="font-semibold text-(--text) capitalize group-hover:text-(--primary) transition-colors">{e.name}</p>
                            <p className="text-xs font-semibold text-(--text-muted)">
                              ID: {e.employeeId} · {e.role}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-lg text-xs font-semibold border shadow-sm transition-all ${cfg ? `${cfg.bg} ${cfg.text} ${cfg.border}` : "bg-(--bg-soft) text-(--text-muted) border-(--border)"}`}>
                          {cfg ? cfg.label : "Not Marked"}
                        </span>
                      </div>
                    );
                  })}
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
                      <ProgressIndicator label="Present" count={stats.P || 0} total={stats.total} color="bg-green-500" />
                      <ProgressIndicator label="Absent" count={stats.A || 0} total={stats.total} color="bg-red-500" />
                      <ProgressIndicator label="Leave" count={stats.L || 0} total={stats.total} color="bg-orange-500" />
                      <ProgressIndicator label="Half Day" count={stats.H || 0} total={stats.total} color="bg-purple-500" />
                      <ProgressIndicator label="Overtime" count={stats.O || 0} total={stats.total} color="bg-blue-500" />
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
            Please select a date/month and click <span className="text-(--primary) font-bold">Load Records</span> above.
          </p>
        </div>
      )}
    </div>
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
