"use client";

import { useEffect, useState } from "react";
import { Search, Check, X, Filter, ClipboardList } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { hasPermission } from "@/lib/school/permissionUtils";
import secureAxios from "@/lib/secureAxios";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { toast } from "react-toastify";

const PAGE_SIZE = 10;

export default function SchoolLeavePage() {
  const { schoolUser, sessionList, currentSession, setLoading } = useSchool();
  const { branch } = useBranch();
  const canManage = hasPermission(schoolUser, "leavecomplaint.manage", false);
  const [filters, setFilters] = useState({
    session: currentSession,
    type: "all",
    status: "all",
  });
  const [leaves, setLeaves] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadedLeave, setIsLoadedLeave] = useState(false);
  async function fetchLeaves(reset = true) {
    if (!filters.session) return;
    setLoading(true);
    try {
      const baseRef = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "leave",
        "items",
        filters.session
      );
      const constraints = [
        orderBy("requestedAt", "desc"),
        limit(PAGE_SIZE),
      ];
      if (filters.type !== "all") {
        constraints.unshift(where("type", "==", filters.type));
      }
      if (filters.status !== "all") {
        constraints.unshift(where("status", "==", filters.status));
      }
      if (!reset && lastDoc) {
        constraints.push(startAfter(lastDoc));
      }
      const q = query(baseRef, ...constraints);
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
      }));
      if (reset) {
        setLeaves(rows);
      } else {
        setLeaves(prev => [...prev, ...rows]);
      }
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
      setIsLoadedLeave(true);
    }
  }

  async function updateStatus(leaveId, status) {
    const isReady = confirm('Do you really want to ' + (status != 'rejected' ? 'approve' : 'reject') + ' this leave request?');
    if(!isReady) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/leave/update-status", {
        branch,
        session: filters.session,
        leaveId,
        status,
      });
      setLeaves(prev =>
        prev.map(l =>
          l.id === leaveId ? { ...l, status } : l
        )
      );
      toast.success(`Leave ${status}`);
    } catch (err) {
      toast.error("Failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="leavecomplaint.manage">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <ClipboardList size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              Leave Portal
            </h1>
            <p className="text-sm text-(--text-muted)">
              Manage student and employee leave requests
            </p>
          </div>
        </div>
        <div>
          <div className="grid lg:grid-cols-6 max-w-5xl gap-4 lg:items-end">
            <div className="flex flex-col">
              <p className="text-sm font-medium text-(--text-muted)">
                Session
              </p>
              <select
                className="input"
                value={filters.session}
                onChange={e =>
                  setFilters({ ...filters, session: e.target.value })
                }
              >
                {sessionList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-(--text-muted)">
                Type
              </p>
              <select
                className="input"
                value={filters.type}
                onChange={e =>
                  setFilters({ ...filters, type: e.target.value })
                }
              >
                <option value="all">All</option>
                <option value="employee">Employee</option>
                <option value="student">Student</option>
              </select>
            </div>
            <div className="flex flex-col">
              <p className="text-sm font-medium text-(--text-muted)">
                Status
              </p>
              <select
                className="input"
                value={filters.status}
                onChange={e =>
                  setFilters({ ...filters, status: e.target.value })
                }
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <button
              onClick={() => fetchLeaves(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Search size={16} /> Search
            </button>
          </div>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-(--bg)">
                <tr className="text-left text-(--text-muted)">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Leave Details</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {(isLoadedLeave && leaves.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-(--text-muted)"
                    >
                      No Leave requests found...
                    </td>
                  </tr>
                )}
                {(!isLoadedLeave && leaves.length === 0) && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-14 text-center text-(--text-muted)"
                    >
                      Filter and search for leave records.
                    </td>
                  </tr>
                )}
                {leaves.map(l => (
                  <tr
                    key={l.id}
                    className="border-t border-(--border) hover:bg-(--bg)"
                  >
                    <td className="px-5 py-4">
                      <div className="flex flex-col justify-start items-start">
                        <TypeBadge type={l.type} />
                        <p className="font-semibold text-(--text) mt-2 capitalize">
                          {l.name}
                        </p>
                        <p className="text-xs text-(--text-muted) font-medium">
                          {l.appId}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 max-w-md">
                      <p className="font-normal text-(--text)">
                        {l.reason}
                      </p>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                        <p>{l.from}</p>
                        <p>{l.to && ` → ${l.to}`}</p>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={l.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {l.status === "pending" && canManage ? (
                        <div className="flex flex-col justify-end items-end gap-2">
                          <button
                            onClick={() => updateStatus(l.id, "approved")}
                            className="max-w-30 px-3 py-1.5 font-semibold  text-xs text-(--status-p-text) border border-(--status-p-border) bg-(--status-p-bg)"
                          >
                            <Check size={13} /> Approve
                          </button>
                          <button
                            onClick={() => updateStatus(l.id, "rejected")}
                            className="max-w-30 px-3 py-1.5 font-semibold text-xs text-(--status-a-text) border border-(--status-a-border) bg-(--status-a-bg)"
                          >
                            <X size={13} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-(--text-muted)">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {hasMore && (
          <div className="flex justify-end">
            <button
              onClick={() => fetchLeaves(false)}
              className="btn-primary"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function DaysChips({ days = [] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {days.map((d, i) => (
        <span
          key={i}
          className="px-2 py-0.5 rounded-md text-[11px] font-medium
            bg-(--bg) border border-(--border)
            text-(--text-muted)"
        >
          {d.slice(0, 3)}
        </span>
      ))}
    </div>
  );
}

function TypeBadge({ type }) {
  const ui =
    type === "employee"
      ? {
          bg: "bg-(--primary-soft)",
          text: "text-(--primary)",
          label: "EMPLOYEE",
        }
      : {
          bg: "bg-(--status-l-bg)",
          text: "text-(--status-l-text)",
          label: "STUDENT",
        };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${ui.bg} ${ui.text}`}
    >
      {ui.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: "bg-(--status-l-bg) text-(--status-l-text)",
    approved: "bg-(--status-p-bg) text-(--status-p-text)",
    rejected: "bg-(--status-a-bg) text-(--status-a-text)",
  };
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-xs font-medium ${map[status]}`}
    >
      {status.toUpperCase()}
    </span>
  );
}
