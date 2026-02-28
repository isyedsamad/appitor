"use client";

import { useState, useMemo } from "react";
import {
  Eye,
  Users,
  Filter,
  Search,
  UserCheck,
  UserMinus,
  ChevronRight,
  MoreVertical,
  LayoutGrid,
  List as ListIcon,
  RefreshCw,
  SearchIcon
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import Link from "next/link";
import RequirePermission from "@/components/school/RequirePermission";

export default function StudentsListPage() {
  const { classData, schoolUser, sessionList, currentSession } = useSchool();
  const { branchInfo } = useBranch();
  const { theme } = useTheme();
  const router = useRouter();

  const [session, setSession] = useState(currentSession || "");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Sync session when currentSession is available
  useMemo(() => {
    if (currentSession && !session) {
      setSession(currentSession);
    }
  }, [currentSession]);

  const selectedClass = classData?.find(c => c.id === className);
  const metrics = useMemo(() => {
    return {
      total: students.length,
      active: students.filter(s => s.status === "active").length,
      inactive: students.filter(s => s.status !== "active").length
    };
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const lower = searchTerm.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.appId.toLowerCase().includes(lower)
    );
  }, [students, searchTerm]);

  async function fetchStudents() {
    if (!session || !className) {
      toast.error("Please select session and class");
      return;
    }
    setLoading(true);
    try {
      const basePath = [
        "schools",
        branchInfo.schoolId,
        "branches",
        branchInfo.id,
        "meta",
      ];
      let results = [];
      if (section) {
        const rosterRef = doc(db, ...basePath, `${className}_${section}_${session}`);
        const snap = await getDoc(rosterRef);
        if (snap.exists()) {
          const data = snap.data();
          const { classId, sectionId } = data;
          results = (data.students || []).map(s => ({
            ...s,
            classId,
            sectionId,
          }));
        }
      } else {
        const metaColRef = collection(db, ...basePath);
        const snaps = await getDocs(metaColRef);
        snaps.forEach(d => {
          const data = d.data();
          // Match class and session in ID: [class]_[section]_[session]
          const [idClass, idSection, idSession] = d.id.split("_");
          if (idClass === className && idSession === session && Array.isArray(data.students)) {
            const { classId, sectionId } = data;
            results.push(...data.students.map(s => ({
              ...s,
              classId,
              sectionId,
            })));
          }
        });
      }
      results.sort((a, b) => String(a.appId).localeCompare(String(b.appId)));
      setStudents(results);
    } catch (err) {
      console.error("FETCH STUDENTS ERROR:", err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="student.view">
      <div className="space-y-5 pb-20 text-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Student Profile
              </h1>
              <p className="text-sm text-(--text-muted)">
                Manage and monitor student records across classes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative group">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted) group-focus-within:text-(--primary) transition-colors" />
              <input
                type="text"
                placeholder="Search students..."
                className="input pl-10 w-full md:w-64 bg-(--bg-card) border-(--border) focus:ring-1 focus:ring-(--primary) transition-all"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={fetchStudents}
              disabled={loading || !className}
              className="p-2.5 rounded-xl border border-(--border) hover:bg-(--bg-soft) text-(--text-muted) hover:text-(--text) transition-all disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <div className="">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">Session</label>
              <select
                className="input w-full"
                value={session}
                onChange={e => setSession(e.target.value)}
              >
                <option value="">Select Session</option>
                {sessionList?.map(s => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">Class</label>
              <select
                className="input w-full"
                value={className}
                onChange={e => {
                  setClassName(e.target.value);
                  setSection("");
                }}
              >
                <option value="">Select Class</option>
                {classData?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">Section</label>
              <select
                className="input w-full"
                value={section}
                disabled={!className}
                onChange={e => setSection(e.target.value)}
              >
                <option value="">All Sections</option>
                {selectedClass?.sections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                onClick={fetchStudents}
                disabled={loading || !className || !session}
                className="btn-primary"
              >
                <SearchIcon size={16} className="group-hover:rotate-12 transition-transform" />
                Search
              </button>
            </div>
          </div>
        </div>
        {students.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <StatCard label="Total Students" value={metrics.total} icon={Users} color="blue" />
            <StatCard label="Active" value={metrics.active} icon={UserCheck} color="green" />
            <StatCard label="Inactive" value={metrics.inactive} icon={UserMinus} color="red" />
          </div>
        )}
        <div className="bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-(--bg-soft)/50 border-b border-(--border)">
                  <th className="px-5 py-3.5 font-semibold text-(--text-muted)">Roll No</th>
                  <th className="px-5 py-3.5 font-semibold text-(--text-muted)">Student ID</th>
                  <th className="px-5 py-3.5 font-semibold text-(--text-muted)">Name</th>
                  <th className="px-5 py-3.5 font-semibold text-(--text-muted) text-center">Class / Section</th>
                  <th className="px-5 py-3.5 font-semibold text-(--text-muted) text-center">Status</th>
                  <th className="px-5 py-3.5 font-semibold text-(--text-muted) text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="6" className="px-5 py-6">
                        <div className="h-4 bg-(--bg-soft) rounded-full w-3/4"></div>
                      </td>
                    </tr>
                  ))
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-(--bg-soft) flex items-center justify-center text-(--text-muted)">
                          <Search size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-(--text)">No students found</h3>
                        <p className="text-sm text-(--text-muted) max-w-xs mx-auto">
                          {searchTerm ? `No results for "${searchTerm}"` : "Adjust your filters or select a class to view students."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => (
                    <tr key={student.uid} className="group hover:bg-(--bg)/50 transition-colors">
                      <td className="px-5 py-2 font-medium text-(--text-muted)">
                        {student.rollNo.toString().padStart(2, "0") || "N/A"}
                      </td>
                      <td className="px-5 py-2 uppercase tracking-tight font-semibold">
                        {student.appId}
                      </td>
                      <td className="px-5 py-2 font-semibold text-(--text) capitalize">
                        {student.name}
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex flex-col items-center justify-center">
                          <span className="font-semibold text-xs">
                            {classData?.find(c => c.id === student.classId)?.name || student.classId} {selectedClass?.sections.find(sec => sec.id === student.sectionId)?.name || student.sectionId}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex justify-center">
                          <span className={`
                            px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider
                            ${student.status === "active"
                              ? `${theme === 'dark' ? 'bg-emerald-950/50 text-emerald-500' : 'bg-emerald-50 text-emerald-600'} border border-emerald-500/20`
                              : `${theme === 'dark' ? 'bg-red-950/50 text-red-500' : 'bg-red-50 text-red-600'} border border-red-500/20`}
                          `}>
                            {student.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-2 text-right">
                        <Link
                          href={`/school/${schoolUser.schoolId}/students/${student.uid}`}
                          className="inline-flex p-2 rounded-lg bg-(--bg-soft) text-(--text-muted) hover:text-(--primary) hover:bg-(--primary-soft) border border-(--border) transition-all"
                          title="View Profile"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination/Footer (Placeholder) */}
          {students.length > 0 && (
            <div className="px-6 py-4 bg-(--bg-soft)/30 border-t border-(--border) flex items-center justify-between">
              <p className="text-[10px] font-semibold text-(--text-muted) uppercase">
                Showing <span className="text-(--text)">{filteredStudents.length}</span> of <span className="text-(--text)">{students.length}</span> students
              </p>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-lg border border-(--border) text-(--text-muted) opacity-50 cursor-not-allowed">
                  <ChevronRight size={16} className="rotate-180" />
                </button>
                <button className="p-1.5 rounded-lg border border-(--border) text-(--text-muted) opacity-50 cursor-not-allowed">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    red: "bg-rose-500/10 text-rose-600 border-rose-500/20"
  };

  return (
    <div className={`px-5 py-4 rounded-lg border ${colors[color]} flex items-center justify-between bg-(--bg-card)`}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-1">{label}</p>
        <p className="text-2xl font-bold font-mono tracking-tight">{value > 0 ? value.toString().padStart(2, "0") : "-"}</p>
      </div>
      <div className={`p-2.5 rounded-xl ${colors[color]} border-0`}>
        <Icon size={20} />
      </div>
    </div>
  );
}

function Hash({ size, className }) {
  return (
    <span className={className} style={{ fontSize: size }}>#</span>
  );
}
