"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  startAfter,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { Eye, Search, Users } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useTheme } from "next-themes";
import Link from "next/link";

const PAGE_SIZE = 10;

export default function EmployeeListPage() {
  const { schoolUser } = useSchool();
  const { branchInfo } = useBranch();
  const { theme } = useTheme();
  const [employees, setEmployees] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (schoolUser && branchInfo) fetchEmployees();
  }, [schoolUser, branchInfo]);
  async function fetchEmployees(next = false) {
    setLoading(true);
    const ref = collection(
      db,
      "schools",
      schoolUser.schoolId,
      "branches",
      branchInfo.id,
      "employees"
    );

    let q = query(
      ref,
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    );

    if (next && lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snap = await getDocs(q);

    const data = snap.docs.map(d => d.data());

    setEmployees(prev =>
      next ? [...prev, ...data] : data
    );

    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setLoading(false);
  }

  const filtered = employees.filter(emp =>
    [emp.name, emp.employeeId, emp.mobile]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <RequirePermission permission="employee.manage">
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Users className="text-(--primary)" />
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              Employees
            </h1>
            <p className="text-sm text-(--text-muted)">
              Manage employees of this branch
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 w-full">
          <Search size={16} className="text-(--text-muted)" />
          <input
            className="bg-transparent outline-none text-sm w-full"
            placeholder="Search by name, ID or mobile"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="card p-0 border border-(--border) rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg) text-(--text-muted) border-b border-(--border)">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">
                  Employee ID
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Mobile</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-8 text-(--text-muted)"
                  >
                    No employees found
                  </td>
                </tr>
              )}
              {filtered.map(emp => (
                <tr
                  key={emp.employeeId}
                  className="border-b border-(--border) last:border-0 hover:bg-(--bg)"
                >
                  <td className="px-4 py-3 font-medium">
                    {emp.employeeId}
                  </td>
                  <td className="px-4 py-3">{emp.name}</td>
                  <td className="px-4 py-3">{emp.role}</td>
                  <td className="px-4 py-3">{emp.mobile}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-md uppercase font-medium
                        ${emp.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}
                      `}
                    >
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/school/${schoolUser.schoolId}/employees/${emp.uid}`}><button
                      className="action-btn"
                      title="View Profile"
                    >
                      <Eye size={16} />
                    </button></Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {lastDoc && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => fetchEmployees(true)}
            disabled={loading}
            className="text-sm text-(--primary) hover:underline disabled:opacity-50"
          >
            {loading ? "Loading..." : "Load more.."}
          </button>
        </div>
      )}
    </div>
    </RequirePermission>
  );
}
