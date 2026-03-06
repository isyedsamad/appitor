"use client";

import { useState, useMemo } from "react";
import {
  Users,
  GraduationCap,
  Layers,
  CheckSquare,
  Square,
  Plus,
  X,
  Search,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Info,
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
  const [templateName, setTemplateName] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-(--primary)" /> : <ArrowDown size={14} className="ml-1 text-(--primary)" />;
  };

  const sortedStudents = useMemo(() => {
    let sortableItems = [...students];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'rollNo') {
          aValue = aValue ? parseInt(aValue, 10) : 999999;
          bValue = bValue ? parseInt(bValue, 10) : 999999;
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [students, sortConfig]);

  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  const loadStudents = async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const base = ["schools", schoolUser.schoolId, "branches", branch];
      const [studentSnap, assignSnap] = await Promise.all([
        getDoc(doc(db,
          "schools", schoolUser.schoolId, "branches", branch,
          "meta", `${selectedClass}_${selectedSection}_${schoolUser.currentSession}`)
        ),
        getDocs(
          query(
            collection(db, ...base, "fees", "assignments", "items"),
            where("className", "==", selectedClass),
            where("section", "==", selectedSection),
            where("session", "==", schoolUser.currentSession),
            where("status", "==", "active")
          )
        )
      ]);
      const assignments = assignSnap.docs.map(d => d.data());
      const assignmentMap = {};
      assignments.forEach(a => {
        assignmentMap[a.studentId] = a;
      });
      const studentSnapDoc = studentSnap.data().students.sort((a, b) => String(a.appId).localeCompare(String(b.appId)))
      const studentsWithAssignment = studentSnapDoc.map(d => ({
        id: d.uid,
        ...d,
        className: selectedClass,
        section: selectedSection,
        assignment: assignmentMap[d.uid] || null,
      }));
      setStudents(studentsWithAssignment);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Failed: ' + err);
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
    setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };
  const assignFees = async () => {
    if (!templateId || selectedIds.length === 0) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/fees/assignments", {
        branch,
        session: schoolUser.currentSession,
        students: students.filter(s => selectedIds.includes(s.id)),
        templateId,
        templateName
      });
      setOpen(false);
      setSelectedIds([]);
      toast.success('Fee Assigned to students!')
    } catch (err) {
      toast.error('Failed: ' + err.response.data.message);
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
      setSelectedIds(students.map(s => s.id));
    }
  };

  return (
    <RequirePermission permission="fee.setup.view">
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">Student Fee Assignment</h1>
            <p className="text-xs font-semibold text-(--text-muted)">
              Assign fee templates · {branchInfo?.name}
            </p>
          </div>
        </div>
        <div className="grid gred-col-1 md:grid-cols-5 gap-4">
          <select
            className="input"
            value={selectedClass}
            onChange={e => {
              setSelectedClass(e.target.value);
              setSelectedSection("");
              setStudents([]);
            }}
          >
            <option value="">Select Class</option>
            {classData && classData.map(c => (
              <option key={c.name} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={selectedSection}
            disabled={!selectedClass}
            onChange={e => setSelectedSection(e.target.value)}
          >
            <option value="">Select Section</option>
            {classData && classData
              .find(c => c.id === selectedClass)
              ?.sections.map(sec => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
          </select>

          <button
            onClick={loadStudents}
            disabled={!selectedClass || !selectedSection}
            className="btn-primary flex items-center gap-2 justify-center"
          >
            <Search size={16} />
            Load Data
          </button>
        </div>

        {students.length === 0 && (
          <div className="bg-(--status-m-bg) border border-(--status-m-border) rounded-2xl p-5 md:p-6 mb-6 mt-4">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="bg-(--status-m-text)/10 p-3 rounded-full text-(--status-m-text) shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-(--status-m-text) font-semibold text-base mb-1">
                  How does Fee Assignment work?
                </h3>
                <p className="text-(--status-m-text) text-sm leading-relaxed mb-3">
                  This page allows you to link predefined Fee Templates to the enrolled students of a specific class and section.
                </p>
                <ul className="text-sm text-(--status-m-text) space-y-2 list-none p-0">
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <span><strong>Load Students:</strong> Select a Class and Section above and click "Load Data" to fetch all active students along with their currently assigned templates.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <span><strong>Select Students:</strong> Use the checkboxes next to each student's name to select who you want to modify, or use the "Select All" checkbox at the top left.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-(--status-m-text) text-(--status-m-bg) flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <span><strong>Assign Templates:</strong> Once students are selected, click "Apply Template" to assign a new fee structure or click "Remove Assignment" to clear their existing ones.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {students.length > 0 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-(--bg) text-(--text-muted)">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <button onClick={toggleSelectAll}>
                        {selectedIds.length === students.length ? (
                          <CheckSquare size={16} />
                        ) : (
                          <Square size={16} />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('rollNo')}>
                      <div className="flex items-center">Roll {getSortIcon('rollNo')}</div>
                    </th>
                    <th className="px-4 py-3 text-left cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('appId')}>
                      <div className="flex items-center">Admission ID {getSortIcon('appId')}</div>
                    </th>
                    <th className="px-4 py-3 text-left cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('name')}>
                      <div className="flex items-center">Name {getSortIcon('name')}</div>
                    </th>
                    <th className="px-4 py-3 text-left">Assignment</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents && sortedStudents.map(s => (
                    <tr key={s.id} className="border-t border-(--border)">
                      <td className="px-4 py-3 text-left">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedIds(prev =>
                              prev.includes(s.id)
                                ? prev.filter(id => id !== s.id)
                                : [...prev, s.id]
                            )
                          }
                          className="inline-flex items-center justify-center
                                hover:bg-(--bg) rounded-md"
                          aria-pressed={selectedIds.includes(s.id)}
                        >
                          {selectedIds.includes(s.id) ? (
                            <CheckSquare
                              size={16}
                              className="text-(--primary)"
                            />
                          ) : (
                            <Square
                              size={16}
                              className="text-(--text-muted)"
                            />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-left">{s.rollNo ? s.rollNo >= 10 ? s.rollNo : '0' + s.rollNo : '-'}</td>
                      <td className="px-4 py-3 text-left font-semibold">{s.appId}</td>
                      <td className="px-4 py-3 text-left font-semibold capitalize">{s.name}</td>
                      <td className="px-4 py-3 text-left">
                        {s.assignment ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2
                              size={16}
                              className="text-(--accent)"
                            />
                            <span className="text-sm">
                              {s.assignment.templateName}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-(--text-muted)">
                            <XCircle size={16} />
                            <span className="text-sm">Not Assigned</span>
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
        {selectedIds.length > 0 && editable && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                loadTemplates();
                setOpen(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Assign Fee Template
            </button>
          </div>
        )}
        {open && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm px-5 flex items-center justify-center z-50">
            <div className="w-full max-w-md bg-(--bg-card) rounded-xl border border-(--border)">
              <div className="p-5 border-b border-(--border) flex justify-between items-center bg-(--bg) rounded-t-xl">
                <h2 className="font-semibold flex items-center gap-2">
                  <Layers size={16} />
                  Assign Fee Template
                </h2>
                <X onClick={() => setOpen(false)} className="cursor-pointer" />
              </div>
              <div className="p-5 space-y-4">
                <select
                  className="input"
                  value={templateId}
                  onChange={e => {
                    setTemplateId(e.target.value);
                    setTemplateName(e.target.options[e.target.selectedIndex].text)
                  }}
                >
                  <option value="">Select Fee Template</option>
                  {(templates && selectedClass != '') ? (templates).filter(t => t.className == selectedClass).map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name} · {getClassName(t.className)}
                    </option>
                  )) : null}
                </select>
                <p className="text-sm text-(--text-muted)">
                  {selectedIds.length} students selected
                </p>
              </div>
              <div className="p-4 border-t border-(--border) flex justify-end gap-3">
                <button
                  className="btn-secondary"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={assignFees}
                >
                  Assign
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </RequirePermission>
  );
}
