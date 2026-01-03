"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Search,
  Save,
  X,
  CalendarClock
} from "lucide-react";

import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { hasPermission } from "@/lib/school/permissionUtils";
import secureAxios from "@/lib/secureAxios";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/lib/dateUtils";
import { toast } from "react-toastify";

export default function AssignmentPage() {
  const {schoolUser, classData, subjectData, employeeData, sessionList, currentSession, setLoading} = useSchool();
  const { branch } = useBranch();
  const isAdmin = hasPermission(schoolUser, "learning.all", false);
  const [filters, setFilters] = useState({
    sessionId: currentSession?.id || "",
    classId: "",
    sectionId: ""
  });
  const [assignmentDoc, setAssignmentDoc] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [teacherOptions, setTeacherOptions] = useState([]);
  const [form, setForm] = useState({
    sessionId: "",
    classId: "",
    sectionId: "",
    subjectId: "",
    teacherId: "",
    title: "",
    description: "",
    dueDate: "",
    maxMarks: ""
  });

  const getClassName = id => classData.find(c => c.id === id)?.name;
  const getSectionName = (cid, sid) =>
    classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
  const getSubjectName = id =>
    subjectData.find(s => s.id === id)?.name;
  const getTeacherName = id =>
    employeeData.find(t => t.id === id)?.name;

  useEffect(() => {
    if(sessionList && currentSession) {
      setFilters({
        ...filters,
        sessionId: currentSession
      })
    }
  }, [sessionList, currentSession])
  
  useEffect(() => {
    if (!openAdd || isAdmin) return;
    async function fetchTeacherClasses() {
      setLoading(true);
      try {
        const ref = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "timetable",
          "items",
          "teachers",
          schoolUser.uid
        );
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        const unique = {};
        (snap.data().slots || []).forEach(s => {
          const key = `${s.classId}_${s.sectionId}_${s.subjectId}`;
          unique[key] = s;
        });
        setTeacherOptions(Object.values(unique));
      } finally {
        setLoading(false);
      }
    }
    fetchTeacherClasses();
  }, [openAdd]);

  async function searchAssignments() {
    if (!filters.sessionId || !filters.classId || !filters.sectionId) return;
    setLoading(true);
    try {
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "learning",
        "items",
        "assignments",
        `${filters.classId}_${filters.sectionId}_${filters.sessionId}`
      );
      const snap = await getDoc(ref);
      setAssignmentDoc(snap.exists() ? snap.data() : null);
    } finally {
      setLoading(false);
    }
  }

  async function saveAssignment() {
    if (
      !form.title ||
      !form.subjectId ||
      !form.dueDate ||
      !form.sessionId
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    setLoading(true);
    try {
      await secureAxios.post("/api/school/learning/assignments", {
        branch,
        ...form
      });

      toast.success("Assignment created successfully");
      setOpenAdd(false);
      setForm({
        sessionId: currentSession?.id || "",
        classId: "",
        sectionId: "",
        subjectId: "",
        teacherId: "",
        title: "",
        description: "",
        dueDate: "",
        maxMarks: ""
      });

      searchAssignments();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <RequirePermission permission="learning.manage">
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Assignments</h1>
              <p className="text-sm text-(--text-muted)">
                Session-wise assignments & deadlines
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpenAdd(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} /> Add Assignment
          </button>
        </div>
        <div className="grid lg:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col">
            <p className="text-(--text-muted) font-medium text-sm">Session</p>
            <select
              className="input"
              value={filters.sessionId}
              onChange={(e) =>
                setFilters({ ...filters, sessionId: e.target.value })
              }
            >
              <option value="">Select Session</option>
              {sessionList && sessionList.map(s => (
                <option key={s.id} value={s.id}>{s.id}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <p className="text-(--text-muted) font-medium text-sm">Session</p>
            <select
              className="input"
              value={filters.classId}
              onChange={(e) =>
                setFilters({ ...filters, classId: e.target.value, sectionId: "" })
              }
            >
              <option value="">Class</option>
              {classData && classData.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <p className="text-(--text-muted) font-medium text-sm">Session</p>
            <select
              className="input"
              disabled={!filters.classId}
              value={filters.sectionId}
              onChange={(e) =>
                setFilters({ ...filters, sectionId: e.target.value })
              }
            >
              <option value="">Section</option>
              {(classData && classData.find(c => c.id === filters.classId)?.sections || []).map(
                s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                )
              )}
            </select>
          </div>
          <button
            onClick={searchAssignments}
            className="btn-primary flex items-center gap-2"
          >
            <Search size={16} /> Search
          </button>
        </div>
        {!assignmentDoc && (
          <div className="text-center text-sm text-(--text-muted) py-12">
            Search to view assignments
          </div>
        )}
        {assignmentDoc && (
          <div className="grid md:grid-cols-3 gap-4">
            {(assignmentDoc.items || []).map(a => (
              <div
                key={a.assignmentId}
                className="bg-(--bg-card) border border-(--border) rounded-xl p-5 hover:shadow-md transition"
              >
                <div className="flex justify-between mb-2">
                  <h3 className="font-semibold">{a.title}</h3>
                  <span className="text-xs px-2 py-1 rounded-full bg-(--primary-soft) text-(--primary)">
                    {getSubjectName(a.subjectId)}
                  </span>
                </div>

                <p className="text-sm text-(--text-muted) mb-2 flex items-center gap-1">
                  <CalendarClock size={14} />
                  Due {formatDate(a.dueDate)}
                </p>

                <p className="text-sm line-clamp-3">{a.description}</p>

                <div className="mt-3 text-xs text-(--text-muted)">
                  {getTeacherName(a.teacherId)} · {a.maxMarks || "-"} marks
                </div>
              </div>
            ))}
          </div>
        )}
        {openAdd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-(--bg-card) w-full max-w-md rounded-lg">
              <div className="flex justify-between px-5 py-4 bg-(--bg) rounded-t-lg">
                <h2 className="font-semibold">Add Assignment</h2>
                <button onClick={() => setOpenAdd(false)}>
                  <X />
                </button>
              </div>
              <div className="p-5 space-y-3 max-h-[80vh] overflow-x-auto">
                <div className="flex flex-col">
                  <p className="text-(--text-muted) font-medium text-sm">Assignment Title</p>
                  <input
                    className="input"
                    placeholder="i.e. Write a Essay - My Family"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                {isAdmin && (
                  <>
                    <div className="flex flex-col">
                      <p className="text-(--text-muted) font-medium text-sm">Class</p>
                      <select
                        className="input"
                        value={form.classId}
                        onChange={(e) =>
                          setForm({ ...form, classId: e.target.value, sectionId: "" })
                        }
                      >
                        <option value="">Select Class</option>
                        {classData.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-(--text-muted) font-medium text-sm">Section</p>
                      <select
                        className="input"
                        disabled={!form.classId}
                        value={form.sectionId}
                        onChange={(e) =>
                          setForm({ ...form, sectionId: e.target.value })
                        }
                      >
                        <option value="">Select Section</option>
                        {(classData.find(c => c.id === form.classId)?.sections || []).map(
                          s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          )
                        )}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-(--text-muted) font-medium text-sm">Subject</p>
                      <select
                        className="input"
                        value={form.subjectId}
                        onChange={(e) =>
                          setForm({ ...form, subjectId: e.target.value })
                        }
                      >
                        <option value="">Select Subject</option>
                        {subjectData.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {!isAdmin && (
                  <div className="flex flex-col">
                    <p className="text-(--text-muted) font-medium text-sm">Period</p>
                    <select
                      className="input"
                      onChange={(e) => {
                        const t = JSON.parse(e.target.value);
                        setForm({
                          ...form,
                          classId: t.classId,
                          sectionId: t.sectionId,
                          subjectId: t.subjectId,
                          teacherId: schoolUser.uid
                        });
                      }}
                    >
                      <option value="">Select Class / Subject</option>
                      {teacherOptions.map((t, idx) => (
                        <option key={idx} value={JSON.stringify(t)}>
                          {getClassName(t.classId)} {getSectionName(t.classId, t.sectionId)} · {getSubjectName(t.subjectId)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col">
                  <p className="text-(--text-muted) font-medium text-sm">Due Date</p>
                  <input
                    type="date"
                    className="input"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm({ ...form, dueDate: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <p className="text-(--text-muted) font-medium text-sm">Max Marks (optional)</p>
                  <input
                    className="input"
                    placeholder="i.e. 50"
                    value={form.maxMarks}
                    onChange={(e) =>
                      setForm({ ...form, maxMarks: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col">
                  <p className="text-(--text-muted) font-medium text-sm">Assignment Description (optional)</p>
                  <textarea
                    className="input h-20"
                    placeholder="enter the assignment description here..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <button
                  onClick={saveAssignment}
                  className="btn-primary w-full flex justify-center items-center gap-2"
                >
                  <Save size={16} /> Save Assignment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
