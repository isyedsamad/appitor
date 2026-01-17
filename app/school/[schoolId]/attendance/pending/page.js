"use client";

import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Calendar,
  Check,
  X,
  Clock,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
} from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
const STATUS = {
  P: "bg-[var(--status-p-bg)] text-[var(--status-p-text)] border-[var(--status-p-border)]",
  A: "bg-[var(--status-a-bg)] text-[var(--status-a-text)] border-[var(--status-a-border)]",
  L: "bg-[var(--status-l-bg)] text-[var(--status-l-text)] border-[var(--status-l-border)]",
  H: "bg-[var(--status-h-bg)] text-[var(--status-h-text)] border-[var(--status-h-border)]",
  O: "bg-[var(--status-o-bg)] text-[var(--status-o-text)] border-[var(--status-o-border)]",
};
const TABS = [
  { key: "pending", label: "Pending", icon: Clock },
  { key: "approved", label: "Approved", icon: ShieldCheck },
  { key: "rejected", label: "Rejected", icon: ShieldX },
];

export default function PendingAttendancePage() {
  const { schoolUser, loading, setLoading, classData } = useSchool();
  const { branchInfo, branch } = useBranch();
  const [session, setSession] = useState("");
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [data, setData] = useState([]);
  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  async function loadData(tab = activeTab) {
    if (!session) {
      toast.error("Select session first");
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
        "attendance_pending"
      );
      const q = query(
        ref,
        where("session", "==", session),
        where("status", "==", tab),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setData(
        snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch(err) {
      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
    }
  }
  function changeTab(tab) {
    setActiveTab(tab);
    loadData(tab);
  }
  async function approve(id) {
    setLoading(true);
    try {
      await secureAxios.post("/api/school/attendance/approve", { requestId: id, branch });
      toast.success("Approved");
      loadData("pending");
    } catch(err) {
      toast.error("Approval failed: " + err);
    } finally {
      setLoading(false);
    }
  }
  async function reject(id) {
    setLoading(true);
    try {
      await secureAxios.post("/api/school/attendance/reject", { requestId: id, branch });
      toast.success("Rejected");
      loadData("pending");
    } catch(err) {
      toast.error("Rejection failed: " + err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if(session != '') changeTab('pending');
  }, [session])
  useEffect(() => {
    async function load() {
      try {
        const res = await secureAxios.get(
          "/api/school/settings/academic"
        );
        setSessions(res.data.sessions || []);
      } catch(err) {
        toast.error("Failed to load academic settings: " + err);
      }
    }
    load();
  }, []);
  return (
    <RequirePermission permission={'attendance.modify'}>
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded bg-(--primary-soft) text-(--primary)">
          <ClipboardCheck size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Attendance Approval</h1>
          <p className="text-sm text-(--text-muted)">
            Review & manage attendance changes
          </p>
        </div>
      </div>
      <div className="max-w-sm rounded-lg bg-(--bg-soft)">
        <label className="text-sm text-(--text-muted)">
          Academic Session
        </label>
        <select
          className="input mt-1"
          value={session}
          onChange={e => {
            setSession(e.target.value);
            setActiveTab("pending");
            setData([]);
          }}
        >
          <option value="">Select session</option>
          {sessions?.map(s => (
            <option key={s.id}>{s.id}</option>
          ))}
        </select>
      </div>
      {session && (
        <div className="flex border border-(--border) rounded-lg overflow-hidden">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => changeTab(t.key)}
              className={`flex-1 px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium
                ${
                  activeTab === t.key
                    ? "bg-(--primary) text-white"
                    : "text-(--text-muted)"
                }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="rounded-xl divide-y space-y-2">
        {loading && (
          <p className="p-4 text-sm text-(--text-muted)">Loading…</p>
        )}

        {!loading && data.length === 0 && (
          <p className="p-6 text-center text-(--text-muted)">
            No records found
          </p>
        )}
        {data.map(r => (
          <div
            key={r.id}
            className="border border-(--border) rounded-xl p-4 space-y-4
                      hover:bg-(--bg-soft) transition"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="font-semibold text-md text-(--text)">
                  {r.type === "student"
                    ? `${getClassName(r.className)} - ${getSectionName(r.className, r.section)}`
                    : "Employee Attendance"}
                </p>
                <p className="text-sm text-(--text-muted)">
                  Date: {r.date}
                </p>
              </div>
              {activeTab === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => reject(r.id)}
                    className="px-3 py-1.5 rounded-md border border-red-500
                              text-red-500 hover:bg-red-500/10 text-sm flex items-center gap-1"
                  >
                    <X size={14} />
                    Reject
                  </button>
                  <button
                    onClick={() => approve(r.id)}
                    className="px-3 py-1.5 rounded-md bg-(--primary)
                              text-white text-sm flex items-center gap-1"
                  >
                    <Check size={14} />
                    Approve
                  </button>
                </div>
              )}
            </div>
            <div className="text-sm text-(--text-muted) flex flex-col">
              <p>Reason: <span className="font-medium text-(--text)">{r.reason}</span></p>
              <p>Requested by: <span className="font-medium text-(--text)">{r.requestedBy.name} ({r.requestedBy.role})</span></p>
            </div>
            {r.mode === "full" && (
              <div className="flex items-start gap-2 text-(--status-a-text) text-sm
                              bg-(--status-a-bg)/50 border border-(--status-a-border) rounded-md p-3">
                <AlertTriangle size={14} className="mt-0.5" />
                <span>
                  This attendance was not marked earlier.
                  Approving will <b>create a new attendance record</b> for a past date.
                </span>
              </div>
            )}
            {r.mode === "diff" && (
              <div className="border border-(--border) rounded-lg divide-y">
                {Object.entries(r.changes).map(([uid, c]) => (
                  <div
                    key={uid}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <span className="text-(--text-muted)">
                      {c.name} ({c.appId ? c.appId : c.employeeId})
                    </span>

                    <div className="flex items-center gap-2 font-semibold">
                      <span className={`px-2 py-0.5 rounded
                        ${STATUS[c.from]}  
                      `}>
                        {c.from}
                      </span>
                      <span className="text-(--text-muted)">→</span>
                      <span className={`px-2 py-0.5 rounded
                        ${STATUS[c.to]}  
                      `}>
                        {c.to}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab !== "pending" && (
              <p className="text-xs text-(--text-muted)">
                Reviewed on{" "}
                {r.reviewedAt?.toDate?.().toLocaleDateString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
    </RequirePermission>
  );
}