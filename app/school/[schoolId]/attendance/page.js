"use client";

import { useState } from "react";
import {Users, Calendar, CheckCircle, Save, User, BadgeCheck, TicketIcon, Cross, ShieldX, ShieldCheck,} from "lucide-react";
import {collection, doc, getDoc, getDocs, query, where} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import ReasonModal from "@/components/school/attendance/ReasonModal";
import { hasPermission } from "@/lib/school/permissionUtils";
import { formatInputDate, todayDDMMYYYY, toInputDate } from "@/lib/dateUtils";
const STUDENT_STATUS = {
  P: "bg-[var(--status-p-bg)] text-[var(--status-p-text)] border-[var(--status-p-border)]",
  A: "bg-[var(--status-a-bg)] text-[var(--status-a-text)] border-[var(--status-a-border)]",
  L: "bg-[var(--status-l-bg)] text-[var(--status-l-text)] border-[var(--status-l-border)]",
  M: "bg-[var(--status-m-bg)] text-[var(--status-m-text)] border-[var(--status-m-border)]",
};

const EMPLOYEE_STATUS = {
  P: STUDENT_STATUS.P,
  A: STUDENT_STATUS.A,
  L: STUDENT_STATUS.L,
  H: "bg-[var(--status-h-bg)] text-[var(--status-h-text)] border-[var(--status-h-border)]",
  O: "bg-[var(--status-o-bg)] text-[var(--status-o-text)] border-[var(--status-o-border)]",
};

export default function MarkAttendancePage() {
  const { classData, schoolUser, setLoading } = useSchool();
  const { branchInfo, branch } = useBranch();
  const today = todayDDMMYYYY();
  const [mode, setMode] = useState("student");
  const [date, setDate] = useState(toInputDate(today));
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [list, setList] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loadingPage, setLoadingPage] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [showReason, setShowReason] = useState(false);
  const [dragStatus, setDragStatus] = useState(null);
  const selectedClass = classData?.find(c => c.name === className);
  const isPastDate = date < toInputDate(today);
  const canModifyPast = hasPermission(schoolUser, 'attendance.modify', false);
  const STATUS = mode === "student" ? STUDENT_STATUS : EMPLOYEE_STATUS;
  function getAttendanceDocId() {
    if (mode === "student") {
      return `student_${formatInputDate(date)}_${className}_${section}`;
    }
    return `employee_${formatInputDate(date)}`;
  }
  async function loadStudents() {
    if (!className || !section) {
      toast.error("Select class & section");
      return;
    }
    setLoading(true);
    try {
      const docId = getAttendanceDocId();
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
      setList(data);
      const snapAtt = await getDoc(
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
      if (snapAtt.exists()) {
        setIsMarked(true);
        setAttendance(snapAtt.data().records || {});
      } else {
        setIsMarked(false);
        const initial = {};
        // data.forEach(s => (initial[s.uid] = "P"));
        setAttendance(initial);
      }
    } catch(err) {
      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
    }
  }
  async function loadEmployees() {
    setLoading(true);
    try {
      const docId = getAttendanceDocId();
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
      const data = snap.docs.map(d => ({
        uid: d.id,
        ...d.data(),
      }));
      setList(data);
      const snapAtt = await getDoc(
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
      if (snapAtt.exists()) {
        setIsMarked(true);
        setAttendance(snapAtt.data().records || {});
      } else {
        setIsMarked(false);
        const initial = {};
        // data.forEach(e => (initial[e.uid] = "P"));
        setAttendance(initial);
      }
    } catch {
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  }
  function setStatus(uid, status) {
    setAttendance(prev => ({ ...prev, [uid]: status }));
  }
  function markAllPresent() {
    const updated = {};
    list.forEach(i => (updated[i.uid] = "P"));
    setAttendance(updated);
  }
  function markAllAbsent() {
    const updated = {};
    list.forEach(i => (updated[i.uid] = "A"));
    setAttendance(updated);
  }
  async function handleSave() {
    if (!list.length) return;
    if (isPastDate && !canModifyPast) {
      toast.error("You cannot modify past attendance");
      return;
    }
    if (isPastDate) {
      setShowReason(true);
      return;
    }
    await saveNormal();
  }
  async function saveNormal() {
    setLoading(true);
    try {
      await secureAxios.post("/api/school/attendance/mark", {
        type: mode,
        date: formatInputDate(date),
        session: schoolUser.currentSession,
        className,
        section,
        branch,
        records: attendance,
      });
      toast.success("Attendance saved");
      setIsMarked(true);
    } catch(err) {
      toast.error("Failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  async function savePending(reason) {
    setLoading(true);
    try {
      await secureAxios.post("/api/school/attendance/pending", {
        type: mode,
        date: formatInputDate(date),
        session: schoolUser.currentSession,
        className,
        section,
        branch,
        records: attendance,
        reason,
      });
      toast.success("Sent for admin approval");
      setShowReason(false);
    } catch(err) {
      toast.error("Failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-(--primary-soft) text-(--primary)">
            <Users size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              Mark Attendance
            </h1>
            <p className="text-sm text-(--text-muted)">
              Students & Employees
            </p>
          </div>
        </div>
        <div className="flex border border-(--border) rounded-lg overflow-hidden">
          {["student", "employee"].map(m => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setList([]);
                setAttendance({});
              }}
              className={`px-4 py-2 text-sm font-medium ${
                mode === m
                  ? "bg-(--primary) text-white"
                  : "text-(--text-muted)"
              }`}
            >
              {m === "student" ? "Students" : "Employees"}
            </button>
          ))}
        </div>
      </div>
      <div className="border border-(--border) rounded-xl p-4 bg-(--bg-soft)">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-sm text-(--text-muted)">Date</label>
            <div className="input flex items-center gap-2">
              <input
                type="date"
                className="bg-transparent outline-none w-full"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </div>
          </div>
          {mode === "student" && (
            <>
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
                  <option key={c.name}>{c.name}</option>
                ))}
              </select>
              <select
                className="input"
                disabled={!selectedClass}
                value={section}
                onChange={e => setSection(e.target.value)}
              >
                <option value="">Select Section</option>
                {selectedClass?.sections.map(sec => (
                  <option key={sec.id} value={sec.name}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            onClick={mode === "student" ? loadStudents : loadEmployees}
            className="btn-primary w-full"
          >
            Load Attendance
          </button>
        </div>
      </div>
      {list.length > 0 && (
        <div className="sticky top-0 z-10 bg-(--bg) py-2 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div className="flex gap-2 flex-col sm:flex-row">
            <button
              onClick={markAllPresent}
              className="btn-outline flex gap-2"
            >
              <ShieldCheck size={17} className="text-green-500" /> Mark All Present
            </button>
            <button
              onClick={markAllAbsent}
              className="btn-outline flex gap-2"
            >
              <ShieldX size={17} className="text-red-500" /> Mark All Absent
            </button>
          </div>
          <button
            onClick={handleSave}
            className="btn-primary flex gap-2"
          >
            <Save size={16} /> Save Attendance
          </button>
        </div>
      )}
      {list.length > 0 && (
        <div className="flex flex-col md:flex-row gap-4 justify-start md:justify-between items-start md:items-center">
          <div>
          <span className={`px-3 py-1 text-xs rounded-md uppercase font-semibold border 
            ${isMarked ? STUDENT_STATUS['P'] : STUDENT_STATUS['A']}
          `}>{isMarked ? 'Already Marked' : 'Attendance Not Marked'}</span>
          </div>
          <div>
              <div className="flex flex-wrap gap-3 text-xs">
                {Object.entries(STATUS).map(([k, cls]) => (
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
          </div>
        </div>
      )}
      <div
        className="border border-(--border) rounded-xl divide-y"
        onMouseLeave={() => setDragStatus(null)}
      >
        {list.map(item => (
          <div
            key={item.uid}
            className="group  border-(--border) flex flex-col md:flex-row gap-3 items-center justify-between px-4 py-3 hover:bg-(--bg-soft)"
          >
            <div className="flex items-center gap-4">
              {mode === "student" ? (
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center
                  bg-(--primary-soft) text-(--primary) font-semibold text-xs md:text-sm">
                  {item.rollNo}
                </div>
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-(--primary) bg-(--primary-soft)">
                  <User size={16} />
                </div>
              )}
              <div>
                <p className="font-semibold">{item.name}</p>
                <div className="flex items-center gap-1 font-medium text-xs text-(--text-muted)">
                  <BadgeCheck size={12} />
                  App ID: {mode === "student"
                    ? item.admissionId
                    : item.employeeId}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 md:gap-2">
              {Object.entries(STATUS).map(([code, cls]) => (
                <button
                  key={code}
                  onMouseDown={() => setDragStatus(code)}
                  onMouseEnter={() =>
                    dragStatus && setStatus(item.uid, dragStatus)
                  }
                  onMouseUp={() => setDragStatus(null)}
                  onClick={() => setStatus(item.uid, code)}
                  className={`min-w-[36px] h-8 rounded-md text-xs font-semibold border transition
                    ${
                      attendance[item.uid] === code
                        ? cls
                        : "border-(--border) text-(--text-muted)"
                    }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <ReasonModal
        open={showReason}
        onClose={() => setShowReason(false)}
        onSubmit={savePending}
      />
    </div>
  );
}
