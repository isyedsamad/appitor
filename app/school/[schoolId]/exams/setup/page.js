"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Search,
  Save,
  CalendarRange,
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { formatDate } from "@/lib/dateUtils";
import { hasPermission } from "@/lib/school/permissionUtils";

export default function ExamSetupPage() {
  const { schoolUser, sessionList, classData, subjectData, setLoading, currentSession } = useSchool();
  const { branch, branchInfo } = useBranch();
  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const canManage = hasPermission(schoolUser, "exam.setup.manage", false, currentPlan);

  const [setups, setSetups] = useState([]);
  const [terms, setTerms] = useState([]);
  const [selectedSession, setSelectedSession] = useState(currentSession || "");

  useEffect(() => {
    if (currentSession) {
      setSelectedSession(currentSession);
    }
  }, [currentSession]);

  useEffect(() => {
    if (schoolUser?.schoolId && branch && selectedSession) {
      fetchTerms(selectedSession);
    }
  }, [schoolUser?.schoolId, branch, selectedSession]);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [searched, setSearched] = useState(false);
  const [bulkRows, setBulkRows] = useState([]);
  const [form, setForm] = useState({
    classId: "",
    sectionId: ""
  });
  const [cloneSectionId, setCloneSectionId] = useState("");

  const term = terms.find(t => t.id === selectedTerm);

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
        markingType: existing?.markingType || "marks",
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
        where("classId", "==", form.classId),
        where("sectionId", "==", form.sectionId),
        orderBy("examDate", "asc")
      );
      const snap = await getDocs(q);
      const setupsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSetups(setupsData);

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
        where("classId", "==", form.classId),
        where("sectionId", "==", form.sectionId)
      );
      const mapSnap = await getDocs(mapQ);
      const mapping = mapSnap.docs.map(d => ({
        subjectId: d.data().subjectId,
        teacherId: d.data().teacherId
      }));

      const rows = mergeSetupWithMapping(mapping, setupsData);
      setBulkRows(rows);
      setSearched(true);
    } catch (err) {
      toast.error("Failed to load exam setups: " + err.message);
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
      if (!r.examDate) {
        return;
      }
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
      fetchSetups();
    } catch (err) {
      toast.error("Failed: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="exam.setup.view">
      <div className="space-y-4 bg-(--bg) text-(--text)">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <ClipboardList size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Exam Setup</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Assign exams to class, section & subject
              </p>
            </div>
          </div>
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
              setCloneSectionId("");
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
              setCloneSectionId("");
              setForm({ ...form, sectionId: v });
            }}
          />
          <button onClick={fetchSetups} className="btn-primary flex gap-2">
            <Search size={15} />
            Search
          </button>
        </div>

        {searched && bulkRows.length > 0 ? (
          <div className="space-y-4">
            {terms.filter(t => t.id == selectedTerm).map(t =>
              <div key={t.id} className="flex flex-col md:flex-row justify-between md:items-center gap-2 bg-(--bg-card) border border-(--border) p-4 rounded-xl">
                <div>
                  <h3 className="text-md font-semibold text-(--text)">
                    {t.name}
                  </h3>
                  <p className="text-xs text-(--text-muted)">
                    Exam Term: {formatDate(new Date(t.startDate))} &rarr; {formatDate(new Date(t.endDate))}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit
                    ${t.resultDeclared === true
                      ? "bg-(--status-p-bg) text-(--status-p-text) border border-(--status-p-border)"
                      : "bg-(--status-l-bg) text-(--status-l-text) border border-(--status-l-border)"
                    }
                  `}
                >
                  {t.resultDeclared === true ? "Result Declared" : "Result Not Declared"}
                </span>
              </div>
            )}

            <div className="bg-(--bg-card) border border-(--border) p-5 rounded-xl space-y-5 shadow-sm">
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-(--primary)">
                  Quick Fill Tools
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:col-span-2">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-(--text-muted) font-semibold">Marking Type</label>
                      <select
                        className="input text-xs h-[38px] py-1"
                        onChange={e => {
                          const val = e.target.value;
                          if (val) {
                            setBulkRows(prev => prev.map(row => ({ ...row, markingType: val, maxMarks: val === 'grades' ? '' : row.maxMarks })));
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>Select Marking Type</option>
                        <option value="grades">Grades</option>
                        <option value="marks">Marks</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs text-(--text-muted) font-semibold">Max Marks</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="100"
                          id="bulk-max-marks-input"
                          className="input text-xs h-[38px] py-1 flex-1"
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById("bulk-max-marks-input");
                            const val = el ? el.value : "";
                            if (val) {
                              setBulkRows(prev => prev.map(row => row.markingType === "marks" ? { ...row, maxMarks: val } : row));
                            }
                          }}
                          className="btn-primary font-medium text-xs h-[38px] px-4 whitespace-nowrap"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="hidden md:flex justify-center items-center col-span-1 h-12">
                    <div className="w-[1px] h-full bg-(--border)"></div>
                  </div>

                  <div className="flex flex-col gap-1.5 md:col-span-2">
                    <label className="text-xs text-(--text-muted) font-semibold">Auto-Sequence Dates</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        id="bulk-seq-start-date"
                        min={term?.startDate}
                        max={term?.endDate}
                        className="input text-xs h-[38px] py-1 flex-1"
                      />
                      <select
                        id="bulk-seq-gap"
                        className="input text-xs h-[38px] py-1 w-[90px]"
                        defaultValue="1"
                      >
                        <option value="1">Daily</option>
                        <option value="2">2 Days</option>
                        <option value="3">3 Days</option>
                      </select>
                      <button
                        onClick={() => {
                          const startEl = document.getElementById("bulk-seq-start-date");
                          const gapEl = document.getElementById("bulk-seq-gap");
                          const startVal = startEl ? startEl.value : "";
                          const gapVal = gapEl ? parseInt(gapEl.value, 10) : 1;
                          if (!startVal) {
                            toast.error("Please select a start date for sequencing");
                            return;
                          }
                          let currentDate = new Date(startVal);
                          setBulkRows(prev =>
                            prev.map((row, idx) => {
                              if (idx > 0) {
                                currentDate.setDate(currentDate.getDate() + gapVal);
                                if (currentDate.getDay() === 0) {
                                  currentDate.setDate(currentDate.getDate() + 1);
                                }
                              }
                              const formatted = currentDate.toISOString().split("T")[0];
                              return { ...row, examDate: formatted };
                            })
                          );
                        }}
                        className="btn-primary font-medium text-xs h-[38px] px-4 whitespace-nowrap"
                      >
                        Sequence
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-(--border) pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-(--primary)">
                  Clone Configuration
                </h4>
                <div className="flex flex-col sm:flex-row gap-3 items-end max-w-md">
                  <div className="flex flex-col gap-1.5 flex-1 w-full">
                    <label className="text-xs text-(--text-muted) font-semibold">Source Section</label>
                    <select
                      className="input text-xs h-[38px] py-1 w-full"
                      value={cloneSectionId}
                      onChange={e => setCloneSectionId(e.target.value)}
                    >
                      <option value="">Select Section</option>
                      {classData && classData
                        .find(c => c.id === form.classId)
                        ?.sections.filter(s => s.id !== form.sectionId)
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name || s.id}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      if (!cloneSectionId) {
                        toast.error("Please select a section to clone from");
                        return;
                      }
                      if (!confirm("Are you sure you want to clone this setup? This will overwrite your current table data.")) {
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
                            "exam_setups"
                          ),
                          where("session", "==", selectedSession),
                          where("termId", "==", selectedTerm),
                          where("classId", "==", form.classId),
                          where("sectionId", "==", cloneSectionId),
                          orderBy("examDate", "asc")
                        );
                        const snap = await getDocs(q);
                        const cloneData = snap.docs.map(d => d.data());
                        if (cloneData.length === 0) {
                          toast.warning("No setup found for the selected section");
                          return;
                        }
                        const cloneMap = {};
                        cloneData.forEach(c => {
                          cloneMap[c.subjectId] = c;
                        });
                        setBulkRows(prev =>
                          prev.map(row => {
                            const match = cloneMap[row.subjectId];
                            if (match) {
                              return {
                                ...row,
                                examDate: match.examDate || "",
                                markingType: match.markingType || "grades",
                                maxMarks: match.maxMarks || ""
                              };
                            }
                            return row;
                          })
                        );
                        toast.success("Exam setup cloned successfully!");
                      } catch (err) {
                        toast.error("Failed to clone: " + err.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="btn-primary font-medium text-xs h-[38px] px-5 whitespace-nowrap w-full sm:w-auto"
                  >
                    Clone Setup
                  </button>
                </div>
              </div>
            </div>

            <div className="border border-(--border) bg-(--bg-card) rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-(--bg) text-(--text-muted)">
                    <tr className="border-b border-(--border)">
                      <th className="px-5 py-3 text-left font-semibold">Subject</th>
                      <th className="px-5 py-3 text-center font-semibold">Exam Date</th>
                      <th className="px-5 py-3 text-center font-semibold">Marking</th>
                      <th className="px-5 py-3 text-center font-semibold">Max Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {bulkRows.map((row, i) => (
                      <tr key={`${row.subjectId}-${i}`} className="hover:bg-(--bg)/50 transition-colors">
                        <td className="px-5 py-4 font-semibold text-(--text) capitalize">
                          {subjectData.find(s => s.id === row.subjectId)?.name || row.subjectId}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <input
                            type="date"
                            className="input mx-auto max-w-[200px]"
                            value={row.examDate}
                            min={term?.startDate}
                            max={term?.endDate}
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
                        <td className="px-5 py-3 text-center">
                          <select
                            className="input mx-auto max-w-[150px]"
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
                            <option value="marks">Marks</option>
                            <option value="grades">Grades</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {row.markingType === "marks" ? (
                            <input
                              type="number"
                              className="input mx-auto max-w-[120px] text-center"
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
                            <span className="text-(--text-muted) font-semibold">&mdash;</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {canManage && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={saveBulkSetup}
                  className="btn-primary flex items-center gap-2 h-[42px] px-6 shadow-md shadow-orange-500/10"
                >
                  <Save size={16} />
                  Save Exam Setup
                </button>
              </div>
            )}
          </div>
        ) : searched ? (
          <div className="p-10 text-center border border-(--border) rounded-2xl bg-(--bg-card) shadow-none">
            <div className="w-16 h-16 bg-(--bg-soft) rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={32} className="opacity-50" />
            </div>
            <h3 className="text-base font-bold text-(--text)">No Subjects Mapped</h3>
            <p className="text-xs text-(--text-muted) font-medium">Please check the subject-teacher mappings for this class section</p>
          </div>
        ) : (
          <div className="p-10 text-center border border-(--border) rounded-2xl bg-(--bg-card) shadow-none">
            <div className="w-16 h-16 bg-(--primary-soft) rounded-full flex items-center justify-center mx-auto mb-4 text-(--primary)">
              <ClipboardList size={32} />
            </div>
            <h3 className="text-base font-bold text-(--text)">Search and Manage Exam Schedules</h3>
            <p className="text-xs text-(--text-muted) font-medium">Select session, exam term, class, and section to view or configure subject exam schedules</p>
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
