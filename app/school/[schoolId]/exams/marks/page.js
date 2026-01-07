"use client";

import { useEffect, useState } from "react";
import { ClipboardCheck, Search, Save, Calendar, Loader2 } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

const GRADES = ["A", "B", "C", "D", "E", "F", "G", "H"];
const GRADE_POINTS = {
  A: 95,
  B: 85,
  C: 70,
  D: 55,
  E: 40,
  F: 30,
  G: 20,
  H: 10
};

export default function MarksEntryPage() {
  const { schoolUser, sessionList, classData, setLoading, subjectData, employeeData } = useSchool();
  const { branch } = useBranch();
  const [terms, setTerms] = useState([]);
  const [setups, setSetups] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [filters, setFilters] = useState({
    session: "",
    termId: "",
    classId: "",
    sectionId: ""
  });
  const [searched, setSearched] = useState(false);

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
      where("session", "==", session)
    );
    const snap = await getDocs(q);
    setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    setLoading(false);
  }

  async function searchData() {
    const { session, termId, classId, sectionId } = filters;
    if (!session || !termId || !classId || !sectionId) {
      toast.error("Please select all filters");
      return;
    }
    setLoading(true);
    try {
      const setupQ = query(
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
        where("session", "==", session),
        where("termId", "==", termId),
        where("classId", "==", classId),
        where("sectionId", "==", sectionId)
      );
      const setupSnap = await getDocs(setupQ);
      const setupData = setupSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSetups(setupData);
      const stuQ = query(
        collection(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "students"
        ),
        where("className", "==", classId),
        where("section", "==", sectionId),
        where("rollNo", "!=", null),
        where("status", "==", "active"),
        orderBy("rollNo", "asc")
      );
      const stuSnap = await getDocs(stuQ);
      const stuData = stuSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setStudents(stuData);
      const existingMarks = await loadExistingMarks(stuData, termId);
      setMarks(existingMarks);
      setSearched(true);
    } catch(err) {
      toast.error('Failed: ' + err);
    } finally {
      setLoading(false);
    }
  }

  async function loadExistingMarks(students, termId) {
    if (students.length === 0) return {};
    const promises = students.map(stu => {
      const ref = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "exams",
        "items",
        "student_marks"
      );
      return getDocs(
        query(
          ref,
          where("studentId", "==", stu.id),
          where("termId", "==", termId)
        )
      );
    });
    const snaps = await Promise.all(promises);
    const loadedMarks = {};
    snaps.forEach((snap, index) => {
      if (snap.empty) return;
      const data = snap.docs[0].data();
      const studentId = students[index].id;
      (data.marks || []).forEach(m => {
        loadedMarks[`${studentId}_${m.setupId}`] = m.value;
      });
    });
    return loadedMarks;
  }
  
  function updateMark(studentId, setupId, value) {
    setMarks(prev => ({
      ...prev,
      [`${studentId}_${setupId}`]: value
    }));
  }

  async function saveMarks() {
    if (Object.keys(marks).length === 0) {
      toast.error("No marks entered");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/exams/marks", {
        branch,
        session: filters.session,
        termId: filters.termId,
        classId: filters.classId,
        sectionId: filters.sectionId,
        marks
      });
      toast.success("Marks saved successfully");
    } catch(err) {
      toast.error('Failed: ' + err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="exam.manage">
      <div className="space-y-4 bg-(--bg) text-(--text)">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Marks Entry</h1>
            <p className="text-sm text-(--text-muted)">
              Enter student marks or grades
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-6 gap-2 md:items-end">
          <Select
            label="Session"
            value={filters.session}
            options={sessionList}
            onChange={v => {
              setFilters({ ...filters, session: v, termId: "" });
              fetchTerms(v);
            }}
          />
          <Select
            label="Exam Term"
            value={filters.termId}
            options={terms}
            onChange={v => setFilters({ ...filters, termId: v })}
          />
          <Select
            label="Class"
            value={filters.classId}
            options={classData}
            onChange={v =>
              setFilters({ ...filters, classId: v, sectionId: "" })
            }
          />
          <Select
            label="Section"
            value={filters.sectionId}
            options={
              classData && classData.find(c => c.id === filters.classId)?.sections || []
            }
            onChange={v => setFilters({ ...filters, sectionId: v })}
          />
          <button onClick={searchData} className="btn-primary flex gap-2">
            <Search size={15} />
            Search
          </button>
        </div>
        {searched && (
          <div className="rounded-xl border border-(--border) bg-(--bg-card) overflow-hidden">
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full text-[13px] border-collapse">
                <thead className="sticky top-0 z-20 bg-(--bg)">
                  <tr className="border-b border-(--border)">
                    <th className="px-3 py-2 text-left font-semibold">
                      Roll
                    </th>
                    <th className="px-3 py-2 text-left font-semibold min-w-[80px] md:min-w-[150px]">
                      Student
                    </th>
                    {setups.map(s => (
                      <th
                        key={s.id}
                        className="px-2 py-2 text-center font-semibold min-w-[90px]"
                      >
                        <div className="flex flex-col leading-tight">
                          <span>{getSubjectName(s.subjectId)}</span>
                          <span className="text-xs text-(--text-muted)">
                            {s.markingType === "marks"
                              ? `Max Marks: ${s.maxMarks}`
                              : "Grade Marking"}
                          </span>
                        </div>
                      </th>
                    ))}

                    <th className="px-3 py-2 text-center font-semibold min-w-[70px]">
                      Total
                    </th>
                    <th className="px-3 py-2 text-center font-semibold min-w-[70px]">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu, rowIndex) => {
                    let totalMarks = 0;
                    let maxTotal = 0;
                    let gradePointsSum = 0;
                    let gradeCount = 0;
                    setups.forEach(s => {
                      const key = `${stu.id}_${s.id}`;
                      const val = marks[key];
                      if (s.markingType === "marks") {
                        if (val !== undefined && val !== "" && !isNaN(val)) {
                          totalMarks += Number(val);
                          maxTotal += Number(s.maxMarks || 0);
                        }
                      }
                      if (s.markingType === "grades") {
                        if (val && GRADE_POINTS[val] !== undefined) {
                          gradePointsSum += GRADE_POINTS[val];
                          gradeCount += 1;
                        }
                      }
                    });
                    const marksPercentage = maxTotal > 0 ? (totalMarks / maxTotal) * 100 : null;
                    const gradePercentage = gradeCount > 0 ? gradePointsSum / gradeCount : null;
                    let finalPercentage = null;
                    if (marksPercentage !== null && gradePercentage !== null) {
                      finalPercentage = Math.round((marksPercentage + gradePercentage) / 2);
                    } else if (marksPercentage !== null) {
                      finalPercentage = Math.round(marksPercentage);
                    } else if (gradePercentage !== null) {
                      finalPercentage = Math.round(gradePercentage);
                    }
                    let derivedGrade = "-";
                    if (finalPercentage !== null) {
                      derivedGrade =
                        finalPercentage >= 90 ? "A" :
                        finalPercentage >= 75 ? "B" :
                        finalPercentage >= 60 ? "C" :
                        finalPercentage >= 45 ? "D" :
                        "E";
                    }                    

                    return (
                      <tr
                        key={stu.id}
                        className={`border-b border-(--border)
                          ${rowIndex % 2 === 0 ? "bg-(--bg-card)" : "bg-(--bg)"}
                        `}
                      >
                        <td className="px-3 py-2 font-medium text-center">
                          {stu.rollNo
                            ? stu.rollNo.toString().padStart(2, "0")
                            : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold">{stu.name}</span>
                            <span className="text-xs text-(--text-muted) font-medium">
                              {stu.appId}
                            </span>
                          </div>
                        </td>
                        {setups.map(s => {
                          const key = `${stu.id}_${s.id}`;
                          return (
                            <td key={s.id} className="px-2 py-2 text-center">
                              {s.markingType === "grades" ? (
                                <select
                                  className="input"
                                  value={marks[key] || ""}
                                  onChange={e =>
                                    updateMark(stu.id, s.id, e.target.value)
                                  }
                                >
                                  <option value="">–</option>
                                  {GRADES.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="number"
                                  max={s.maxMarks}
                                  className="input text-center"
                                  placeholder="-"
                                  value={marks[key] || ''}
                                  onChange={e => {
                                    let val = e.target.value;
                                    if (val == "") {
                                      updateMark(stu.id, s.id, 0);
                                      return;
                                    }
                                    val = Number(val);
                                    if (isNaN(val)) return;
                                    if (val < 0) val = 0;
                                    if (val > s.maxMarks) val = s.maxMarks;
                                    updateMark(stu.id, s.id, val);
                                  }}
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold">
                        {maxTotal > 0
                          ? `${totalMarks}/${maxTotal}`
                          : gradeCount > 0
                          ? "Grade Based"
                          : "-"
                        }
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold
                              ${
                                derivedGrade === "A"
                                  ? "bg-(--status-p-bg) text-(--status-p-text)"
                                  : derivedGrade === "B"
                                  ? "bg-(--status-m-bg) text-(--status-m-text)"
                                  : derivedGrade === "C"
                                  ? "bg-(--status-l-bg) text-(--status-l-text)"
                                  : "bg-(--status-a-bg) text-(--status-a-text)"
                              }
                            `}
                          >
                            {derivedGrade}
                            {finalPercentage !== null && (
                              <span className="ml-1">
                                ({finalPercentage}%)
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {searched && (
          <div className="flex justify-end">
            <button onClick={saveMarks} className="btn-primary flex gap-2">
              <Save size={16} />
              Save Marks
            </button>
          </div>
        )}
      </div>
    </RequirePermission>
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
