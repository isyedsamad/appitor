"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  IndianRupee,
  ArrowRight,
  RefreshCcw
} from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";

export default function FeeDuesPage() {
  const { schoolUser, setLoading, classData } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [dues, setDues] = useState([]);
  const [filters, setFilters] = useState({
    class: "",
    section: "",
    period: "",
    status: "",
  });
  const fetchDues = async () => {
    if (!schoolUser || !branch) return;
    if(filters.class == '' || filters.section == '' || filters.period == '') {
      toast.error('Please select all fields!')
      return;
    }
    setLoading(true);
    try {
      const baseRef = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "fees",
        "dues",
        "items"
      );
      let constraints = [];
      if (filters.class) {
        constraints.push(where("class", "==", filters.class));
      }
      if (filters.section) {
        constraints.push(where("section", "==", filters.section));
      }
      if (filters.period) {
        constraints.push(where("period", "==", filters.period));
      }
      if (filters.status) {
        constraints.push(where("status", "==", filters.status));
      }
      const q =
        constraints.length > 0
          ? query(baseRef, ...constraints)
          : query(baseRef);
      const snap = await getDocs(q);
      setDues(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch(err) {
      toast.error('Failed: ' + err);
    } finally {
      setLoading(false);
    }
  };
  const summary = useMemo(() => {
    return dues.reduce(
      (acc, d) => {
        acc.total += d.amount;
        if (d.status === "overdue") acc.overdue += d.amount;
        if (d.status === "paid") acc.paid += d.amount;
        acc.count++;
        return acc;
      },
      { total: 0, overdue: 0, paid: 0, count: 0 }
    );
  }, [dues]);
  const statusBadge = status => {
    if (status === "paid")
      return (
        <span className="text-xs px-2 py-1 rounded-md bg-(--accent-soft) text-(--accent) flex items-center gap-1">
          <CheckCircle2 size={12} /> Paid
        </span>
      );
    if (status === "overdue")
      return (
        <span className="text-xs px-2 py-1 rounded-md bg-(--danger-soft) text-(--danger) flex items-center gap-1">
          <AlertTriangle size={12} /> Overdue
        </span>
      );
    if (status === "partial")
      return (
        <span className="text-xs px-2 py-1 rounded-md bg-(--warning-soft) text-(--warning) flex items-center gap-1">
          <Clock size={12} /> Partial
        </span>
      );

    return (
      <span className="text-xs px-2 py-1 rounded-md bg-(--bg) text-(--text-muted)">
        Due
      </span>
    );
  };

  return (
    <RequirePermission permission="fee.view">
      <div className="space-y-5">
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
        <div className="grid md:grid-cols-4 gap-4">
          <SummaryCard label="Total Due" value={summary.total} />
          <SummaryCard label="Overdue" value={summary.overdue} danger />
          <SummaryCard label="Paid" value={summary.paid} success />
          <SummaryCard label="Entries" value={summary.count} />
        </div>
        <div
          className="bg-(--bg-card) border border-(--border) rounded-xl p-4 grid md:grid-cols-5 gap-4 items-end"
        >
          <select
            className="input"
            value={filters.class}
            onChange={e =>
              setFilters({ ...filters, class: e.target.value, section: "" })
            }
          >
            <option value="">Select Classes</option>
            {classData && classData.map(c => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={filters.section}
            disabled={!filters.class}
            onChange={e =>
              setFilters({ ...filters, section: e.target.value })
            }
          >
            <option value="">Select Sections</option>
            {classData && classData
              .find(c => c.name === filters.class)
              ?.sections.map(sec => (
                <option key={sec.id} value={sec.name}>
                  {sec.name}
                </option>
              ))}
          </select>
          <input
            type="month"
            className="input"
            value={filters.period}
            onChange={e =>
              setFilters({ ...filters, period: e.target.value })
            }
          />
          <select
            className="input"
            value={filters.status}
            onChange={e =>
              setFilters({ ...filters, status: e.target.value })
            }
          >
            <option value="">All Status</option>
            <option value="due">Due</option>
            <option value="overdue">Overdue</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
          <button
            onClick={fetchDues}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Filter size={16} />
            Load Dues
          </button>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg) text-(--text-muted)">
              <tr>
                <th className="px-4 py-3 text-left">Student</th>
                <th className="px-4 py-3 text-left">Fee Head</th>
                <th className="px-4 py-3 text-left">Period</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="text-right px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {dues.map(d => (
                <tr
                  key={d.id}
                  className="border-t border-(--border)"
                >
                  <td className="px-4 py-3 text-left">{d.studentName}</td>
                  <td className="px-4 py-3 text-left">{d.headName}</td>
                  <td className="px-4 py-3 text-left">{d.period}</td>
                  <td className="flex items-center gap-1 px-4 py-3 text-left">
                    <IndianRupee size={12} /> {d.amount}
                  </td>
                  <td className="px-4 py-3 text-left">{statusBadge(d.status)}</td>
                  <td className="text-right px-4 py-3">
                    {d.status !== "paid" && (
                      <button className="text-(--primary) flex items-center gap-1">
                        Collect <ArrowRight size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {dues.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-10 text-center text-muted">
                    No dues found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
function SummaryCard({ label, value, danger, success }) {
  return (
    <div className={`bg-(--bg-card) border border-(--border) rounded-xl p-4`}>
      <p className="text-sm text-(--text-muted)">{label}</p>
      <p className={`text-xl font-semibold
          ${danger && "text-(--danger)"}
          ${success && "text-(--accent)"}`}>
        ₹ {value}
      </p>
    </div>
  );
}
