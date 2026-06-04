"use client";

import { useState, useMemo } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Info,
  CheckSquare,
  Square,
  Plus,
  X
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import { canManage } from "@/lib/school/permissionUtils";

export default function StudentFeeAssignmentPage() {
  const { schoolUser, setLoading, classData } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === "asc" ? (
      <ArrowUp size={14} className="ml-1 text-(--primary)" />
    ) : (
      <ArrowDown size={14} className="ml-1 text-(--primary)" />
    );
  };

  const sortedStudents = useMemo(() => {
    let sortableItems = [...students];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "rollNo") {
          aValue = aValue ? parseInt(aValue, 10) : 999999;
          bValue = bValue ? parseInt(bValue, 10) : 999999;
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
        }

        if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [students, sortConfig]);

  const getClassName = (id) => classData.find((c) => c.id === id)?.name;

  const loadStudents = async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const base = ["schools", schoolUser.schoolId, "branches", branch];
      const [studentSnap, assignSnap] = await Promise.all([
        getDoc(
          doc(
            db,
            "schools",
            schoolUser.schoolId,
            "branches",
            branch,
            "meta",
            `${selectedClass}_${selectedSection}_${schoolUser.currentSession}`
          )
        ),
        getDocs(
          query(
            collection(db, ...base, "fees", "assignments", "items"),
            where("className", "==", selectedClass),
            where("section", "==", selectedSection),
            where("session", "==", schoolUser.currentSession),
            where("status", "==", "active")
          )
        ),
      ]);
      const assignments = assignSnap.docs.map((d) => d.data());
      const assignmentMap = {};
      assignments.forEach((a) => {
        assignmentMap[a.studentId] = a;
      });
      const studentSnapDoc = studentSnap.data().students.sort((a, b) =>
        String(a.appId).localeCompare(String(b.appId))
      );
      const studentsWithAssignment = studentSnapDoc.map((d) => ({
        id: d.uid,
        ...d,
        className: selectedClass,
        section: selectedSection,
        assignment: assignmentMap[d.uid] || null,
      }));
      setStudents(studentsWithAssignment);
      setSelectedIds([]);
    } catch (err) {
      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    const snap = await getDocs(
      collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "fees",
        "templates",
        "items"
      )
    );
    setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  const assignFees = async () => {
    if (!templateId || selectedIds.length === 0) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/fees/assignments", {
        branch,
        session: schoolUser.currentSession,
        students: students.filter((s) => selectedIds.includes(s.id)),
        templateId,
        templateName,
      });
      setOpen(false);
      setSelectedIds([]);
      toast.success("Fee Assigned to students!");
    } catch (err) {
      toast.error("Failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
    loadStudents();
  };

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "fee.setup.manage", currentPlan);

  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map((s) => s.id));
    }
  };

  return (
    <RequirePermission permission="fee.setup.view">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl border border-(--primary)/20 bg-(--primary-soft) text-(--primary) shadow-sm">
              <CheckCircle2 size={24} className="fill-current opacity-90" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-(--text)">Student Fee Assignment</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Assign fee templates · {branchInfo?.name}
              </p>
            </div>
          </div>
          <div className="bg-(--bg-card) border border-(--border) px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">Session</div>
            <div className="h-4 w-[1px] bg-(--border)" />
            <div className="text-xs font-bold text-(--primary)">{schoolUser?.currentSession}</div>
          </div>
        </div>

        <div className="bg-(--bg-card) border border-(--border) p-5 rounded-2xl shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider block mb-1">Class</label>
              <select
                className="input border-1 w-full"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                  setSelectedSection("");
                  setStudents([]);
                }}
              >
                <option value="">Select Class</option>
                {classData && classData.map((c) => (
                  <option key={c.name} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider block mb-1">Section</label>
              <select
                className="input border-1 w-full"
                value={selectedSection}
                disabled={!selectedClass}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="">Select Section</option>
                {classData && classData
                  .find((c) => c.id === selectedClass)
                  ?.sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name}
                    </option>
                  ))}
              </select>
            </div>
            <button
              onClick={loadStudents}
              disabled={!selectedClass || !selectedSection}
              className="btn-primary flex items-center gap-2 justify-center font-bold h-10 w-full"
            >
              <Search size={16} />
              Load Data
            </button>
          </div>
        </div>

        {students.length === 0 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
            <div className="p-3 bg-(--status-m-bg) rounded-xl text-(--status-m-text) shrink-0 border border-(--status-m-border)">
              <Info size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-(--text)">How does Fee Assignment work?</h3>
              <p className="text-xs text-(--text-muted) leading-relaxed mt-1">
                This page allows you to link predefined Fee Templates to the enrolled students of a specific class and section.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="border border-(--border) p-3.5 rounded-xl bg-(--bg)/20">
                  <span className="text-[10px] font-bold text-(--primary) uppercase tracking-wider">Step 1</span>
                  <h4 className="text-xs font-bold text-(--text) mt-0.5">Load Students</h4>
                  <p className="text-[11px] text-(--text-muted) font-medium mt-1">Select a Class and Section and click Load Data to fetch all active students.</p>
                </div>
                <div className="border border-(--border) p-3.5 rounded-xl bg-(--bg)/20">
                  <span className="text-[10px] font-bold text-(--primary) uppercase tracking-wider">Step 2</span>
                  <h4 className="text-xs font-bold text-(--text) mt-0.5">Select Students</h4>
                  <p className="text-[11px] text-(--text-muted) font-medium mt-1">Use the checkboxes next to each student's name, or select all at once.</p>
                </div>
                <div className="border border-(--border) p-3.5 rounded-xl bg-(--bg)/20">
                  <span className="text-[10px] font-bold text-(--primary) uppercase tracking-wider">Step 3</span>
                  <h4 className="text-xs font-bold text-(--text) mt-0.5">Assign Template</h4>
                  <p className="text-[11px] text-(--text-muted) font-medium mt-1">Click Apply Template to assign a new structure to the selected group.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {students.length > 0 && (
          <div className="space-y-6">
            <div className="bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-(--bg) text-(--text-muted) border-b border-(--border)">
                    <tr>
                      <th className="px-5 py-4 text-left w-14">
                        <button
                          onClick={toggleSelectAll}
                          className="flex items-center justify-center p-1 text-(--text-muted) hover:text-(--primary) transition-colors"
                        >
                          {selectedIds.length === students.length ? (
                            <CheckSquare size={18} className="text-(--primary)" />
                          ) : (
                            <Square size={18} />
                          )}
                        </button>
                      </th>
                      <th
                        className="px-5 py-4 text-left font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-(--text) transition-colors select-none"
                        onClick={() => handleSort("rollNo")}
                      >
                        <div className="flex items-center">Roll {getSortIcon("rollNo")}</div>
                      </th>
                      <th
                        className="px-5 py-4 text-left font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-(--text) transition-colors select-none"
                        onClick={() => handleSort("appId")}
                      >
                        <div className="flex items-center">Admission ID {getSortIcon("appId")}</div>
                      </th>
                      <th
                        className="px-5 py-4 text-left font-bold uppercase tracking-wider text-[11px] cursor-pointer hover:text-(--text) transition-colors select-none"
                        onClick={() => handleSort("name")}
                      >
                        <div className="flex items-center">Name {getSortIcon("name")}</div>
                      </th>
                      <th className="px-5 py-4 text-left font-bold uppercase tracking-wider text-[11px]">Assignment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {sortedStudents.map((s) => (
                      <tr key={s.id} className="hover:bg-(--bg)/20 transition-all duration-150">
                        <td className="px-5 py-3.5 text-left">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedIds((prev) =>
                                prev.includes(s.id)
                                  ? prev.filter((id) => id !== s.id)
                                  : [...prev, s.id]
                              )
                            }
                            className="inline-flex items-center justify-center text-(--text-muted) hover:text-(--primary) transition-colors"
                            aria-pressed={selectedIds.includes(s.id)}
                          >
                            {selectedIds.includes(s.id) ? (
                              <CheckSquare size={18} className="text-(--primary)" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="px-5 py-3.5 text-left font-semibold text-(--text)">
                          {s.rollNo ? (s.rollNo >= 10 ? s.rollNo : "0" + s.rollNo) : "-"}
                        </td>
                        <td className="px-5 py-3.5 text-left font-bold text-(--text)">{s.appId}</td>
                        <td className="px-5 py-3.5 text-left font-bold text-(--text) capitalize">{s.name}</td>
                        <td className="px-5 py-3.5 text-left">
                          {s.assignment ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-(--status-p-bg) text-(--status-p-text) border border-(--status-p-border)">
                              <CheckCircle2 size={12} />
                              {s.assignment.templateName}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-(--danger-soft) text-(--danger) border border-(--danger)/20">
                              <XCircle size={12} />
                              Not Assigned
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedIds.length > 0 && editable && (
              <div className="flex justify-end bg-(--bg-card) border border-(--border) rounded-2xl p-5 shadow-xs">
                <button
                  onClick={() => {
                    loadTemplates();
                    setOpen(true);
                  }}
                  className="btn-primary flex items-center gap-2 font-bold shadow-md shadow-(--primary)/10"
                >
                  <Plus size={16} />
                  Assign Fee Template
                </button>
              </div>
            )}
          </div>
        )}

        {open && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm px-5 flex items-center justify-center z-50">
            <div className="w-full max-w-md bg-(--bg-card) rounded-2xl border border-(--border) shadow-2xl flex flex-col overflow-hidden">
              <div className="p-5 border-b border-(--border) flex justify-between items-center bg-(--bg) rounded-t-2xl">
                <div>
                  <h3 className="font-bold text-(--text) text-sm uppercase tracking-wider">Assign Fee Template</h3>
                  <p className="text-xs text-(--text-muted) font-semibold mt-0.5">Select template for {selectedIds.length} students</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 hover:bg-(--bg) rounded-full text-(--text-muted) transition"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider block mb-1">Fee Template</label>
                  <select
                    className="input border-1 w-full"
                    value={templateId}
                    onChange={(e) => {
                      setTemplateId(e.target.value);
                      setTemplateName(e.target.options[e.target.selectedIndex].text);
                    }}
                  >
                    <option value="">Select Fee Template</option>
                    {templates && selectedClass !== ""
                      ? templates
                          .filter((t) => t.className === selectedClass)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} · {getClassName(t.className)}
                            </option>
                          ))
                      : null}
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-(--border) flex justify-end gap-3 bg-(--bg)">
                <button
                  className="px-4 py-2 border border-(--border) rounded-md text-xs font-bold bg-(--bg-card) hover:bg-(--bg)"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary text-xs font-bold px-4 py-2"
                  onClick={assignFees}
                >
                  Assign Template
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
