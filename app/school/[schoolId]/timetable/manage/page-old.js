"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Save,
  Plus,
  Trash2,
  RefreshCcw,
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

/* ---------------- CONSTANTS ---------------- */

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

/* ---------------- PAGE ---------------- */

export default function EditTimetablePage() {
  const { schoolUser, classData, setLoading } = useSchool();
  const { branch } = useBranch();

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [sections, setSections] = useState([]);

  const [timetable, setTimetable] = useState({});
  const [mappings, setMappings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [pendingDrop, setPendingDrop] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);

  /* ---------------- FETCH ---------------- */

  useEffect(() => {
    if (!selectedClass || !selectedSection) return;

    const fetchAll = async () => {
      try {
        setLoading(true);
        const base = ["schools", schoolUser.schoolId, "branches", branch];

        const [
          timetableSnap,
          mappingSnap,
          teacherSnap,
          subjectSnap,
        ] = await Promise.all([
          getDoc(
            doc(
              db,
              ...base,
              "timetable",
              "items",
              "timetable",
              `${selectedClass}_${selectedSection}`
            )
          ),
          getDocs(
            query(
              collection(db, ...base, "timetable", "items", "subjectTeacherMapping"),
              where("classId", "==", selectedClass),
              where("sectionId", "==", selectedSection)
            )
          ),
          getDocs(collection(db, ...base, "employees")),
          getDoc(doc(db, ...base, "subjects", "branch_subjects")),
        ]);

        setTimetable(
          timetableSnap.exists()
            ? timetableSnap.data().days
            : Object.fromEntries(DAYS.map(d => [d, []]))
        );

        setMappings(mappingSnap.docs.map(d => d.data()));
        setTeachers(teacherSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        setSubjects(subjectSnap.exists() ? subjectSnap.data().subjects || [] : []);
      } catch {
        toast.error("Failed to load timetable");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [selectedClass, selectedSection]);

  /* ---------------- SAFE DROP APPLY ---------------- */

  useEffect(() => {
    if (!pendingDrop) return;

    const { day, period, subjectId, teacherId } = pendingDrop;

    const clash = timetable[day]?.some(
      p =>
        p.period === period &&
        p.entries?.some(e => e.teacherId === teacherId)
    );

    if (clash) {
      toast.error("Teacher already assigned in this period");
      setPendingDrop(null);
      return;
    }

    setTimetable(prev => {
      const dayData = [...prev[day]];
      const idx = dayData.findIndex(p => p.period === period);

      if (idx >= 0) {
        dayData[idx] = {
          ...dayData[idx],
          entries: [...dayData[idx].entries, { subjectId, teacherId }],
        };
      } else {
        dayData.push({
          period,
          entries: [{ subjectId, teacherId }],
        });
      }

      return { ...prev, [day]: dayData };
    });

    setPendingDrop(null);
  }, [pendingDrop]);

  /* ---------------- ACTIONS ---------------- */

  const removeEntry = (day, period, index) => {
    setTimetable(prev => ({
      ...prev,
      [day]: prev[day].map(p =>
        p.period === period
          ? { ...p, entries: p.entries.filter((_, i) => i !== index) }
          : p
      ),
    }));
  };

  const replaceEntry = (mapping) => {
    const { day, period, index } = replaceTarget;

    setTimetable(prev => ({
      ...prev,
      [day]: prev[day].map(p =>
        p.period === period
          ? {
              ...p,
              entries: p.entries.map((e, i) =>
                i === index
                  ? { subjectId: mapping.subjectId, teacherId: mapping.teacherId }
                  : e
              ),
            }
          : p
      ),
    }));

    setReplaceTarget(null);
  };

  const saveTimetable = async () => {
    try {
      setLoading(true);
      await secureAxios.post("/api/school/timetable/save", {
        branch,
        classId: selectedClass,
        sectionId: selectedSection,
        days: timetable,
      });
      toast.success("Timetable saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setLoading(false);
    }
  };

  const classObj = classData.find(c => c.id === selectedClass);
  const sectionName =
    classObj?.sections.find(s => s.id === selectedSection)?.name;

  /* ---------------- UI ---------------- */

  return (
    <RequirePermission permission="timetable.edit">
      <div className="space-y-4">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <CalendarClock className="text-[var(--primary)]" />
            <div>
              <h1 className="text-lg font-semibold">Edit Timetable</h1>
              <p className="text-xs text-[var(--text-muted)]">
                {classObj?.name || "Select Class"}
                {sectionName && ` • ${sectionName}`}
              </p>
            </div>
          </div>

          <button onClick={saveTimetable} className="btn-primary gap-2">
            <Save size={16} /> Save Timetable
          </button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <select
            className="input"
            onChange={e => {
              setSelectedClass(e.target.value);
              const cls = classData.find(c => c.id === e.target.value);
              setSections(cls?.sections || []);
              setSelectedSection("");
            }}
          >
            <option value="">Select Class</option>
            {classData.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            className="input"
            disabled={!sections.length}
            onChange={e => setSelectedSection(e.target.value)}
          >
            <option value="">Select Section</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {selectedClass && selectedSection && (
          <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-4">
            <div className="space-y-2">
              {mappings.map((m, i) => {
                const teacher = teachers.find(t => t.id === m.teacherId);
                const subject = subjects.find(s => s.id === m.subjectId);
                return (
                  <div
                    key={i}
                    draggable
                    onDragStart={e =>
                      e.dataTransfer.setData("text/plain", JSON.stringify(m))
                    }
                    onClick={() => replaceTarget && replaceEntry(m)}
                    className={`
                      group relative rounded-xl border cursor-pointer
                      bg-(--bg-card)
                      transition-all duration-200
                      ${
                        replaceTarget
                          ? "border-(--primary) ring-1 ring-(--primary-soft)"
                          : "border-(--border) hover:border-(--primary)"
                      }
                      hover:shadow-md
                    `}
                  >
                    <div className="absolute left-0 top-0 h-full w-1 rounded-l-xl bg-(--primary-soft)" />
                    <div className="flex items-start gap-3 p-3 pl-4">
                      <div className="mt-1 text-(--text-muted) opacity-60 group-hover:opacity-100">
                        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                          <circle cx="2" cy="2" r="1.5" />
                          <circle cx="2" cy="8" r="1.5" />
                          <circle cx="2" cy="14" r="1.5" />
                          <circle cx="8" cy="2" r="1.5" />
                          <circle cx="8" cy="8" r="1.5" />
                          <circle cx="8" cy="14" r="1.5" />
                        </svg>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-sm font-semibold text-(--text)">
                          {subject?.name || "Unknown Subject"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                          <div className="h-5 w-5 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center font-medium uppercase">
                            {teacher?.name?.[0] || "T"}
                          </div>
                          <span className="capitalize">
                            {teacher?.name || "Unknown Teacher"}
                          </span>
                        </div>
                      </div>
                      {replaceTarget && (
                        <div className="text-xs font-medium text-(--primary)">
                          Replace
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg border border-(--border) overflow-x-auto">
              <div className="grid grid-cols-[60px_repeat(6,minmax(140px,1fr))]">

                <div />
                {DAYS.map(d => (
                  <div key={d} className="text-xs font-semibold text-center py-2 border-b-3 border-(--border)">
                    {d}
                  </div>
                ))}
                {PERIODS.map(period => (
                  <>
                    <div className="text-sm font-semibold text-center py-3 border-r-3 border-(--border)">
                      {period}
                    </div>
                    {DAYS.map(day => {
                      const slot = timetable[day]?.find(p => p.period === period);
                      return (
                        <div
                          key={day}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e =>
                            setPendingDrop({
                              ...JSON.parse(e.dataTransfer.getData("text/plain")),
                              day,
                              period,
                            })
                          }
                          className="min-h-[88px] p-2 border-b-3 border-r-3 border-(--border) group hover:bg-(--primary-soft)"
                        >
                          {slot?.entries?.map((e, idx) => {
                            const teacher = teachers.find(t => t.id === e.teacherId);
                            const subject = subjects.find(s => s.id === e.subjectId);

                            return (
                              <div
                                key={idx}
                                className="mb-1 rounded-md bg-(--bg-card) px-2 py-1 text-xs relative"
                              >
                                <div className="font-medium">{subject?.name}</div>
                                <div className="text-(--text-muted) capitalize">
                                  {teacher?.name}
                                </div>

                                <div className="absolute right-1 top-1 hidden group-hover:flex gap-1">
                                  <button
                                    onClick={() =>
                                      setReplaceTarget({ day, period, index: idx })
                                    }
                                  >
                                    <RefreshCcw size={12} />
                                  </button>
                                  <button onClick={() => removeEntry(day, period, idx)}>
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {!slot && (
                            <div className="text-xs text-(--text-muted) opacity-0 group-hover:opacity-100 flex items-center justify-center h-full">
                              <Plus size={12} /> Add
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </RequirePermission>
  );
}
