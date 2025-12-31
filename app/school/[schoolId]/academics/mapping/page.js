"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  User,
  Plus,
  Save,
  X,
  Pencil,
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

export default function SubjectTeacherMappingPage() {
  const { setLoading, schoolUser, classData } = useSchool();
  const { branch } = useBranch();
  const [mappings, setMappings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    classId: "",
    className: "",
    sectionId: "",
    sectionName: "",
    subjectId: "",
    subjectName: "",
    teacherId: "",
    teacherName: "",
    periodsPerWeek: "",
  });
  useEffect(() => {
    if (!branch || !schoolUser?.schoolId || !classData) return;
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [mapSnap, teacherSnap, subjSnap] =
          await Promise.all([
            getDocs(collection(db,
              "schools",
              schoolUser.schoolId,
              "branches",
              branch, "subjectTeacherMapping")),
            getDocs(collection(db,
              "schools",
              schoolUser.schoolId,
              "branches",
              branch, "employees")),
            getDocs(doc(db,
              "schools",
              schoolUser.schoolId,
              "branches",
              branch, "subjects", "branch_subjects")),
          ]);
        setMappings(
          mapSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setTeachers(
          teacherSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        );
        setSubjects(
          subjSnap.data().subjects
        );
      } catch (err) {
        toast.error("Failed to Load Data!");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [branch, schoolUser?.schoolId, classData]);
  const handleClassChange = (classId) => {
    const selectedClass = classData.find(c => c.id === classId);
    setForm({
      ...form,
      classId: selectedClass.id,
      className: selectedClass.name,
      sectionId: "",
      sectionName: "",
    });
    setSections(selectedClass?.sections || []);
  };
  const saveMapping = async () => {
    if (!form.classId || !form.sectionId) {
      toast.error("Please select class and section");
      return;
    }
    try {
      setLoading(true);
      await secureAxios.post("/academics/subject-mapping", {
        branch: branch,
        ...form,
        id: editing?.id || null,
      });
      toast.success(
        editing ? "Mapping updated" : "Mapping created"
      );
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error("Failed to save mapping");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (row) => {
    setForm(row);
    setEditing(row);
    setOpen(true);
  };

  return (
    <RequirePermission permission="academic.manage">
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-(--primary-soft) text-(--primary)">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Subject–Teacher Mapping
              </h1>
              <p className="text-sm text-(--text-muted)">
                Who teaches which subject for each class
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setForm({
                classId: "",
                sectionId: "",
                subjectId: "",
                subjectName: "",
                teacherId: "",
                teacherName: "",
                periodsPerWeek: "",
              });
              setEditing(null);
              setOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            Add Mapping
          </button>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg) border-b border-(--border)">
              <tr className="text-left text-(--text-muted)">
                <th className="p-3">Class</th>
                <th className="p-3">Subject</th>
                <th className="p-3">Teacher</th>
                <th className="p-3">Periods / Week</th>
                <th className="p-3"></th>
              </tr>
            </thead>

            <tbody>
              {mappings.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-(--border)"
                >
                  <td className="p-3">
                    {row.classId} – {row.sectionId}
                  </td>
                  <td className="p-3">{row.subjectName}</td>
                  <td className="p-3">{row.teacherName}</td>
                  <td className="p-3">{row.periodsPerWeek}</td>
                  <td className="p-3">
                    <button
                      onClick={() => openEdit(row)}
                      className="action-btn"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}

              {mappings.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="p-6 text-center text-(--text-muted)"
                  >
                    No mappings created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
            <div className="w-full max-w-md bg-(--bg-card) h-full p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-(--text)">
                  {editing ? "Edit Mapping" : "Add Mapping"}
                </h2>
                <button onClick={() => setOpen(false)}>
                  <X />
                </button>
              </div>
              <Field label="Class">
                <select
                  className="input"
                  value={form.classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                >
                  <option value="">Select Class</option>
                  {classData.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Section">
              <select
                className="input"
                value={form.sectionId}
                disabled={!sections.length}
                onChange={(e) => {
                  const sec = sections.find(s => s.id === e.target.value);
                  setForm({
                    ...form,
                    sectionId: sec.id,
                    sectionName: sec.name,
                  });
                }}
              >
                <option value="">
                  {sections.length ? "Select Section" : "Select class first"}
                </option>

                {sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </Field>
              <Field label="Subject">
                <select
                  className="input"
                  value={form.subjectId}
                  onChange={(e) => {
                    const subj = subjects.find(
                      (s) => s.id === e.target.value
                    );
                    setForm({
                      ...form,
                      subjectId: subj.id,
                      subjectName: subj.name,
                    });
                  }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Teacher">
                <select
                  className="input"
                  value={form.teacherId}
                  onChange={(e) => {
                    const t = teachers.find(
                      (t) => t.id === e.target.value
                    );
                    setForm({
                      ...form,
                      teacherId: t.id,
                      teacherName: t.name,
                    });
                  }}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Periods per Week">
                <input
                  type="number"
                  className="input"
                  value={form.periodsPerWeek}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      periodsPerWeek: Number(e.target.value),
                    })
                  }
                />
              </Field>

              <button
                onClick={saveMapping}
                className="btn-primary w-full"
              >
                <Save size={18} />
                Save Mapping
              </button>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-(--text-muted)">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
