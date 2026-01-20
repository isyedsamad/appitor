"use client";

import { useState } from "react";
import { Search, CheckCircle, ClipboardList, MessageSquare } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { hasPermission } from "@/lib/school/permissionUtils";
import secureAxios from "@/lib/secureAxios";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { toast } from "react-toastify";

const PAGE_SIZE = 10;

export default function SchoolComplaintPage() {
  const { schoolUser, sessionList, currentSession, setLoading } = useSchool();
  const { branch } = useBranch();
  const canManage = hasPermission(
    schoolUser,
    "leavecomplaint.manage",
    false
  );
  const [filters, setFilters] = useState({
    session: currentSession,
    type: "all",
    status: "all",
  });
  const [complaints, setComplaints] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadedComplaint, setIsLoadedComplaint] = useState(false);
  async function fetchComplaints(reset = true) {
    if (!filters.session) return;
    setLoading(true);
    try {
      const baseRef = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "complaint",
        "items",
        filters.session
      );
      const constraints = [
        orderBy("createdAt", "desc"),
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
      setComplaints(reset ? rows : prev => [...prev, ...rows]);
      setLastDoc(snap.docs.at(-1) || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
      setIsLoadedComplaint(true);
    }
  }

  async function markSolved(id) {
    const ok = confirm("Mark this complaint as solved?");
    if (!ok) return;
    setLoading(true);
    try {
      await secureAxios.post(
        "/api/school/complaint/solve",
        {
          branch,
          session: filters.session,
          complaintId: id,
        }
      );
      setComplaints(prev =>
        prev.map(c =>
          c.id === id ? { ...c, status: "solved" } : c
        )
      );
      toast.success("Complaint marked as solved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="leavecomplaint.manage">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Complaint Portal</h1>
            <p className="text-sm text-(--text-muted)">
              Review and resolve student & employee complaints
            </p>
          </div>
        </div>
        <div>
          <div className="grid lg:grid-cols-6 gap-4 items-end">
            <FilterSelect
              label="Session"
              value={filters.session}
              onChange={v => setFilters({ ...filters, session: v })}
              options={sessionList.map(s => ({ label: s.id, value: s.id }))}
            />
            <FilterSelect
              label="Type"
              value={filters.type}
              onChange={v => setFilters({ ...filters, type: v })}
              options={[
                { label: "All", value: "all" },
                { label: "Employee", value: "employee" },
                { label: "Student", value: "student" },
              ]}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={v => setFilters({ ...filters, status: v })}
              options={[
                { label: "All", value: "all" },
                { label: "Pending", value: "pending" },
                { label: "Solved", value: "solved" },
              ]}
            />
            <button
              onClick={() => fetchComplaints(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Search size={16} /> Search
            </button>
          </div>
        </div>

        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-(--bg)">
              <tr className="text-(--text-muted)">
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Complaint</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(isLoadedComplaint && complaints.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-(--text-muted)">
                    No complaints found...
                  </td>
                </tr>
              )}
              {(!isLoadedComplaint && complaints.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-(--text-muted)">
                    Filter and search for complaint records.
                  </td>
                </tr>
              )}
              {complaints.map(c => (
                <tr key={c.id} className="border-t border-(--border) hover:bg-(--bg)">
                  <td className="px-5 py-4">
                    <TypeBadge type={c.type} />
                    <p className="font-semibold mt-2 capitalize">{c.name}</p>
                    <p className="text-xs text-(--text-muted)">
                      {c.appId}
                    </p>
                  </td>
                  <td className="px-5 py-4 max-w-lg">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-(--text-muted) mt-1">
                      {c.description}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm">
                    {c.createdAt?.toDate
                      ? c.createdAt.toDate().toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    {c.status === "pending" && canManage ? (
                      <button
                        onClick={() => markSolved(c.id)}
                        className="px-3 py-1.5 text-xs font-semibold
                        text-(--status-p-text)
                        bg-(--status-p-bg)
                        border border-(--status-p-border) whitespace-nowrap"
                      >
                        <CheckCircle size={14} /> Mark Solved
                      </button>
                    ) : (
                      <span className="text-xs text-(--text-muted)">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="flex justify-end">
            <button
              onClick={() => fetchComplaints(false)}
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

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-(--text-muted)">{label}</p>
      <select
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
    solved: "bg-(--status-p-bg) text-(--status-p-text)",
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

