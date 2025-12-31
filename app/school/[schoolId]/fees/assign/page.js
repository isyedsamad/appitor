"use client";

import { useState } from "react";
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
} from "lucide-react";
import {
  collection,
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
  const loadStudents = async () => {
    if (!selectedClass || !selectedSection) return;
    setLoading(true);
    try {
      const base = ["schools", schoolUser.schoolId, "branches", branch];
      const [studentSnap, assignSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, ...base, "students"),
            where("className", "==", selectedClass),
            where("section", "==", selectedSection)
          )
        ),
        getDocs(
          query(
            collection(db, ...base, "fees", "assignments", "items"),
            where("className", "==", selectedClass),
            where("section", "==", selectedSection),
            where("status", "==", "active")
          )
        )
      ]);
      const assignments = assignSnap.docs.map(d => d.data());
      const assignmentMap = {};
      assignments.forEach(a => {
        assignmentMap[a.studentId] = a;
      });
      const studentsWithAssignment = studentSnap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        assignment: assignmentMap[d.id] || null,
      }));
      console.log(studentsWithAssignment);
      
      setStudents(studentsWithAssignment);
      setSelectedIds([]);  
    } catch(err) {
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
        students: students.filter(s => selectedIds.includes(s.id)),
        templateId,
        templateName
      });
      setOpen(false);
      setSelectedIds([]);
      toast.success('Fee Assigned to students!')
    } catch(err) {
      toast.error('Failed: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
    loadStudents();
  };
  const toggleSelectAll = () => {
    if (selectedIds.length === students.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(students.map(s => s.id));
    }
  };
  return (
    <RequirePermission permission="fee.manage">
      <div className="space-y-5">
        <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <Users size={20} />
            </div>
          <div>
            <h1 className="text-lg font-semibold">Student Fee Assignment</h1>
            <p className="text-sm text-(--text-muted)">
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
                  <th className="px-4 py-3 text-left">Roll</th>
                  <th className="px-4 py-3 text-left">Admission ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Assignment</th>
                </tr>
              </thead>
              <tbody>
                {students && students.map(s => (
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
                    <td className="px-4 py-3 text-left font-semibold">{s.admissionId}</td>
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
        {selectedIds.length > 0 && (
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
                      {t.name} · {t.className}
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
