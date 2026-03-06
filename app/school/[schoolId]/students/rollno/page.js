"use client";

import { useState, useMemo } from "react";
import {
  Hash,
  RefreshCcw,
  Save,
  Trash2,
  ArrowDownAZ,
  ArrowDown10,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Users,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { canManage } from "@/lib/school/permissionUtils";
import RequirePermission from "@/components/school/RequirePermission";

export default function AssignRollPage() {
  const { classData, schoolUser, setLoading, loading } = useSchool();
  const { branchInfo, branch } = useBranch();

  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedClass = classData?.find(c => c.id === className);
  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const lower = searchTerm.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.appId.toLowerCase().includes(lower)
    );
  }, [students, searchTerm]);

  async function loadStudents() {
    if (!className || !section) {
      toast.error("Select class & section");
      return;
    }
    setLoading(true);
    try {
      const rosterRef = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "meta",
        `${className}_${section}_${schoolUser.currentSession}`
      );
      const snap = await getDoc(rosterRef);
      if (!snap.exists()) {
        setStudents([]);
        toast.info("No active roster found for this selection");
        return;
      }
      const data = snap.data();
      const results = (data.students || [])
        .map((s) => ({
          ...s,
          classId: data.classId,
          sectionId: data.sectionId,
        }))
        .sort((a, b) =>
          String(a.appId).localeCompare(String(b.appId))
        );
      setStudents(results);
    } catch (err) {
      console.error("LOAD STUDENTS META ERROR:", err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  function updateRoll(uid, value) {
    setStudents(prev =>
      prev.map(s =>
        s.uid === uid ? { ...s, rollNo: value ? Number(value) : null } : s
      )
    );
  }

  function autoAssign() {
    setStudents(prev =>
      prev.map((s, i) => ({ ...s, rollNo: i + 1 }))
    );
  }

  function alphabeticalAssign() {
    const sorted = [...students].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setStudents(sorted.map((s, i) => ({ ...s, rollNo: i + 1 })));
  }

  function appIdAssign() {
    const sorted = [...students].sort((a, b) =>
      String(a.appId).localeCompare(String(b.appId), undefined, { numeric: true })
    );
    setStudents(sorted.map((s, i) => ({ ...s, rollNo: i + 1 })));
  }

  function clearAll() {
    setStudents(prev => prev.map(s => ({ ...s, rollNo: null })));
  }

  const duplicates = useMemo(() => {
    const nums = students.map(s => s.rollNo).filter(Boolean);
    const seen = new Set();
    const dups = new Set();
    nums.forEach(n => {
      if (seen.has(n)) dups.add(n);
      else seen.add(n);
    });
    return dups;
  }, [students]);

  async function saveRolls() {
    if (duplicates.size > 0) {
      toast.error(`Duplicate roll numbers found: ${Array.from(duplicates).join(", ")}`);
      return;
    }
    setSaving(true);
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/assign-roll", {
        className,
        section,
        branch,
        session: schoolUser.currentSession,
        updates: students.map(s => ({
          uid: s.uid,
          rollNo: s.rollNo ?? null,
        })),
      });
      toast.success("Roll numbers updated successfully");
      loadStudents();
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "student.rollno.manage", currentPlan);

  return (
    <RequirePermission permission="student.rollno.view">
      <div className="space-y-4 pb-20 text-sm">
        <div className="flex flex-col mb-5 md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <Hash size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Assign Roll Numbers</h1>
              <p className="text-xs text-(--text-muted) font-medium">
                Manage and organize student roll numbers for {schoolUser.currentSession}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-1">
                Select Class
              </label>
              <select
                className="input w-full bg-(--bg-card)"
                value={className}
                onChange={e => {
                  setClassName(e.target.value);
                  setSection("");
                  setStudents([]);
                }}
              >
                <option value="">Choose Class</option>
                {classData?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-1">
                Select Section
              </label>
              <select
                className="input w-full bg-(--bg-card)"
                disabled={!selectedClass}
                value={section}
                onChange={e => {
                  setSection(e.target.value);
                  setStudents([]);
                }}
              >
                <option value="">Choose Section</option>
                {selectedClass?.sections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                onClick={loadStudents}
                disabled={!className || !section}
                className="btn-primary w-full h-[42px] flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} />
                Load Roster
              </button>
            </div>

            <div className="md:col-span-3">
              <div className="relative group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                <input
                  type="text"
                  placeholder="Filter loaded list..."
                  className="input pl-10 w-full bg-(--bg-card)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  disabled={students.length === 0}
                />
              </div>
            </div>
          </div>
        </div>

        {students.length > 0 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {editable && (
                  <button
                    onClick={autoAssign}
                    className="btn-outline border-dashed px-5 py-3 flex items-center gap-2 text-xs font-bold"
                  >
                    <RefreshCcw size={14} color="green" /> Auto Assign
                  </button>
                )}
                {editable && (
                  <button
                    onClick={alphabeticalAssign}
                    className="btn-outline border-dashed px-5 py-3 flex items-center gap-2 text-xs font-bold"
                  >
                    <ArrowDownAZ size={14} color="green" /> Alphabetical
                  </button>
                )}
                {editable && (
                  <button
                    onClick={appIdAssign}
                    className="btn-outline border-dashed px-5 py-3 flex items-center gap-2 text-xs font-bold"
                  >
                    <ArrowDown10 size={14} color="green" /> App ID Order
                  </button>
                )}
                {editable && (
                  <button
                    onClick={clearAll}
                    className="btn-outline border-dashed px-5 py-3 flex items-center gap-2 text-xs font-bold hover:text-red-500 hover:border-red-500"
                  >
                    <Trash2 size={14} color="red" /> Clear All
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--bg-card) border border-(--border)">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-(--text-muted)">
                  <Users size={14} />
                  <span>Total: {students.length}</span>
                </div>
                <div className="w-px h-4 bg-(--border) mx-1" />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-(--text-muted)">
                  <CheckCircle2 size={14} className="text-green-500" />
                  <span>Assigned: {students.filter(s => s.rollNo).length}</span>
                </div>
              </div>
            </div>

            <div className="bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-(--bg-soft)/50 border-b border-(--border)">
                      <th className="px-6 py-4 font-bold text-(--text-muted) w-32 uppercase tracking-wider text-[10px]">Roll No</th>
                      <th className="px-6 py-4 font-bold text-(--text-muted) w-40 uppercase tracking-wider text-[10px]">Admission ID</th>
                      <th className="px-6 py-4 font-bold text-(--text-muted) uppercase tracking-wider text-[10px]">Student Details</th>
                      <th className="px-6 py-4 font-bold text-(--text-muted) text-right uppercase tracking-wider text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {filteredStudents.map(s => {
                      const isDup = s.rollNo && duplicates.has(s.rollNo);
                      return (
                        <tr key={s.uid} className="group hover:bg-(--bg-soft)/30 transition-colors">
                          <td className="px-6 py-3">
                            <input
                              type="number"
                              onWheel={(e) => e.preventDefault()}
                              className={`input w-24 h-[38px] text-center font-mono font-bold text-lg ${isDup ? 'border-red-500 bg-red-500/5 text-red-600 focus:ring-red-500' : 'bg-(--bg-soft)'}`}
                              value={s.rollNo ?? ""}
                              onChange={e => updateRoll(s.uid, e.target.value)}
                              placeholder="--"
                            />
                          </td>
                          <td className="px-6 py-3 font-bold text-(--text) uppercase tracking-tight">
                            {s.appId}
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-(--primary-soft) text-(--primary) border border-(--primary-border) flex items-center justify-center font-bold text-sm uppercase">
                                {s.name.charAt(0)}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-(--text) capitalize text-sm">{s.name}</span>
                                <span className="text-[10px] text-(--text-muted) font-semibold uppercase">{getClassName(className)} {getSectionName(className, section)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-right">
                            {isDup ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-(--status-a-bg) text-(--status-a-text) text-[10px] font-semibold uppercase">
                                <AlertCircle size={12} /> Duplicate
                              </span>
                            ) : s.rollNo ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-(--status-p-bg) text-(--status-p-text) text-[10px] font-semibold uppercase">
                                <CheckCircle2 size={12} /> Assigned
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-(--status-l-bg) text-(--status-l-text) text-[10px] font-semibold uppercase">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {editable && (
                <button
                  onClick={saveRolls}
                  disabled={saving || duplicates.size > 0}
                  className="btn-primary flex items-center gap-2 text-sm py-3 px-8 shadow-lg shadow-orange-500/20"
                >
                  {saving ? <RefreshCcw size={15} className="animate-spin" /> : <Save size={18} />}
                  <span className="font-semibold">Save All Changes</span>
                </button>
              )}
            </div>
          </div>
        )}

        {students.length === 0 && !loading && (
          <div className="py-24 flex flex-col items-center justify-center bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm">
            <div className="w-20 h-20 rounded-3xl bg-(--bg-soft) flex items-center justify-center text-(--text-muted) mb-5">
              <Filter size={40} className="opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-(--text)">Ready to Assign?</h3>
            <p className="text-sm text-(--text-muted) max-w-sm text-center mt-2 font-medium">
              Select a class and section from the filters above to load the student roster and start assigning roll numbers.
            </p>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
