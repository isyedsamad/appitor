"use client";

import { useState } from "react";
import {ClipboardList, Plus, Trash2, Search, X, Save, Calendar, CalendarRange} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import {collection, getDocs, query, where, orderBy} from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/dateUtils";

export default function ExamSetupPage() {
  const { schoolUser, sessionList, classData, subjectData, setLoading } = useSchool();
  const { branch } = useBranch();
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
    examDate: ""
  });

  async function fetchTerms(session) {
    if(session == '') {
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
    try {
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
    } finally {
      setLoading(false);
    }
  }

  async function saveSetup() {
    const { classId, sectionId, subjectId, examDate } = form;
    if (!classId || !sectionId || !subjectId || !examDate) {
      toast.error("All fields are required");
      return;
    }
    const termSelected = terms.filter(t => t.id == selectedTerm)[0];
    if (new Date(examDate) < new Date(termSelected.startDate) || 
        new Date(examDate) > new Date(termSelected.endDate)) {
      toast.error("Exam Date should be within the exam period!");
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
        subjectId,
        examDate
      });
      toast.success("Exam setup saved");
      setOpenAdd(false);
      setForm({ classId: "", sectionId: "", subjectId: "", examDate: "" });
      fetchSetups();
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
    } finally {
      setLoading(false);
    }
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
          <div>
            <label className="text-sm font-medium text-(--text-muted)">Session</label>
            <select
              className="input"
              value={selectedSession}
              onChange={e => {
                setSelectedSession(e.target.value);
                setSelectedTerm("");
                fetchTerms(e.target.value);
              }}
            >
              <option value="">Select Session</option>
              {sessionList.map(s => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-(--text-muted)">Exam Term</label>
            <select
              className="input"
              value={selectedTerm}
              onChange={e => setSelectedTerm(e.target.value)}
            >
              <option value="">Select Term</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchSetups}
            className="btn-primary flex items-center gap-2"
          >
            <Search size={15} />
            Search
          </button>
        </div>
        {searched && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {setups.length === 0 ? (
              <div className="col-span-full text-center text-(--text-muted) py-12">
                No exam setup found
              </div>
            ) : (
              setups.map(s => (
                <div
                  key={s.id}
                  className="bg-(--bg-card) border border-(--border) rounded-xl py-4 px-5 space-y-3"
                >
                  <h3 className="text-md font-semibold">
                    {s.subjectName}
                  </h3>
                  <p className="text-sm text-(--text-muted)">
                    {s.className} – {s.sectionName}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-(--text-muted)">
                    <Calendar size={14} />
                    {formatDate(new Date(s.examDate))}
                  </div>
                  <div className="flex justify-end pt-3 border-t border-(--border)">
                    <button
                      onClick={() => deleteSetup(s.id)}
                      className="btn-outline text-(--danger) flex items-center gap-1"
                    >
                      <Trash2 size={15} />
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {openAdd && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-(--bg-card) w-full max-w-md rounded-xl border border-(--border)">
              <div className="flex justify-between items-center bg-(--bg) py-4 px-5 rounded-t-xl">
                <h2 className="text-md font-semibold">Add Exam Setup</h2>
                <X onClick={() => setOpenAdd(false)} className="cursor-pointer" />
              </div>
              <div className="pt-4 pb-6 px-5 space-y-4">
                {selectedTerm && terms.filter(t => t.id == selectedTerm).map(t =>
                  <>
                    <div key={t.id} className="flex justify-between items-start">
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
                            t.resultDeclared == true
                              ? "bg-(--status-p-bg) text-(--status-p-text)"
                              : "bg-(--status-l-bg) text-(--status-l-text)"
                          }
                        `}
                      >
                        {t.resultDeclared == true ? "Result Declared" : "Result Not Declared"}
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
                <Input label="Exam Date" type="date" value={form.examDate}
                  onChange={v => setForm({ ...form, examDate: v })} />
                <Select label="Class" value={form.classId}
                  options={classData}
                  onChange={v => setForm({ ...form, classId: v, sectionId: "" })} />
                <Select label="Section" value={form.sectionId}
                  options={classData.find(c => c.id === form.classId)?.sections || []}
                  onChange={v => setForm({ ...form, sectionId: v })} />
                <Select label="Subject" value={form.subjectId}
                  options={subjectData}
                  onChange={v => setForm({ ...form, subjectId: v })} />
                <div className="flex justify-end gap-3 pt-4 border-t border-(--border)">
                  <button onClick={() => setOpenAdd(false)} className="btn-outline">
                    Cancel
                  </button>
                  <button onClick={saveSetup} className="btn-primary flex items-center gap-2">
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

function Input({ label, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="text-sm font-medium text-(--text-muted)">{label}</label>
      <input
        type={type}
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
            {o.name || o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
