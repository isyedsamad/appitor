"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Bell,
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import Link from "next/link";
import secureAxios from "@/lib/secureAxios";

export default function FeeDuesPage() {
  const { schoolUser, setLoading, classData, currentSession, sessionList } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [dues, setDues] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  const [filters, setFilters] = useState({
    session: currentSession || "",
    class: "",
    section: "",
    period: "",
  });

  useEffect(() => {
    if (currentSession && !filters.session) {
      setFilters(prev => ({ ...prev, session: currentSession }));
    }
  }, [currentSession]);

  const fetchDues = async () => {
    if (!schoolUser || !branch) return;
    if (filters.session === '' || filters.class === '' || filters.section === '' || filters.period === '') {
      toast.error('Please select Session, Class, Section, and Period!');
      return;
    }
    setLoading(true);
    try {
      setDues([]);
      setSelectedStudents([]);
      const metaPath = ["schools", schoolUser.schoolId, "branches", branch, "meta"];
      const rosterRef = doc(db, ...metaPath, `${filters.class}_${filters.section}_${filters.session}`);
      const snap = await getDoc(rosterRef);

      if (!snap.exists()) {
        toast.info("No students found in this section for the selected session.");
        setLoading(false);
        return;
      }

      const students = snap.data().students || [];
      if (students.length === 0) {
        toast.info("Section is empty.");
        setLoading(false);
        return;
      }

      const predictedDueIds = students.map(s => `${s.uid}_${filters.session}_${filters.period}`);
      const chunks = [];
      for (let i = 0; i < predictedDueIds.length; i += 10) {
        chunks.push(predictedDueIds.slice(i, i + 10));
      }

      const baseRef = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "dues", "items");
      const duesMap = {};
      const promises = chunks.map(async chunk => {
        const q = query(baseRef, where("__name__", "in", chunk));
        const docsSnap = await getDocs(q);
        docsSnap.forEach(d => {
          duesMap[d.id] = { id: d.id, ...d.data() };
        });
      });

      await Promise.all(promises);
      const finalizedDues = students.map(student => {
        const targetId = `${student.uid}_${filters.session}_${filters.period}`;
        const foundDue = duesMap[targetId];

        return {
          studentId: student.uid,
          appId: student.appId,
          studentName: student.name,
          rollNo: student.rollNo,
          period: filters.period,
          total: foundDue ? (foundDue.total || 0) : 0,
          paid: foundDue ? (foundDue.paid || 0) : 0,
          due: foundDue ? (foundDue.due || 0) : 0,
          status: foundDue ? foundDue.status : "unassigned",
        };
      });

      const validDues = finalizedDues.sort((a, b) => {
        const ra = parseInt(a.rollNo) || 999;
        const rb = parseInt(b.rollNo) || 999;
        return ra - rb;
      });

      setDues(validDues);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load dues from database');
    } finally {
      setLoading(false);
    }
  };

  const summary = useMemo(() => {
    return dues.reduce(
      (acc, d) => {
        acc.dueAmount += (d.due || 0);
        if (d.due > 0) acc.dueCount++;
        acc.paid += (d.paid || 0);
        if (d.status === "unassigned") acc.count++;
        return acc;
      },
      { dueAmount: 0, dueCount: 0, paid: 0, count: 0 }
    );
  }, [dues]);

  const notifyStudents = async (studentUids) => {
    if (!studentUids?.length) return;
    const toastId = toast.loading(`Sending ${studentUids.length} notification${studentUids.length > 1 ? 's' : ''}...`);
    try {
      await secureAxios.post("/api/school/fees/dues/notify", {
        studentUids,
        period: filters.period,
        schoolName: schoolUser.schoolName || schoolUser.schoolId,
        branch,
      });
      toast.update(toastId, { render: `Successfully notified ${studentUids.length} student${studentUids.length > 1 ? 's' : ''}!`, type: "success", isLoading: false, autoClose: 3000 });
      setSelectedStudents([]);
    } catch (err) {
      toast.update(toastId, { render: err?.response?.data?.message || "Failed to notify", type: "error", isLoading: false, autoClose: 3000 });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const selectable = dues.filter(d => d.status !== "paid").map(d => d.studentId);
      setSelectedStudents(selectable);
    } else {
      setSelectedStudents([]);
    }
  };

  const handleSelect = (studentId) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const statusBadge = status => {
    if (status === "paid")
      return (
        <span className="text-xs font-medium px-2 py-1 rounded-md bg-(--status-p-bg) border border-(--status-p-border) text-(--status-p-text) flex items-center gap-1 w-fit">
          <CheckCircle2 size={12} /> Paid
        </span>
      );
    if (status === "overdue" || status === "due" || status === "partial")
      return (
        <span className="text-xs font-medium px-2 py-1 rounded-md bg-(--status-a-bg) border border-(--status-a-border) text-(--status-a-text) flex items-center gap-1 w-fit">
          <AlertTriangle size={12} /> Due
        </span>
      );
    if (status === "unassigned")
      return (
        <span className="text-xs font-medium px-2 py-1 rounded-md bg-(--status-l-bg) border border-(--status-l-border) text-(--status-l-text) flex items-center gap-1 w-fit">
          <Clock size={12} /> Pending
        </span>
      );

    return null;
  };

  return (
    <RequirePermission permission="fee.operations.view">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <Wallet size={20} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Fee Dues</h1>
            <p className="text-sm text-(--text-muted)">
              Pending & paid dues · {branchInfo?.name}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Paid Amount" value={summary.paid} color="accent" />
          <SummaryCard label="Pending Dues" value={summary.dueAmount} color="danger" />
          <SummaryCard label="Dues Counter" value={summary.dueCount} color="warning" isCount />
          <SummaryCard label="Pending Students" value={summary.count} color="primary" isCount />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Session</label>
            <select
              className="input w-full"
              value={filters.session}
              onChange={e =>
                setFilters({ ...filters, session: e.target.value })
              }
            >
              <option value="">Select Session</option>
              {sessionList && sessionList.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Class</label>
            <select
              className="input w-full"
              value={filters.class}
              onChange={e => {
                const classObj = classData.find(c => c.id === e.target.value || c.name === e.target.value);
                setFilters({ ...filters, class: classObj ? classObj.id : "", section: "" });
              }}
            >
              <option value="">Select Class</option>
              {classData && classData.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Section</label>
            <select
              className="input w-full"
              value={filters.section}
              disabled={!filters.class}
              onChange={e =>
                setFilters({ ...filters, section: e.target.value })
              }
            >
              <option value="">Select Section</option>
              {classData && classData
                .find(c => c.id === filters.class)
                ?.sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-(--text-muted) uppercase tracking-wider">Due Month</label>
            <input
              type="month"
              className="input w-full"
              value={filters.period}
              onChange={e =>
                setFilters({ ...filters, period: e.target.value })
              }
            />
          </div>
          <div>
            <button
              onClick={fetchDues}
              className="btn-primary flex items-center justify-center gap-2 w-full md:w-auto"
            >
              <Filter size={16} />
              Load Dues
            </button>
          </div>
        </div>

        {selectedStudents.length > 0 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl px-2 py-2 sm:px-4 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs animate-in fade-in slide-in-from-top-2 text-white">
            <div className="flex items-center gap-3 font-semibold text-md text-(--text-muted)">
              <span className="flex items-center justify-center p-1 px-3 rounded-full bg-(--status-o-bg) text-(--status-o-text) shadow-sm ring-1 ring-(--status-o-border) backdrop-blur-sm">
                {selectedStudents.length}
              </span>
              <span>Students Selected for Notification</span>
            </div>
            <button
              onClick={() => notifyStudents(selectedStudents)}
              className="btn-outline text-sm flex items-center gap-2 bg-(--status-o-bg) text-(--status-o-text) border-(--status-o-border) w-full sm:w-auto font-semibold transition-all hover:scale-105 active:scale-95"
            >
              <Bell size={15} className="fill-current opacity-80" /> Send Bulk Notification
            </button>
          </div>
        )}

        {dues.length > 0 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead>
                  <tr className="bg-(--bg-soft) border-b border-(--border)">
                    <th className="px-5 py-4 w-12">
                      <input
                        type="checkbox"
                        className="rounded border-(--border) text-(--primary) focus:ring-(--primary) bg-(--bg) w-4 h-4 cursor-pointer"
                        checked={selectedStudents.length > 0 && selectedStudents.length === dues.filter(d => d.status !== "paid").length}
                        onChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-5 py-4 font-semibold text-(--text-muted)">App ID</th>
                    <th className="px-5 py-4 font-semibold text-(--text-muted)">Student</th>
                    <th className="px-5 py-4 font-semibold text-(--text-muted)">Paid Amount</th>
                    <th className="px-5 py-4 font-semibold text-(--text-muted)">Due Balance</th>
                    <th className="px-5 py-4 font-semibold text-(--text-muted)">Status</th>
                    <th className="text-right px-5 py-4 font-semibold text-(--text-muted)">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {dues.map(d => (
                    <tr
                      key={d.studentId}
                      className="hover:bg-(--bg)/50 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <input
                          type="checkbox"
                          className="rounded border-(--border) text-(--primary) focus:ring-(--primary) bg-(--bg) w-4 h-4 cursor-pointer disabled:opacity-50"
                          checked={selectedStudents.includes(d.studentId)}
                          disabled={d.status === "paid"}
                          onChange={() => handleSelect(d.studentId)}
                        />
                      </td>
                      <td className="px-5 py-3 uppercase font-medium">{d.appId}</td>
                      <td className="px-5 py-3">
                        <div className="font-semibold">{d.studentName}</div>
                        <div className="text-xs font-semibold text-(--text-muted)">Roll No: {d.rollNo || 'N/A'}</div>
                      </td>
                      <td className="px-5 py-3 text-(--text-muted)">
                        <span className={d.paid > 0 ? "font-medium text-(--text)" : ""}>₹ {d.paid}</span>
                      </td>
                      <td className="px-5 py-3 font-semibold">
                        <span className={d.due > 0 ? "text-red-500" : ""}>₹ {d.due}</span>
                      </td>
                      <td className="px-5 py-3">{statusBadge(d.status)}</td>
                      <td className="text-right px-5 py-3">
                        {d.status !== "paid" && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => notifyStudents([d.studentId])}
                              className="btn-outline p-2.5 bg-(--status-m-bg) text-(--status-m-text) border-(--status-m-border) transition-colors tooltip flex items-center gap-1"
                              data-tip="Send Notification"
                            >
                              <Bell size={16} />
                            </button>
                            <Link href={`/school/${schoolUser.schoolId}/fees/collect?studentId=${d.studentId}`} className="btn-outline p-2 bg-(--status-p-bg) text-(--status-p-text) border-(--status-p-border) transition-colors tooltip flex items-center gap-1">
                              Collect <ArrowRight size={14} />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function SummaryCard({ label, value, color, isCount }) {
  const getThemeVars = () => {
    switch (color) {
      case "danger":
        return {
          bg: "bg-(--status-o-bg)",
          text: "text-(--status-o-text)",
          border: "border-(--status-o-border)",
          gradient: "from-(--status-o-bg)/50 to-transparent",
          icon: <AlertTriangle size={20} />
        };
      case "accent":
        return {
          bg: "bg-(--status-p-bg)",
          text: "text-(--status-p-text)",
          border: "border-(--status-p-border)",
          gradient: "from-(--status-p-bg)/50 to-transparent",
          icon: <CheckCircle2 size={20} />
        };
      case "warning":
        return {
          bg: "bg-(--status-a-bg)",
          text: "text-(--status-a-text)",
          border: "border-(--status-a-border)",
          gradient: "from-(--status-a-bg)/50 to-transparent",
          icon: <Filter size={20} />
        };
      default:
        return {
          bg: "bg-(--status-l-bg)",
          text: "text-(--status-l-text)",
          border: "border-(--status-l-border)",
          gradient: "from-(--status-l-bg)/50 to-transparent",
          icon: <Wallet size={20} />
        };
    }
  };

  const theme = getThemeVars();

  return (
    <div className={`relative overflow-hidden rounded-lg border ${theme.border} bg-gradient-to-br ${theme.gradient} bg-(--bg-card) px-5 py-4 shadow-sm transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-(--text-muted)">{label}</p>
          <div>
            <h3 className={`text-2xl font-bold tracking-tight ${theme.text}`}>
              {!isCount && "₹"} {value == 0 ? 0 : value.toString().padStart(2, "0")}
            </h3>
          </div>
        </div>
        <div className={`p-2 rounded-xl ${theme.bg} ${theme.text} ${theme.border} border`}>
          {theme.icon}
        </div>
      </div>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${theme.gradient} opacity-20 blur-3xl rounded-full -mr-16 -mt-16 pointer-events-none`} />
    </div>
  );
}
