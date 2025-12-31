"use client";

import { useEffect, useMemo, useState } from "react";
import {Users, CheckCircle, FileDown, LayoutGrid, List, Search, Download} from "lucide-react";
import {collection, getDocs, query, where, doc, getDoc} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";
import { exportMonthExcel } from "@/lib/exports/attendance/employeeMonthlyReport";
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
  const { schoolUser, setLoading } = useSchool();
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
  function attendanceDocId() {
    return `employee_${value}`;
  }
  async function loadEmployees() {
    setLoading(true);
    try {
      const ref = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "employees"
      );
      const q = query(ref, where("status", "==", "active"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({
        uid: d.id,
        ...d.data(),
      }));
      setEmployees(list);
      if (mode === "month") {
        await loadMonthAttendance(list);
      } else {
        await loadDayAttendance();
      }
    } catch {
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
        branchInfo.id,
        "attendance",
        docId
      );
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setDayRecords(snap.data().records || {});
      } else {
        setDayRecords({});
      }
      setMonthRecords({});
    } catch (err) {
      console.error(err);
      toast.error("Failed to load daily attendance");
    }
  }
  function calculateDateSummary(list, dayRecords) {
    const summary = {
      total: list.length,
      marked: 0,
      P: 0,
      A: 0,
      L: 0,
      M: 0,
      H: 0,
      O: 0,
    };
    list.forEach(item => {
      const st = dayRecords[item.uid];
      if (!st) return;
      summary.marked++;
      if (summary[st] !== undefined) {
        summary[st]++;
      }
    });
    summary.percent =
      summary.marked === 0
        ? 0
        : Math.round((summary.P / summary.marked) * 100);
    return summary;
  }  
  const dateSummary = useMemo(() => {
    if (mode !== "date") return null;
    return calculateDateSummary(employees, dayRecords);
  }, [mode, employees, dayRecords]);
  // async function loadMonthAttendance(list) {
  //   setLoading(true);
  //   try {
  //     const records = {};
  //     list.forEach(e => (records[e.uid] = {}));
  //     for (const d of daysInMonth) {
  //       const day = String(d).padStart(2, "0");
  //       const [y, m] = inputValue.split("-");
  //       const formatted = `${day}-${m}-${y}`;
  //       const ref = doc(
  //         db,
  //         "schools",
  //         schoolUser.schoolId,
  //         "branches",
  //         branch,
  //         "attendance",
  //         `employee_${formatted}`
  //       );
  //       const snap = await getDoc(ref);
  //       if (!snap.exists()) continue; 
  //       Object.entries(snap.data().records || {}).forEach(([uid, status]) => {
  //         if (!records[uid]) records[uid] = {};
  //         records[uid][d] = status;
  //       });
  //     }
  //     setMonthRecords(records);
  //     setDayRecords({});
  //   } catch (error) {
  //     console.error('Attendance load error:', error);
  //     toast.error('Failed to load attendance');
  //   } finally {
  //     setLoading(false);
  //   }
  // }
  async function loadMonthAttendance(list) {
    setLoading(true);
    try {
      const monthRecords = {};
      list.forEach(e => (monthRecords[e.uid] = {}));
      const dayPromises = daysInMonth.map(async (d) => {
        const day = String(d).padStart(2, "0");
        const [y, m] = inputValue.split("-");
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
        return snap.exists()
          ? { day: d, dayRecords: snap.data().records || {} } // 👈 rename
          : null;
      });
      const dayResults = await Promise.all(dayPromises);
      dayResults
        .filter(Boolean)
        .forEach(({ day, dayRecords }) => {
          Object.entries(dayRecords).forEach(([uid, status]) => {
            if (!monthRecords[uid]) monthRecords[uid] = {};
            monthRecords[uid][day] = status;
          });
        });
      setMonthRecords(monthRecords);
      setDayRecords({});
    } catch (error) {
      console.error("Attendance load error:", error);
      toast.error("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }  
  const avgAttendance = useMemo(() => {
    if (mode !== "month" || !employees.length) return 0;
    let p = 0;
    let m = 0;
    employees.forEach(e =>
      daysInMonth.forEach(d => {
        const st = monthRecords[e.uid]?.[d];
        if (st) m++;
        if (st === "P") p++;
      })
    );
    return m === 0 ? 0 : Math.round((p / m) * 100);
  }, [monthRecords, employees, daysInMonth, mode]);
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start border-b border-(--border) pb-4">
        <div className="flex gap-3 items-start">
          <div className="p-2 rounded bg-(--primary-soft) text-(--primary)">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              View Employee Attendance
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
      <div className="flex gap-3 flex-col md:flex-row items-center max-w-sm">
        <input
          type={mode === "month" ? "month" : "date"}
          className="input"
          value={mode === "month" ? inputValue.slice(0, 7) : inputValue}
          onChange={e => {
            setInputValue(e.target.value);
            setValue(formatInputDate(e.target.value));
          }}
        />
        <button onClick={loadEmployees} className="btn-primary">
          <Search size={16} /> Load
        </button>
      </div>
      {mode === "month" && employees.length > 0 && (
        <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 bg-(--bg) border border-(--border) rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} /> {employees.length} Employees
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={14} /> {avgAttendance}% Avg Attendance
          </div>
          <div className="flex-1"></div>
          <button
            onClick={() => exportMonthExcel}
            className="btn-outline flex gap-2"
          >
            <Download size={15} className="text-green-500" /> Export to Excel
          </button>
        </div>
      )}
      {mode === "month" && (
        <div className="overflow-x-auto border border-(--border) rounded-xl">
          <table className="min-w-max w-full text-sm">
            <thead className="bg-(--bg-soft)">
              <tr>
                <th className="px-4 py-3 text-left">Employee ID</th>
                <th className="px-4 py-3 text-left">Name</th>
                {daysInMonth.map(d => (
                  <th key={d} className="px-2 py-3 text-center">{d}</th>
                ))}
                <th className="px-4 py-3 text-center">%</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(e => {
                let p = 0, m = 0;
                daysInMonth.forEach(d => {
                  const st = monthRecords[e.uid]?.[d];
                  if (st) m++;
                  if (st === "P") p++;
                });
                return (
                  <tr key={e.uid} className="border-t border-(--border) hover:bg-(--bg-soft)">
                    <td className="px-4 py-2 font-medium">{e.employeeId}</td>
                    <td className="px-4 py-2 font-semibold">{e.name}</td>
                    {daysInMonth.map(d => (
                      <td key={d} className="px-2 py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_PILL(monthRecords[e.uid]?.[d])}`}>
                          {monthRecords[e.uid]?.[d] || "-"}
                        </span>
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-bold">
                      {m ? Math.round((p / m) * 100) : 0}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {mode === "date" && employees.length > 0 && (
        <div className="flex flex-wrap gap-4 items-center bg-(--bg-soft)
                        border border-(--border) rounded-xl px-5 py-3">
          <div className="flex items-center gap-2 text-sm">
            <Users size={14} />
            <span className="text-(--text-muted)">Total:</span>
            <span className="font-semibold">{employees.length}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle size={14} className="text-(--status-p-text)" />
            <span className="text-(--text-muted)">Present:</span>
            <span className="font-semibold">
              {dateSummary.P}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-(--status-a-bg)" />
            <span className="text-(--text-muted)">Absent:</span>
            <span className="font-semibold">{dateSummary.A}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-full bg-(--status-l-bg)" />
            <span className="text-(--text-muted)">Leave:</span>
            <span className="font-semibold">{dateSummary.L}</span>
          </div>
          {dateSummary.H > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-(--status-h-bg)" />
              <span className="text-(--text-muted)">Half Day:</span>
              <span className="font-semibold">{dateSummary.H}</span>
            </div>
          )}
          {dateSummary.O > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full bg-(--status-o-bg)" />
              <span className="text-(--text-muted)">Overtime:</span>
              <span className="font-semibold">{dateSummary.O}</span>
            </div>
          )}
          <div className="ml-auto text-sm font-semibold">
            Attendance:
            <span className="ml-1 text-(--primary)">
              {dateSummary.percent}%
            </span>
          </div>
        </div>
      )}
      {mode === "date" && (
        <div className="border border-(--border) rounded-xl divide-y">
          {employees.map(e => (
            <div
              key={e.uid}
              className="flex justify-between items-center px-4 py-3 border-(--border) hover:bg-(--bg-soft)"
            >
              <div>
                <p className="font-semibold capitalize">{e.name}</p>
                <p className="text-xs font-medium text-(--text-muted)">
                  Employee ID: {e.employeeId}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-semibold ${STATUS_PILL(dayRecords[e.uid])}`}>
                {dayRecords[e.uid] || "-"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
