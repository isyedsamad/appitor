"use client";

import { useEffect, useState } from "react";
import {BookOpen, Plus, Save, X, Pencil, Trash2, Search} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { limit, startAfter } from "firebase/firestore";

export default function SubjectTeacherMappingPage() {
  const { setLoading, schoolUser, classData, employeeData, subjectData } = useSchool();
  const { branch } = useBranch();
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 5;
  const [mappings, setMappings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const selectedClass = classData?.find(c => c.id === selectedClassId);
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
    if (!branch || !schoolUser?.schoolId || !classData || !subjectData || !employeeData) return;
    setSubjects(subjectData);
    setTeachers(employeeData);
  }, [branch, schoolUser?.schoolId, classData, subjectData, employeeData]);
  const fetchMapping = async (reset = false) => {
    if (!selectedClassId || !selectedSectionId) return;
    try {
      setLoading(true);
      const baseRef = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "timetable",
        "items",
        "subjectTeacherMapping"
      );
  
      let q = query(
        baseRef,
        where("classId", "==", selectedClassId),
        where("sectionId", "==", selectedSectionId),
        ...(lastDoc && !reset ? [startAfter(lastDoc)] : []),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMappings(prev => (reset ? docs : [...prev, ...docs]));
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load mappings");
    } finally {
      setLoading(false);
    }
  };  
  const handleClassChange = (classId) => {
    const cls = classData.find(c => c.id === classId);
    setForm({
      ...form,
      classId: cls.id,
      className: cls.name,
      sectionId: "",
      sectionName: "",
    });
    setSections(cls.sections || []);
  };
  const saveMapping = async () => {
    if (!form.classId || !form.sectionId || !form.subjectId || !form.teacherId || !form.periodsPerWeek) {
      toast.error("Please enter all the required credentials!");
      return;
    }
    try {
      setLoading(true);
      await secureAxios.post("/api/school/academics/subject-mapping", {
        branch,
        ...form,
        id: editing?.id || null,
      });
      toast.success(editing ? "Mapping updated" : "Mapping created");
      setOpen(false);
      setEditing(null);
      if (form.classId === selectedClassId && form.sectionId == selectedSectionId) {
        setMappings([]);
        setLastDoc(null);
        fetchMapping(true);
      }else {
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
      toast.error("Failed: " + err.response.data.message);
    }
  };
  const openEdit = (row) => {
    setForm(row);
    const cls = classData.find(c => c.id === row.classId);
    setSections(cls?.sections || []);
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
                Subject – Teacher Mapping
              </h1>
              <p className="text-sm text-(--text-muted)">
                Who teaches which subject for which section
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setForm({
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
              setSections([]);
              setEditing(null);
              setOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={18} />
            Add Mapping
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 max-w-xl gap-3 items-start md:items-end justify-start w-full">
          <div className="flex flex-col flex-1">
            <p className="text-xs font-medium text-(--text-muted)">Class</p>
            <select
              className="input"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
              }}
            >
              <option value="">Select Class</option>
              {classData && classData.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <p className="text-xs font-medium text-(--text-muted)">Section</p>
            <select
              className="input"
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
              }}
            >
              <option value="">Select Section</option>
              {selectedClass?.sections.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <button onClick={() => {
            setMappings([]);
            setLastDoc(null);
            setHasMore(true);
            fetchMapping(true);
          }} className="btn-primary"><Search size={15} /> Load Data</button>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg) border-b border-(--border)">
              <tr className="text-left text-(--text-muted)">
                <th className="px-4 py-3 text-left">Class</th>
                <th className="px-4 py-3 text-left">Subject</th>
                <th className="px-4 py-3 text-left">Teacher</th>
                <th className="px-4 py-3 text-left">Periods / Week</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {mappings && mappings.map(row => (
                <tr key={row.id} className="border-b border-(--border)">
                  <td className="px-4 py-3">
                    {classData.filter(c => c.id == row.classId).map(c => c.name)} {classData.filter(c => c.id == row.classId).map(c =>
                      c.sections.filter(s => s.id == row.sectionId).map(s => s.name)
                     )}
                  </td>
                  <td className="px-4 py-3">{subjects.filter(s => s.id == row.subjectId).map(s => s.name)}</td>
                  <td className="px-4 py-3 capitalize">{teachers.filter(t => t.id == row.teacherId).map(t => t.name)}</td>
                  <td className="px-4 py-3">{(row.periodsPerWeek >= 10 || row.periodsPerWeek == 0) ? row.periodsPerWeek : '0' + row.periodsPerWeek}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="action-btn hover:text-yellow-600"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => openEdit(row)}
                        className="action-btn hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {selectedClassId && !mappings.length && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-(--text-muted)">
                    No mappings created yet
                  </td>
                </tr>
              )}
              {!selectedClassId && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-(--text-muted)">
                    Select a Class to Search Mapping
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-4 py-3 text-center">
                  {hasMore && selectedClassId && (
                    <button
                      onClick={() => fetchMapping(false)}
                      className="text-sm text-(--primary) hover:underline"
                    >
                      Load more
                    </button>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
            <div className="w-full max-w-md bg-(--bg-card) h-full p-5 space-y-4 border-l-2 border-(--primary) overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-(--text)">
                  {editing ? "Edit Teacher Mapping" : "Add Teacher Mapping"}
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
                  {classData.map(cls => (
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
                  {sections.map(sec => (
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
                    const subj = subjects.find(s => s.id === e.target.value);
                    setForm({
                      ...form,
                      subjectId: subj.id,
                      subjectName: subj.name,
                    });
                  }}
                >
                  <option value="">Select Subject</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Teacher">
                <select
                  className="input capitalize"
                  value={form.teacherId}
                  onChange={(e) => {
                    const t = teachers.find(t => t.id === e.target.value);
                    setForm({
                      ...form,
                      teacherId: t.id,
                      teacherName: t.name,
                    });
                  }}
                >
                  <option value="">Select Teacher</option>
                  {teachers.map(t => (
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
                    setForm({ ...form, periodsPerWeek: Number(e.target.value) })
                  }
                />
              </Field>
              <button onClick={saveMapping} className="btn-primary w-full">
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
      <label className="text-sm text-(--text-muted)">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
