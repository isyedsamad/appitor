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
  const [setups, setSetups] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [searched, setSearched] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
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
    if (!selectedSession || !selectedTerm) return;
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
      orderBy("examDate", "asc")
    );
    const snap = await getDocs(q);
    setSetups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setSearched(true);
    setLoading(false);
  }

  async function saveSetup() {
    const { classId, sectionId, subjectId, examDate, markingType, maxMarks } = form;
    if (!classId || !sectionId || !subjectId || !examDate) {
      toast.error("All fields are required");
      return;
    }
    if (markingType === "marks" && !maxMarks) {
      toast.error("Maximum marks required");
      return;
    }
    const term = terms.find(t => t.id === selectedTerm);
    if (
      new Date(examDate) < new Date(term.startDate) ||
      new Date(examDate) > new Date(term.endDate)
    ) {
      toast.error("Exam Date should be within the exam period!");
      return;
    }
    setLoading(true);
    try {
      if (editId) {
        await secureAxios.put("/api/school/exams/setup", {
          id: editId,
          branch,
          session: selectedSession,
          termId: selectedTerm,
          classId,
          sectionId,
          subjectId,
          examDate,
          markingType,
          maxMarks: markingType === "marks" ? Number(maxMarks) : null
        });
      } else {
        await secureAxios.post("/api/school/exams/setup", {
          branch,
          session: selectedSession,
          termId: selectedTerm,
          classId,
          sectionId,
          subjectId,
          examDate,
          markingType,
          maxMarks: markingType === "marks" ? Number(maxMarks) : null
        });
      }      
      toast.success("Exam Setup Saved!");
      setEditId(null);
      setOpenAdd(false);
      setForm({
        classId: "",
        sectionId: "",
        subjectId: "",
        examDate: "",
        markingType: "grades",
        maxMarks: ""
      });
      fetchSetups();
    } catch(err) {
      toast.error('Failed: ' + err);
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
              onClick={() => setOpenAdd(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={15} />
              Add Setup
            </button>
          )}
        </div>
        <div className="grid md:grid-cols-6 gap-3 md:items-end">
          <Select
            label="Session"
            value={selectedSession}
            options={sessionList}
            onChange={v => {
              setSelectedSession(v);
              setSelectedTerm("");
              fetchTerms(v);
            }}
          />
          <Select
            label="Exam Term"
            value={selectedTerm}
            options={terms}
            onChange={v => setSelectedTerm(v)}
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
                        onClick={() => openEditSetup(s)}
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
            <div className="bg-(--bg-card) w-full max-w-md rounded-xl border border-(--border)">
              <div className="flex justify-between items-center bg-(--bg) rounded-t-xl py-4 px-5">
                <h2 className="text-md font-semibold">Add Exam Setup</h2>
                <X onClick={() => {
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
                <Input
                  label="Exam Date"
                  type="date"
                  value={form.examDate}
                  onChange={v => setForm({ ...form, examDate: v })}
                />
                <Select
                  label="Class"
                  value={form.classId}
                  options={classData}
                  onChange={v =>
                    setForm({ ...form, classId: v, sectionId: "" })
                  }
                />
                <Select
                  label="Section"
                  value={form.sectionId}
                  options={
                    classData.find(c => c.id === form.classId)?.sections || []
                  }
                  onChange={v => setForm({ ...form, sectionId: v })}
                />
                <Select
                  label="Subject"
                  value={form.subjectId}
                  options={subjectData}
                  onChange={v => setForm({ ...form, subjectId: v })}
                />
                <div>
                  <label className="text-sm font-medium text-(--text-muted)">
                    Marking Scheme
                  </label>
                  <div className="flex gap-4 mt-2 items-center">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.markingType === "grades"}
                        onChange={() =>
                          setForm({ ...form, markingType: "grades", maxMarks: "" })
                        }
                      />
                      Grades
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={form.markingType === "marks"}
                        onChange={() =>
                          setForm({ ...form, markingType: "marks" })
                        }
                      />
                      Marks
                    </label>
                  </div>
                </div>
                {form.markingType === "marks" && (
                  <Input
                    label="Maximum Marks"
                    type="number"
                    placeholder="i.e. 100"
                    value={form.maxMarks}
                    onChange={v => setForm({ ...form, maxMarks: v })}
                  />
                )}
                <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-(--border)">
                  <button onClick={() => setOpenAdd(false)} className="btn-outline">
                    Cancel
                  </button>
                  <button onClick={saveSetup} className="btn-primary flex gap-2">
                    <Save size={15} />
                    Save Setup
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
        {options.map(o => (
          <option key={o.id} value={o.id}>
            {o.name || o.id}
          </option>
        ))}
      </select>
    </div>
  );
}
