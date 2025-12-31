"use client";

import { useEffect, useState } from "react";
import {Calendar, LayoutGrid, List, Users, Search, Download} from "lucide-react";
import {collection, doc, getDoc, getDocs, query, where} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { formatInputDate } from "@/lib/dateUtils";
import { toast } from "react-toastify";
import { studentMonthlyReport } from "@/lib/exports/attendance/studentMonthlyReport";
import StudentAttendanceHeatmap, { ClassAttendanceHeatmap } from "@/components/school/attendance/StudentHeatmap";
const STATUS_CLASS = {
  P: "bg-[var(--status-p-bg)] text-[var(--status-p-text)] border-[var(--status-p-border)]",
  A: "bg-[var(--status-a-bg)] text-[var(--status-a-text)] border-[var(--status-a-border)]",
  L: "bg-[var(--status-l-bg)] text-[var(--status-l-text)] border-[var(--status-l-border)]",
  M: "bg-[var(--status-m-bg)] text-[var(--status-m-text)] border-[var(--status-m-border)]",
};
function statusPill(status) {
  if (!status) return "text-(--text-muted)";
  return STATUS_CLASS[status] || "";
}
export default function ViewStudentAttendancePage() {
  const { classData, schoolUser, setLoading } = useSchool();
  const { branch } = useBranch();
  const [mode, setMode] = useState("date");
  const [month, setMonth] = useState("");
  const [date, setDate] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [dateRecords, setDateRecords] = useState({});
  const [monthRecords, setMonthRecords] = useState({});
  const [days, setDays] = useState([]);
  const [summaryHeatmap, setSummaryHeatmap] = useState(null);
  const selectedClass = classData?.find(c => c.id === className);
  async function loadStudents() {
    if (!className || !section) {
      toast.error("Select class & section");
      return;
    }
    setLoading(true);
    try {
      const ref = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "students"
      );
      const q = query(
        ref,
        where("status", "==", "active"),
        where("className", "==", className),
        where("section", "==", section),
        where("rollNo", "!=", null)
      );
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({
        uid: d.id,
        ...d.data(),
      }));
      setStudents(data);
    } catch(err) {
      toast.error('Error: ' + err);
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
    } catch(err) {
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
    } catch(err) {
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
    <div className="max-w-7xl mx-auto space-y-5">
      <div className="flex justify-between items-center flex-col md:flex-row gap-4">
        <div className="flex gap-3 items-start">
          <div className="p-2 rounded bg-(--primary-soft) text-(--primary)">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              View Student Attendance
            </h1>
            <p className="text-sm text-(--text-muted)">
              Monthly & Daily attendance reports
            </p>
          </div>
        </div>
        <div className="flex border border-(--border) rounded-lg overflow-hidden">
          <button
            onClick={() => setMode("month")}
            className={`px-4 py-2 text-sm font-semibold ${
              mode === "month"
                ? "bg-(--primary) text-white"
                : "text-(--text-muted)"
            }`}
          >
            <LayoutGrid size={16} /> by Month
          </button>
          <button
            onClick={() => setMode("date")}
            className={`px-4 py-2 text-sm font-semibold ${
              mode === "date"
                ? "bg-(--primary) text-white"
                : "text-(--text-muted)"
            }`}
          >
            <List size={16} /> by Date
          </button>
        </div>
      </div>
      <div className="border border-(--border) rounded-xl p-4 bg-(--bg-soft)">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          {mode === "month" ? (
            <div className="flex flex-col">
            <label className="text-sm text-(--text-muted)">Month</label>
            <input
              type="month"
              className="input"
              value={month}
              onChange={e => setMonth(e.target.value)}
            />
            </div>
          ) : (
            <div className="flex flex-col">
            <label className="text-sm text-(--text-muted)">Date</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={e => setDate(e.target.value)}
            />
            </div>
          )}
          <div className="flex flex-col">
          <label className="text-sm text-(--text-muted)">Class</label>
          <select
            className="input"
            value={className}
            onChange={e => {
              setClassName(e.target.value);
              setSection("");
            }}
          >
            <option value="">Select Class</option>
            {classData?.map(c => (
              <option key={c.name} value={c.id}>{c.name}</option>
            ))}
          </select>
          </div>
          <div className="flex flex-col">
          <label className="text-sm text-(--text-muted)">Section</label>
          <select
            className="input"
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
            className="btn-primary w-full flex gap-2 items-center justify-center"
          >
            <Search size={16} />
            Load Data
          </button>
        </div>
      </div>
      {students.length > 0 && (
        <div className="flex justify-between items-end flex-col md:flex-row">
          <div className="flex flex-wrap gap-3 text-xs">
            {Object.entries(STATUS_CLASS).map(([k, cls]) => (
              <span
                key={k}
                className={`px-3 py-1 rounded-md font-semibold border ${cls}`}
              >
                {k == 'P' && 'Present'}
                {k == 'A' && 'Absent'}
                {k == 'L' && 'Leave'}
                {k == 'M' && 'Medical'}
                {k == 'H' && 'Half-Day'}
                {k == 'O' && 'Overtime'}
              </span>
            ))}
          </div>
          <div>
          {mode === "month" && students.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() =>
                  studentMonthlyReport({
                    students, days, monthRecords, className, section, month
                  })
                }
                className="btn-outline flex items-center gap-2"
              >
                <Download size={16} className="text-green-500" />
                Export to Excel
              </button>
            </div>
          )}
          </div>
        </div>
      )}
      {mode === "month" && days.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-(--text)">
            Class Attendance Heatmap
          </h3>
          <ClassAttendanceHeatmap
            days={days}
            summary={calculateMonthSummary()}
            totalStudents={students.length}
          />
        </div>
      )}
      {mode === "date" && students.length > 0 && (
        <div className="border border-(--border) rounded-xl divide-y">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-(--bg-soft) border border-(--border) rounded-xl p-4">
            {(() => {
              let P = 0, A = 0, L = 0, M = 0;

              students.forEach(s => {
                const st = dateRecords[s.uid];
                if (st === "P") P++;
                if (st === "A") A++;
                if (st === "L") L++;
                if (st === "M") M++;
              });

              const total = P + A + L + M;
              const percent = total === 0 ? 0 : Math.round((P / total) * 100);

              const statBox = (label, value, cls) => (
                <div className="flex flex-col items-center justify-center rounded-lg border border-(--border) px-3 py-2 text-center">
                  <span className="text-xs text-(--text-muted)">{label}</span>
                  <span className={`font-semibold ${cls}`}>{(value >= 10 || value == 0) ? value : '0' + value}</span>
                </div>
              );

              return (
                <>
                  {statBox("Present", P, "text-[var(--status-p-text)]")}
                  {statBox("Absent", A, "text-[var(--status-a-text)]")}
                  {statBox("Leave", L, "text-[var(--status-l-text)]")}
                  {statBox("Medical", M, "text-[var(--status-m-text)]")}

                  <div className="col-span-2 md:col-span-2 flex flex-col items-center justify-center rounded-lg border border-(--border) bg-(--bg)">
                    <span className="text-xs text-(--text-muted)">
                      Attendance %
                    </span>
                    <span className="text-lg font-bold text-(--primary)">
                      {percent}%
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
          {students.map(s => (
            <div
              key={s.uid}
              className="flex justify-between items-center px-4 py-3 hover:bg-(--bg-soft) border-(--border)"
            >
              <div>
                <p className="font-semibold capitalize">{s.name}</p>
                <p className="text-xs text-(--text-muted)">
                  App ID: {s.admissionId}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-md text-xs font-semibold ${statusPill(
                  dateRecords[s.uid]
                )}`}
              >
                {dateRecords[s.uid] || "Not Marked"}
              </span>
            </div>
          ))}
        </div>
      )}
      {mode === "month" && students.length > 0 && (
        <div className="overflow-x-auto border border-(--border) rounded-xl">
          <table className="min-w-max text-sm">
            <thead className="sticky top-0 bg-(--bg)">
              <tr>
                <th className="px-3 py-2">App ID</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2 text-center">%</th>
                {days.map(d => (
                  <th key={d} className="px-2 py-2 text-center">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const stats = calculateStudentAttendance(s.uid);
                return (
                  <tr key={s.uid} className="border-t border-(--border)">
                    <td className="px-3 py-2 font-semibold">
                      {s.admissionId}
                    </td>
                    <td className="px-3 py-2 font-semibold capitalize">{s.name}</td>
                    <td className="px-3 py-2 text-center font-semibold">
                      <span
                        className={`px-2 py-1 rounded text-xs
                          ${
                            stats.percent >= 75
                              ? STATUS_CLASS['P']
                              : stats.percent >= 60
                              ? STATUS_CLASS['L']
                              : STATUS_CLASS['A']
                          }`}
                      >
                        {stats.percent}%
                      </span>
                    </td>
                    {days.map(d => (
                      <td key={d} className="px-2 py-2 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${statusPill(
                            monthRecords[s.uid]?.[d]
                          )}`}
                        >
                          {monthRecords[s.uid]?.[d] || "-"}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-(--bg-soft) border-t border-(--border)">
              {(() => {
                const summary = calculateMonthSummary();
                let totalP = 0;
                let totalMarked = 0;
                days.forEach(d => {
                  totalP += summary[d].P;
                  totalMarked +=
                    summary[d].P +
                    summary[d].A +
                    summary[d].L +
                    summary[d].M;
                });
                const percent =
                  totalMarked === 0 ? 0 : Math.round((totalP / totalMarked) * 100);
                return (
                  <tr>
                    <td
                      colSpan={2}
                      className="px-4 py-3 font-semibold text-(--text)"
                    >
                      Monthly Summary
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-bold
                          ${
                            percent >= 75
                              ? "bg-(--status-p-bg) text-(--status-p-text)"
                              : percent >= 60
                              ? "bg-(--status-l-bg) text-(--status-l-text)"
                              : "bg-(--status-a-bg) text-(--status-a-text)"
                          }`}
                      >
                        {percent}%
                      </span>
                    </td>
                    {days.map(d => (
                      <td
                        key={d}
                        className="px-2 py-3 text-center text-[11px]"
                      >
                        <div className="grid grid-cols-1 gap-2 justify-center">
                          <span className="px-1.5 py-0.5 rounded bg-(--status-p-bg) text-(--status-p-text) font-semibold">
                            P {summary[d].P}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-(--status-a-bg) text-(--status-a-text) font-semibold">
                            A {summary[d].A}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-(--status-l-bg) text-(--status-l-text) font-semibold">
                            L {summary[d].L}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-(--status-m-bg) text-(--status-m-text) font-semibold">
                            M {summary[d].M}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-(--bg-card) text-(--text) font-semibold">
                            T {summary[d].total}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-(--bg-card) text-(--text) font-semibold">
                            S {summary[d].strength}
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })()}
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
