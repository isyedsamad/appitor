"use client";

import { useState } from "react";
import {BookOpen, Plus, Trash2, CheckCircle2, Search, X, Save, CalendarRange} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import {collection, getDocs, query, where, orderBy} from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { formatDate, formatInputDate } from "@/lib/dateUtils";

export default function ExamTermsPage() {
  const { schoolUser, sessionList, setLoading, currentSession } = useSchool();
  const { branch } = useBranch();
  const [terms, setTerms] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [searched, setSearched] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
  });
  async function fetchTerms() {
    if (!selectedSession) {
      return;
    }
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
          "exam_terms"
        ),
        where("session", "==", selectedSession),
        orderBy("startDate", "asc")
      );
      const snap = await getDocs(q);
      setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setSearched(true);
    } catch(err) {
      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
    }
  }

  async function saveTerm() {
    const { name, startDate, endDate } = form;
    if (!name || !startDate || !endDate) {
      toast.error("All fields are required");
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error("End date cannot be before start date");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/exams/terms", {
        branch,
        session: currentSession,
        name,
        startDate,
        endDate,
      });
      toast.success("Exam term created");
      setOpenAdd(false);
      setForm({ name: "", startDate: "", endDate: "" });
      fetchTerms();
    } catch(err) {
      toast.error('Failed: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTerm(id) {
    if (!confirm("Delete this exam term?")) return;
    setLoading(true);
    try {
      await secureAxios.delete(
        `/api/school/exams/terms?id=${id}&branch=${branch}`
      );
      toast.success("Exam term deleted");
      fetchTerms();
    } finally {
      setLoading(false);
    }
  }

  async function declareResult(id) {
    if (!confirm("Declare result for this exam term?")) return;

    setLoading(true);
    try {
      await secureAxios.post("/api/school/exams/declare", {
        branch,
        termId: id
      });
      toast.success("Result declared");
      fetchTerms();
    } finally {
      setLoading(false);
    }
  }

  const total = terms.length;
  const declared = terms.filter(t => t.resultDeclared).length;
  const pending = total - declared;

  return (
    <RequirePermission permission="exam.create">
      <div className="space-y-4 bg-(--bg) text-(--text)">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Exam Terms</h1>
              <p className="text-sm text-(--text-muted)">
                Define exam periods, schedules & results
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpenAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={15} />
            Add Exam Term
          </button>
        </div>
        <div className="grid md:grid-cols-5 gap-3 md:items-end">
          <div>
            <label className="text-sm text-(--text-muted) font-medium">Session</label>
            <select
              className="input"
              value={selectedSession}
              onChange={e => setSelectedSession(e.target.value)}
            >
              <option value="">Select Session</option>
              {sessionList.map(s => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </select>
          </div>
          <button
            onClick={fetchTerms}
            className="btn-primary flex items-center gap-2"
          >
            <Search size={15} />
            Search
          </button>
        </div>
        {searched && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat label="Total Terms" value={total == 0 ? total : total.toString().padStart(2, '0')} />
            <Stat label="Declared" value={declared == 0 ? declared : declared.toString().padStart(2, '0')} accent="success" />
            <Stat label="Pending" value={pending == 0 ? pending : pending.toString().padStart(2, '0')} accent="warning" />
          </div>
        )}

        {searched && (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
            {terms.length === 0 ? (
              <div className="col-span-full text-center text-(--text-muted) py-12">
                No exam terms found for selected session
              </div>
            ) : (
              terms.map(t => {
                const isDeclared = t.resultDeclared === true;
                return (
                  <div
                    key={t.id}
                    className={`bg-(--bg-card) border border-(--border) rounded-xl py-4 px-5 space-y-3 transition
                      ${isDeclared ? "opacity-90" : "hover:shadow-sm"}
                    `}
                  >
                    <div className="flex justify-between items-start">
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
                            isDeclared
                              ? "bg-(--status-p-bg) text-(--status-p-text)"
                              : "bg-(--status-l-bg) text-(--status-l-text)"
                          }
                        `}
                      >
                        {isDeclared ? "Result Declared" : "Result Not Declared"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-(--text-muted)">
                      <CalendarRange size={15} />
                      <span>
                        {formatDate(new Date(t.startDate))} → {formatDate(new Date(t.endDate))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-medium pt-3 border-t border-(--border)">
                      {isDeclared ? (
                        <span className="text-sm btn-outline cursor-not-allowed text-(--text-muted) italic">
                          Result is locked
                        </span>
                      ) : (
                        <button
                          onClick={() => declareResult(t.id)}
                          className="text-sm text-green-500 btn-outline flex items-center gap-1"
                        >
                          <CheckCircle2 size={15} />
                          Declare Result
                        </button>
                      )}
                      {isDeclared ? (
                        <span className="text-sm btn-outline cursor-not-allowed text-(--text-muted) font-medium italic">
                          Deletion disabled
                        </span>
                      ) : (
                        <button
                          onClick={() => deleteTerm(t.id)}
                          className="text-sm text-(--danger) btn-outline font-medium flex items-center gap-1"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {openAdd && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
            <div className="bg-(--bg-card) w-full max-w-lg rounded-xl border border-(--border)">
              <div className="flex justify-between items-center bg-(--bg) py-4 px-5 rounded-t-xl">
                <h2 className="text-md font-semibold">Add Exam Term</h2>
                <X
                  className="cursor-pointer text-(--text-muted)"
                  onClick={() => setOpenAdd(false)}
                />
              </div>
              <div className="pt-4 pb-6 px-5 flex flex-col gap-4">
                <div className="grid gap-4">
                  <Input label="Term Name" value={form.name} placeholder="i.e. End Term Exam"
                    onChange={v => setForm({ ...form, name: v })} />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Input type="date" label="Start Date" value={form.startDate}
                      onChange={v => setForm({ ...form, startDate: v })} />
                    <Input type="date" label="End Date" value={form.endDate}
                      onChange={v => setForm({ ...form, endDate: v })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-(--border)">
                  <button onClick={() => setOpenAdd(false)} className="btn-outline">
                    Cancel
                  </button>
                  <button onClick={saveTerm} className="btn-primary flex items-center gap-2">
                    <Save size={15} />
                    Save Term
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

function Stat({ label, value, accent }) {
  return (
    <div className="bg-(--bg-card) border border-(--border) rounded-xl p-4">
      <p className="text-sm text-(--text-muted)">{label}</p>
      <p className={`text-2xl font-semibold ${
        accent === "success" ? "text-green-600" :
        accent === "warning" ? "text-(--warning)" : ""
      }`}>
        {value}
      </p>
    </div>
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
