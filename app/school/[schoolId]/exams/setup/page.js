"use client";

import { useState } from "react";
import {
  ClipboardList,
  Plus,
  Trash2,
  Search,
  X,
  Save,
  Calendar,
  CalendarRange,
  Pencil
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/dateUtils";

export default function ExamSetupPage() {
  const { schoolUser, sessionList, classData, subjectData, setLoading } = useSchool();
  const { branch } = useBranch();
  const [editId, setEditId] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [setups, setSetups] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [searched, setSearched] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [mappedSubjects, setMappedSubjects] = useState([]);
  const [bulkRows, setBulkRows] = useState([]);
  const [form, setForm] = useState({
    classId: "",
    sectionId: "",
    subjectId: "",
    examDate: "",
    markingType: "grades",
    maxMarks: ""
  });

  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  const getSubjectName = id =>
    subjectData.find(s => s.id === id)?.name;
  const getTeacherName = id =>
    employeeData.find(t => t.id === id)?.name;

  function mergeSetupWithMapping(mapping, setups) {
    const setupMap = {};
    setups.forEach(s => {
      setupMap[s.subjectId] = s;
    });
    return mapping.map(m => {
      const existing = setupMap[m.subjectId];
      return {
        subjectId: m.subjectId,
        teacherId: m.teacherId,
        examDate: existing?.examDate || "",
        markingType: existing?.markingType || "grades",
        maxMarks: existing?.maxMarks || ""
      };
    });
  }  

  async function fetchTerms(session) {
    if (!session) {
      setTerms([]);
      return;
    }
    setLoading(true);
    const q = query(
      collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "exams",
        "items",
        "exam_terms"
      ),
      where("session", "==", session),
      orderBy("startDate", "asc")
    );
    const snap = await getDocs(q);
    setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function fetchSetups() {
    if (!selectedSession || !selectedTerm || !form.classId || !form.sectionId) return;
    setLoading(true);
    const q = query(
      collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "exams",
        "items",
        "exam_setups"
      ),
      where("session", "==", selectedSession),
      where("termId", "==", selectedTerm),
      where("classId", "==", form.classId),
      where("sectionId", "==", form.sectionId),
      orderBy("examDate", "asc")
    );
    const snap = await getDocs(q);
    setSetups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setSearched(true);
    setLoading(false);
  }

  async function fetchMappedSubjects(classId, sectionId, mode = "add") {
    if (!classId || !sectionId) return;
    setLoading(true);
    try {
      const mapQ = query(
        collection(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "timetable",
          "items",
          "subjectTeacherMapping"
        ),
        where("classId", "==", classId),
        where("sectionId", "==", sectionId)
      );
      const mapSnap = await getDocs(mapQ);
      const mapping = mapSnap.docs.map(d => ({
        subjectId: d.data().subjectId,
        teacherId: d.data().teacherId
      }));
      let rows = mapping;
      if (mode === "edit") {
        rows = mergeSetupWithMapping(mapping, setups);
        setIsEditMode(true);
      } else {
        rows = mapping.map(m => ({
          ...m,
          examDate: "",
          markingType: "grades",
          maxMarks: ""
        }));
        setIsEditMode(false);
      }
      setBulkRows(rows);
      setOpenAdd(true);
    } finally {
      setLoading(false);
    }
  }  

  async function saveBulkSetup() {
    const { classId, sectionId } = form;
    if (!classId || !sectionId || !selectedTerm || !selectedSession) {
      toast.error("Class, section, session and term are required");
      return;
    }
    const term = terms.find(t => t.id === selectedTerm);
    if (!term) {
      toast.error("Invalid exam term");
      return;
    }
    const validRows = [];
    const invalidSubjects = [];
    bulkRows.forEach(r => {
      // if (!r.examDate) {
      //   invalidSubjects.push(r.subjectId);
      //   return;
      // }
      const examDateObj = new Date(r.examDate);
      if (
        examDateObj < new Date(term.startDate) ||
        examDateObj > new Date(term.endDate)
      ) {
        invalidSubjects.push(r.subjectId);
        return;
      }
      if (r.markingType === "marks") {
        if (!r.maxMarks || Number(r.maxMarks) <= 0) {
          invalidSubjects.push(r.subjectId);
          return;
        }
      }
      validRows.push({
        subjectId: r.subjectId,
        examDate: r.examDate,
        markingType: r.markingType,
        maxMarks:
          r.markingType === "marks" ? Number(r.maxMarks) : null
      });
    });
    if (validRows.length === 0) {
      toast.error("Please complete exam setup for at least one subject");
      return;
    }
    if (invalidSubjects.length > 0) {
      toast.error("Some subjects have invalid date selected or incomplete data");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/exams/setup", {
        branch,
        session: selectedSession,
        termId: selectedTerm,
        classId,
        sectionId,
        rows: validRows
      });
      toast.success("Exam setup saved successfully");
      setOpenAdd(false);
      setEditId(null);
      setBulkRows([]);
      fetchSetups();
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }  

  async function deleteSetup(id) {
    if (!confirm("Delete this exam setup?")) return;
    setLoading(true);
    try {
      await secureAxios.delete(
        `/api/school/exams/setup?id=${id}&branch=${branch}`
      );
      toast.success("Exam setup deleted");
      fetchSetups();
    } catch(err) {
      toast.error('Failed: ' + err);
    } finally {
      setLoading(false);
    }
  }

  function openEditSetup(s) {
    setEditId(s.id);
    setForm({
      classId: s.classId,
      sectionId: s.sectionId,
      subjectId: s.subjectId,
      examDate: s.examDate,
      markingType: s.markingType || "grades",
      maxMarks: s.maxMarks || ""
    });
    setOpenAdd(true);
  }

  return (
    <RequirePermission permission="exam.create">
      <div className="space-y-4 bg-(--bg) text-(--text)">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <ClipboardList size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Exam Setup</h1>
              <p className="text-sm text-(--text-muted)">
                Assign exams to class, section & subject
              </p>
            </div>
          </div>
          {searched && (
            <button
              onClick={() => fetchMappedSubjects(form.classId, form.sectionId, "edit")}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} />
              {setups.length == 0 ? "Add Setup" : "Edit Setup"}
            </button>
          )}
        </div>
        <div className="grid md:grid-cols-6 gap-3 md:items-end">
          <Select
            label="Session"
            value={selectedSession}
            options={sessionList}
            onChange={v => {
              setSearched(false);
              setSelectedSession(v);
              setSelectedTerm("");
              fetchTerms(v);
            }}
          />
          <Select
            label="Exam Term"
            value={selectedTerm}
            options={terms}
            onChange={v => {
              setSearched(false);
              setSelectedTerm(v)
            }}
          />
          <Select
            label="Class"
            value={form.classId}
            options={classData && classData}
            onChange={v => {
              setSearched(false);
              setForm({ ...form, classId: v, sectionId: "" });
            }}
          />
          <Select
            label="Section"
            value={form.sectionId}
            options={
              classData && classData.find(c => c.id === form.classId)?.sections || []
            }
            onChange={v => {
              setSearched(false);
              setForm({ ...form, sectionId: v });
            }}
          />
          <button onClick={fetchSetups} className="btn-primary flex gap-2">
            <Search size={15} />
            Search
          </button>
        </div>
        {searched && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {setups.length === 0 ? (
              <div className="col-span-full text-center text-(--text-muted) py-12">
                No exam setup found
              </div>
            ) : (
              setups.map(s => (
                <div
                  key={s.id}
                  className="bg-(--bg-card) border border-(--border) rounded-xl p-4 space-y-2 hover:shadow-sm transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-md font-semibold text-(--text)">
                        {getSubjectName(s.subjectId)}
                      </h3>
                      <p className="text-sm text-(--text-muted)">
                        Exam Configuration
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          fetchMappedSubjects(form.classId, form.sectionId, "edit")
                        }
                        className="action-btn hover:text-(--status-l-text)"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteSetup(s.id)}
                        className="action-btn text-red-500"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 font-medium rounded bg-(--primary-soft) text-(--primary)">
                      Class {getClassName(s.classId)}
                    </span>
                    <span className="text-xs px-2 font-medium py-1 rounded bg-(--bg) border border-(--border)">
                      Section {getSectionName(s.classId, s.sectionId)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-medium text-sm text-(--text-muted)">
                    <Calendar size={14} />
                    <span>{formatDate(new Date(s.examDate))}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.markingType === "grades" ? (
                      <span className="text-xs px-2 py-1 rounded bg-(--status-p-bg) text-(--status-p-text) font-medium">
                        Grading: A - F
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded bg-(--status-m-bg) text-(--status-m-text) font-medium">
                        Marks: / {s.maxMarks}
                      </span>
                    )}
                  </div>
                  <div className="pt-3 border-t border-(--border) text-xs text-(--text-muted)">
                    Setup ready for marks entry
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {openAdd && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-(--bg-card) w-full max-w-3xl rounded-xl border border-(--border)">
              <div className="flex justify-between items-center bg-(--bg) rounded-t-xl py-4 px-5">
                <h2 className="text-md font-semibold">Add Exam Setup</h2>
                <X className="cursor-pointer hover:text-red-500" onClick={() => {
                  setEditId(null);
                  setOpenAdd(false)
                }} />
              </div>
              <div className="pt-4 pb-6 px-5 space-y-2 max-h-[75dvh] overflow-y-auto">
                {searched && terms.filter(t => t.id == selectedTerm).map(t => 
                  <>
                    <div key={t} className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text(--text)">
                          {t.name}
                        </h3>
                        <p className="text-sm text-(--text-muted)">
                          Exam Term
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded font-medium
                          ${
                            t.resultDeclared === true
                              ? "bg-(--status-p-bg) text-(--status-p-text)"
                              : "bg-(--status-l-bg) text-(--status-l-text)"
                          }
                        `}
                      >
                        {t.resultDeclared === true ? "Result Declared" : "Result Not Declared"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-(--text-muted)">
                      <CalendarRange size={15} />
                      <span>
                        {formatDate(new Date(t.startDate))} → {formatDate(new Date(t.endDate))}
                      </span>
                    </div>
                  </>
                )}
                {bulkRows.length > 0 && (
                  <div className="mt-4 border border-(--border) rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-(--bg)">
                        <tr>
                          <th className="px-3 py-2 text-left">Subject</th>
                          <th className="px-3 py-2 text-center">Exam Date</th>
                          <th className="px-3 py-2 text-center">Marking</th>
                          <th className="px-3 py-2 text-center">Max Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((row, i) => (
                          <tr key={row.subjectId} className="border-t border-(--border)">
                            <td className="px-3 py-2 font-medium">
                              {subjectData.find(s => s.id === row.subjectId)?.name}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                className="input"
                                value={row.examDate}
                                onChange={e => {
                                  const v = e.target.value;
                                  setBulkRows(r =>
                                    r.map((x, idx) =>
                                      idx === i ? { ...x, examDate: v } : x
                                    )
                                  );
                                }}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                className="input"
                                value={row.markingType}
                                onChange={e => {
                                  const v = e.target.value;
                                  setBulkRows(r =>
                                    r.map((x, idx) =>
                                      idx === i
                                        ? { ...x, markingType: v, maxMarks: "" }
                                        : x
                                    )
                                  );
                                }}
                              >
                                <option value="grades">Grades</option>
                                <option value="marks">Marks</option>
                              </select>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {row.markingType === "marks" ? (
                                <input
                                  type="number"
                                  className="input max-w-[90px]"
                                  placeholder="100"
                                  value={row.maxMarks}
                                  onChange={e => {
                                    const v = e.target.value;
                                    setBulkRows(r =>
                                      r.map((x, idx) =>
                                        idx === i ? { ...x, maxMarks: v } : x
                                      )
                                    );
                                  }}
                                />
                              ) : (
                                <span className="text-(--text-muted)">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-(--border)">
                  <button onClick={() => setOpenAdd(false)} className="btn-outline">
                    Cancel
                  </button>
                  <button
                    onClick={() =>
                      saveBulkSetup()
                    }
                    className="btn-primary flex gap-2"
                  >
                    <Save size={15} />
                    Save Exam Setup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function Input({ label, value, onChange, type = "text", placeholder = '' }) {
  return (
    <div>
      <label className="text-sm font-medium text-(--text-muted)">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input"
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div>
      <label className="text-sm font-medium text-(--text-muted)">{label}</label>
      <select
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Select</option>
        {options && options.map(o => (
          <option key={o.id} value={o.id}>
            {o.name || o.id}
          </option>
        ))}
      </select>
    </div>
  );
}
