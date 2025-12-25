"use client";

import { useState } from "react";
import { Eye, Users, Filter } from "lucide-react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import Link from "next/link";

export default function StudentsListPage() {
  const { classData, schoolUser } = useSchool();
  const { branchInfo } = useBranch();
  const { theme } = useTheme();
  const router = useRouter();
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const selectedClass = classData?.find(
    c => c.name === className
  );
  async function fetchStudents() {
    if (!className) {
      toast.error("Please select a class");
      return;
    }
    setLoading(true);
    try {
      const ref = collection(
        db,
        "schools",
        branchInfo.schoolId,
        "branches",
        branchInfo.id,
        "students"
      );
      let q = query(
        ref,
        where("className", "==", className)
      );
      if (section) {
        q = query(
          ref,
          where("className", "==", className),
          where("section", "==", section)
        );
      }
      const snap = await getDocs(q);
      setStudents(snap.docs.map(d => d.data()));
    } catch (err) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="text-(--primary) mt-1" />
        <div>
          <h1 className="text-xl font-semibold text-(--text)">
            Students
          </h1>
          <p className="text-sm text-(--text-muted)">
            View and manage students by class and section
          </p>
        </div>
      </div>
      <div className="border border-(--border) rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-(--text)">
          <Filter size={16} />
          Student Filter
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm text-(--text-muted)">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              value={className}
              onChange={e => {
                setClassName(e.target.value);
                setSection("");
              }}
            >
              <option value="">Select class</option>
              {classData?.map(c => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Section (optional)
            </label>
            <select
              className="input"
              value={section}
              disabled={!className}
              onChange={e => setSection(e.target.value)}
            >
              <option value="">All sections</option>
              {selectedClass?.sections.map(sec => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchStudents}
              disabled={loading}
              className="btn-primary px-10"
            >
              {loading ? "Loading..." : "Load Students"}
            </button>
          </div>
        </div>
      </div>
      <div className="border border-(--border) rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[750px] w-full text-sm">
            <thead className="bg-(--bg-soft)">
              <tr className="text-left">
                <th className="px-4 py-3 font-medium">
                  Admission ID
                </th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Class</th>
                <th className="px-4 py-3 font-medium">Section</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {!loading && students.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="text-center py-10 text-(--text-muted)"
                  >
                    No students found
                  </td>
                </tr>
              )}

              {students.map(s => (
                <tr
                  key={s.uid}
                  className="border-t border-(--border) hover:bg-(--bg-soft)"
                >
                  <td className="px-4 py-3 font-semibold">
                    {s.admissionId}
                  </td>
                  <td className="px-4 py-3 font-semibold">{s.name}</td>
                  <td className="px-4 py-3">{s.className}</td>
                  <td className="px-4 py-3">
                  {(() => {
                    const matchingClass = classData.find(c => c.name === s.className);
                    return matchingClass?.sections.find(sec => sec.id === s.section)?.name || 'N/A';
                  })()}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-1 rounded-md uppercase font-medium 
                        ${s.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}
                      `}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/school/${schoolUser.schoolId}/students/${s.uid}`}>
                    <button
                      className="action-btn"
                      title="View Profile"
                    >
                      <Eye size={16} />
                    </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
