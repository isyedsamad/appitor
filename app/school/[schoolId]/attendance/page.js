"use client";

import { useState, useMemo, useEffect } from "react";
import { Users, Calendar, CheckCircle, Save, User, BadgeCheck, TicketIcon, Cross, ShieldX, ShieldCheck, Search, ArrowUp, ArrowDown, ArrowUpDown, UserCog, ClipboardList, Zap } from "lucide-react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import ReasonModal from "@/components/school/attendance/ReasonModal";
import { formatInputDate, todayDDMMYYYY, toInputDate } from "@/lib/dateUtils";
import RequirePermission from "@/components/school/RequirePermission";
import { canManage, hasPermission } from "@/lib/school/permissionUtils";
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
  const { classData, employeeData, schoolUser, setLoading } = useSchool();
  const { branchInfo, branch } = useBranch();
  const currentPlan = branchInfo?.plan || schoolUser.plan || "trial";
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
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    setList([]);
  }, [date, className, section]);

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-(--primary)" /> : <ArrowDown size={14} className="ml-1 text-(--primary)" />;
  };

  const sortedList = useMemo(() => {
    let sortableItems = [...list];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        const key = sortConfig.key;
        let aValue = key === 'appId' ? (mode === 'student' ? a.appId : a.employeeId) : a[key];
        let bValue = key === 'appId' ? (mode === 'student' ? b.appId : b.employeeId) : b[key];

        if (key === 'rollNo' && mode === 'student') {
          aValue = aValue ? parseInt(aValue, 10) : 999999;
          bValue = bValue ? parseInt(bValue, 10) : 999999;
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [list, sortConfig, mode]);

  const selectedClass = classData?.find(c => c.id === className);
  const isPastDate = date < toInputDate(today);
  const canModifyPast = hasPermission(schoolUser, 'attendance.mark.past.manage', false, currentPlan);
  const canViewStudent = hasPermission(schoolUser, 'attendance.mark.student.view', false, currentPlan);
  const canViewEmployee = hasPermission(schoolUser, 'attendance.mark.employee.view', false, currentPlan);
  const editable = mode === "student"
    ? canManage(schoolUser, "attendance.mark.student.manage", currentPlan)
    : canManage(schoolUser, "attendance.mark.employee.manage", currentPlan);
  const STATUS = mode === "student" ? STUDENT_STATUS : EMPLOYEE_STATUS;

  // Initialize mode based on permissions if current mode is restricted
  useState(() => {
    if (mode === "student" && !canViewStudent && canViewEmployee) {
      setMode("employee");
    } else if (mode === "employee" && !canViewEmployee && canViewStudent) {
      setMode("student");
    }
  }, [canViewStudent, canViewEmployee]);

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
      const rosterRef = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "meta",
        `${className}_${section}_${schoolUser.currentSession}`
      );
      const rosterSnap = await getDoc(rosterRef);
      let data = [];
      if (rosterSnap.exists()) {
        const roster = rosterSnap.data();
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
        setAttendance({});
      }
    } catch (err) {
      console.error("LOAD ATTENDANCE META ERROR:", err);
      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
    }
  }

  async function loadEmployees() {
    setLoading(true);
    try {
      const docId = getAttendanceDocId();
      setList(employeeData.filter(e => e.status != 'disabled'));
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
        setAttendance({});
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
    } catch (err) {
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
    } catch (err) {
      toast.error("Failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission={["attendance.mark.student.view", "attendance.mark.employee.view"]}>
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Mark Attendance
              </h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Students & Employees
              </p>
            </div>
          </div>
          <div className="flex border border-(--border) rounded-lg overflow-hidden">
            {canViewStudent && (
              <button
                onClick={() => {
                  setMode("student");
                  setList([]);
                  setAttendance({});
                }}
                className={`px-4 py-2 text-sm font-medium ${mode === "student"
                  ? "bg-(--primary) text-white"
                  : "text-(--text-muted) bg-(--bg-card)"
                  }`}
              >
                <Users size={15} /> Students
              </button>
            )}
            {canViewEmployee && (
              <button
                onClick={() => {
                  setMode("employee");
                  setList([]);
                  setAttendance({});
                }}
                className={`px-4 py-2 text-sm font-medium ${mode === "employee"
                  ? "bg-(--primary) text-white"
                  : "text-(--text-muted) bg-(--bg-card)"
                  }`}
              >
                <UserCog size={15} /> Employees
              </button>
            )}
          </div>
        </div>
        <div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-sm font-semibold text-(--text-muted)">Date</label>
              <div className="input flex items-center gap-2">
                <input
                  type="date"
                  className="bg-(--bg-card) outline-none w-full disabled:opacity-50"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  disabled={!canModifyPast && date === toInputDate(today)}
                  max={!canModifyPast ? toInputDate(today) : undefined}
                  min={!canModifyPast ? toInputDate(today) : undefined}
                />
              </div>
            </div>
            {mode === "student" && (
              <>
                <div>
                  <label className="text-sm font-semibold text-(--text-muted)">Class</label>
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
                <div>
                  <label className="text-sm font-semibold text-(--text-muted)">Section</label>
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
              </>
            )}
            <button
              onClick={mode === "student" ? loadStudents : loadEmployees}
              className="btn-primary"
            >
              <Search size={15} />
              Load Attendance
            </button>
          </div>
        </div>
        {list.length > 0 && (
          <div className="sticky top-0 z-10 bg-(--bg) py-2 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
            {editable && (
              <div className="flex gap-2 flex-col sm:flex-row">
                <button
                  onClick={markAllPresent}
                  className="btn-outline border-[1.5px] hover:bg-(--status-p-bg)/30 border-(--status-p-border) shadow-(--status-p-bg) shadow-sm flex gap-2"
                >
                  <ShieldCheck size={17} className="text-(--status-p-text)" /> Mark All Present
                </button>
                <button
                  onClick={markAllAbsent}
                  className="btn-outline border-[1.5px] hover:bg-(--status-a-bg)/30 border-(--status-a-border) shadow-(--status-a-bg) shadow-sm flex gap-2"
                >
                  <ShieldX size={17} className="text-(--status-a-text)" /> Mark All Absent
                </button>
              </div>
            )}
            {editable && (
              <button
                onClick={handleSave}
                className="btn-primary flex gap-2"
              >
                <Save size={16} /> Save Attendance
              </button>
            )}
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
              <div className="flex flex-wrap gap-2 text-xs">
                {Object.entries(STATUS).map(([k, cls]) => {
                  if (mode === 'employee' && k === 'M') return null;
                  if (mode === 'student' && (k === 'H' || k === 'O')) return null;
                  return (
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
                  );
                })}
              </div>
            </div>
          </div>
        )}
        <div className="bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" onMouseLeave={() => setDragStatus(null)}>
              <thead>
                <tr className="bg-(--bg) border-b border-(--border)">
                  <th
                    className={`px-5 py-3 font-semibold text-(--text-muted) text-xs uppercase tracking-wider w-24 ${mode === 'student' ? 'cursor-pointer hover:text-(--text) transition-colors select-none' : ''}`}
                    onClick={() => mode === 'student' && handleSort('rollNo')}
                  >
                    <div className="flex items-center">
                      {mode === "student" ? "Roll" : "Icon"}
                      {mode === "student" && getSortIcon('rollNo')}
                    </div>
                  </th>
                  <th
                    className="px-5 py-3 font-semibold text-(--text-muted) text-xs uppercase tracking-wider cursor-pointer hover:text-(--text) transition-colors select-none"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Details {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-(--text-muted) text-xs uppercase tracking-wider text-right">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {list.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-5 py-10 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-(--bg) flex items-center justify-center text-(--text-muted)">
                          <Users size={32} />
                        </div>
                        <h3 className="text-base mt-4 font-semibold text-(--text)">No records to display</h3>
                        <p className="text-xs text-(--text-muted)">Load attendance to see the list</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedList.map((item) => (
                    <tr
                      key={item.uid}
                      className="group transition-colors hover:bg-(--bg-soft)/30"
                    >
                      <td className="px-5 py-3">
                        {mode === "student" ? (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-(--primary-soft) text-(--primary) font-bold text-sm border border-(--primary-soft)">
                            {item.rollNo}
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-(--primary-soft) text-(--primary) border border-(--primary-soft)">
                            <User size={16} />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div>
                          <p className="font-semibold text-sm text-(--text) capitalize">{item.name}</p>
                          <div className="flex items-center gap-1 font-semibold text-[10px] text-(--text-muted)">
                            <BadgeCheck size={12} className="text-(--primary)" />
                            App ID: {mode === "student" ? item.appId : item.employeeId}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {Object.entries(STATUS).map(([code, cls]) => (
                            <button
                              key={code}
                              onMouseDown={() => editable && setDragStatus(code)}
                              onMouseEnter={() => editable && dragStatus && setStatus(item.uid, dragStatus)}
                              onMouseUp={() => setDragStatus(null)}
                              onClick={() => editable && setStatus(item.uid, code)}
                              disabled={!editable}
                              className={`px-5 py-2 rounded-md text-xs font-bold border transition-all duration-200
                              ${attendance[item.uid] === code
                                  ? cls
                                  : `border-(--border) text-(--text-muted) bg-(--bg-card) ${editable ? 'hover:text-(--primary) hover:bg-(--primary-soft)/30' : 'cursor-default'}`
                                }`}
                            >
                              {code}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <ReasonModal
          open={showReason}
          onClose={() => setShowReason(false)}
          onSubmit={savePending}
        />
      </div>
    </RequirePermission >
  );
}
