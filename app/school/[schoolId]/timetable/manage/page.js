"use client";

import { useEffect, useMemo, useState } from "react";
import {CalendarClock, Save, Search, Plus, Trash2, CheckCircle2, PlusCircle, Layers, BookOpen, User2, AlertTriangle, Book} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import {collection, doc, getDoc, getDocs, query, where} from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import Loading from "@/components/ui/Loading";

export default function EditTimetablePage() {
  const { schoolUser, classData, setLoading, employeeData, subjectData } = useSchool();
  const { branch } = useBranch();
  const [teacherTimetables, setTeacherTimetables] = useState({});
  const [conflict, setConflict] = useState(null);

  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [sections, setSections] = useState([]);
  const [searched, setSearched] = useState(false);
  const [settings, setSettings] = useState(null);
  const [timetable, setTimetable] = useState({});
  const [mappings, setMappings] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sidebar, setSidebar] = useState(null);
  const [DAYS, setDAYS] = useState([]);
  // const [GRID_COLS, setGRID_COLS] = useState('');
  useEffect(() => {
    if(settings) setDAYS(settings.workingDays);
  }, [settings])
  // useEffect(() => {
  //   if(settings) {
  //     setGRID_COLS(`grid-cols-[70px_repeat(${DAYS.length},minmax(140px,1fr))]`);
  //   }
  // }, [DAYS])
  const getSectionName = (cid, sid) => classData?.find(c => c.id === cid)?.sections.find(s => s.id == sid)?.name;
  const PERIODS = useMemo(
    () =>
      Array.from(
        { length: settings?.totalPeriods || 0 },
        (_, i) => i + 1
      ),
    [settings]
  );
  const BREAKS = settings?.breaks || [];
  const normalizeTimetable = (raw) => {
    const normalized = {};
    for (const day of Object.keys(raw || {})) {
      const daySlots = raw[day];
      const slotsArray = Array.isArray(daySlots)
        ? daySlots
        : Object.values(daySlots || {});
      normalized[day] = slotsArray.map(slot => ({
        period: Number(slot.period),
        entries: Array.isArray(slot.entries)
          ? slot.entries
          : Object.values(slot.entries || {}),
      }));
    }
    return normalized;
  };
  const findTeacherConflict = (teacherId, day, period) => {
    const slots = teacherTimetables[teacherId] || [];
    return slots.find(
      s => s.day === day && s.period === period &&
           !(s.classId === classId && s.sectionId === sectionId)
    );
  };
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const ref = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "timetable",
          "items",
          "timetableSettings",
          "global"
        );
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          toast.error("Timetable settings not found");
          return;
        }
        setSettings(snap.data());
      } catch (err) {
        console.error(err);
        toast.error("Failed to load timetable settings");
      } finally {
        setLoading(false);
      }
    };
    if (schoolUser?.schoolId && branch) {
      loadSettings();
    }
  }, [schoolUser?.schoolId, branch]);
  
  useEffect(() => {
    if (!employeeData?.length) return;
    const loadTeacherTimetables = async () => {
      try {
        setLoading(true);
        const base = ["schools", schoolUser.schoolId, "branches", branch];
        const snaps = await Promise.all(
          employeeData.map(t =>
            getDoc(
              doc(
                db,
                ...base,
                "timetable",
                "items",
                "teachers",
                t.id
              )
            )
          )
        );
        const map = {};
        snaps.forEach((snap, i) => {
          map[employeeData[i].id] = snap.exists()
            ? snap.data().slots || []
            : [];
        });
        setTeacherTimetables(map);
      } catch (err) {
        toast.error("Failed to load teacher availability");
      } finally {
        setLoading(false);
      }
    };
    loadTeacherTimetables();
  }, [employeeData, branch]);

  useEffect(() => {
    if(employeeData) setTeachers(employeeData);
    if(subjectData) setSubjects(subjectData);
  }, [employeeData, subjectData])

  const loadData = async () => {
    if (classId == '' || sectionId == '') {
      toast.error('Select Class and Section!');
      return;
    }
    // setGRID_COLS(`grid-cols-[70px_repeat(${DAYS.length},minmax(140px,1fr))]`);
    setLoading(true);
    try {
      const base = ["schools", schoolUser.schoolId, "branches", branch];
      const [
        timetableSnap,
        mappingSnap,
      ] = await Promise.all([
        getDoc(
          doc(
            db,
            ...base,
            "timetable",
            "items",
            "classes",
            `${classId}_${sectionId}`
          )
        ),
        getDocs(
          query(
            collection(
              db,
              ...base,
              "timetable",
              "items",
              "subjectTeacherMapping"
            ),
            where("classId", "==", classId),
            where("sectionId", "==", sectionId)
          )
        ),
      ]);
      setTimetable(
        timetableSnap.exists()
          ? normalizeTimetable(timetableSnap.data().days)
          : Object.fromEntries((settings?.workingDays || []).map((d) => [d, []]))
      );
      setMappings(mappingSnap.docs.map((d) => d.data()));
      setSearched(true);
    } catch {
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const getUsageCount = (subjectId, teacherId) => {
    let count = 0;
    Object.values(timetable).forEach((day) =>
      day.forEach((p) =>
        p.entries?.forEach((e) => {
          if (e.subjectId === subjectId && e.teacherId === teacherId) count++;
        })
      )
    );
    return count;
  };
  const canAssign = (day, period, teacherId) => {
    return !timetable[day]?.some(
      (p) =>
        p.period === period &&
        p.entries?.some((e) => e.teacherId === teacherId)
    );
  };

  const applySingleMapping = (mapping) => {
    const { subjectId, teacherId, periodsPerWeek } = mapping;
    const used = getUsageCount(subjectId, teacherId);
    if (used >= periodsPerWeek) {
      toast.error("Weekly limit reached");
      return;
    }
    if (!sidebar.allDays) {
      const { day, period } = sidebar;
      const otherClassConflict = findTeacherConflict(teacherId, day, period);
      if (otherClassConflict) {
        setConflict({
          teacherId,
          subjectId,
          day,
          period,
          from: {
            classId: otherClassConflict.classId,
            sectionId: otherClassConflict.sectionId,
          },
        });
        return;
      }
      if (!canAssign(day, period, teacherId)) {
        toast.error("Teacher already busy in this slot");
        return;
      }
    }
    setTimetable(prev => {
      const copy = structuredClone(prev);
      if (sidebar.allDays) {
        DAYS.forEach(day => {
          if (!canAssign(day, sidebar.period, teacherId)) return;
          const slot = copy[day].find(p => p.period === sidebar.period);
          if (slot) {
            slot.entries.push({ subjectId, teacherId });
          } else {
            copy[day].push({
              period: sidebar.period,
              entries: [{ subjectId, teacherId }],
            });
          }
        });
      } else {
        const { day, period } = sidebar;
        const slot = copy[day].find(p => p.period === period);
        if (slot) {
          slot.entries.push({ subjectId, teacherId });
        } else {
          copy[day].push({
            period,
            entries: [{ subjectId, teacherId }],
          });
        }
      }
      return copy;
    });
    setSidebar(null);
  };

  // const forceAssign = ({ teacherId, subjectId, day, period }) => {
  //   setTimetable(prev => {
  //     const copy = structuredClone(prev);
  //     const slot = copy[day].find(p => p.period === period);
  //     if (slot) {
  //       slot.entries.push({ subjectId, teacherId });
  //     } else {
  //       copy[day].push({
  //         period,
  //         entries: [{ subjectId, teacherId }],
  //       });
  //     }
  //     return copy;
  //   });
  //   setSidebar(null);
  //   setConflict(null);
  // };

  const forceAssign = ({ teacherId, subjectId, day, period }) => {
    setTimetable(prev => {
      const copy = structuredClone(prev);
      const slot = copy[day].find(p => p.period === period);
      if (slot) {
        slot.entries.push({ subjectId, teacherId });
      } else {
        copy[day].push({
          period,
          entries: [{ subjectId, teacherId }],
        });
      }
      return copy;
    });
    setTeacherTimetables(prev => {
      if (!prev[teacherId]) return prev;
  
      return {
        ...prev,
        [teacherId]: prev[teacherId].filter(
          s => !(s.day === day && s.period === period)
        ),
      };
    });
    setTeacherTimetables(prev => ({
      ...prev,
      [teacherId]: [
        ...(prev[teacherId] || []),
        {
          classId,
          sectionId,
          subjectId,
          day,
          period,
        },
      ],
    }));
    setSidebar(null);
    setConflict(null);
  };

  const removeEntry = (day, period, index) => {
    setTimetable((prev) => ({
      ...prev,
      [day]: prev[day].map((p) =>
        p.period === period
          ? { ...p, entries: p.entries.filter((_, i) => i !== index) }
          : p
      ),
    }));
  };
  const saveTimetable = async () => {
    try {
      setLoading(true);
      await secureAxios.post("/api/school/timetable/save", {
        branch,
        classId,
        sectionId,
        days: timetable,
      });
      toast.success("Timetable saved successfully");
    } catch (err) {
      toast.error((err.response?.data?.message + ' ' + (err.response?.data?.teacherId && teachers.filter(t => t.id == err.response?.data?.teacherId).map(t => t.name))) || "Save failed");
    } finally {
      setLoading(false);
    }
  };
  const classObj = classData && classData.find((c) => c.id === classId);
  return (
    <RequirePermission permission="timetable.edit">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 md:flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <CalendarClock size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Edit Timetable
              </h1>
              <p className="text-sm text-(--text-muted)">
                Optimize class schedules with ease
              </p>
            </div>
          </div>
          {searched && (
            <button className="btn-primary gap-2" onClick={saveTimetable}>
              <Save size={16} /> Save Changes
            </button>
          )}
        </div>
        <div className="grid md:grid-cols-5 items-end gap-3">
          <div className="flex flex-col">
            <p className="text-sm text-(--text-muted) font-medium">Class</p>
            <select
              className="input"
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
                setSearched(false);
              }}
            >
              <option value="">Select Class</option>
              {classData && classData.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-(--text-muted) font-medium">Section</p>
            <select
              value={sectionId}
              className="input"
              onChange={(e) => {
                setSearched(false);
                setSectionId(e.target.value)
              }}
            >
              <option value="">Select Section</option>
              {classObj && classObj.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary gap-2" onClick={() => loadData()}>
           <Search size={16} />Search
          </button>
        </div>

        {searched && (
          <div className="rounded-xl border border-(--border) overflow-x-auto">
            <div className="timetable-grid" style={{ '--days-count': DAYS.length }}>
              <div />
              {DAYS.map(d => (
                <div
                  key={d}
                  className="text-sm font-semibold text-center py-4 border-b-3 border-(--border) bg-(--bg)"
                >
                  {d}
                </div>
              ))}
              {PERIODS.map(p => (
                <>
                  <div
                    key={`p-${p}`}
                    className="text-sm font-semibold text-center py-3 border-r-3 border-(--border) cursor-pointer hover:bg-(--primary-soft)"
                    onClick={() => setSidebar({ period: p, allDays: true })}
                  >
                    P{p}
                    <div className="text-xs text-(--text-muted) opacity-40 flex justify-center items-center gap-0 mt-1">
                      <Plus size={12} /> Add
                    </div>
                  </div>
                  {DAYS.map(d => {
                    const slot = (timetable[d] || []).find(x => x.period === p);
                    return (
                      <div
                        key={`${d}-${p}`}
                        className="min-h-[90px] bg-(--bg-card) border-b-3 border-r-3 border-(--border) p-2 hover:bg-(--primary-soft) cursor-pointer"
                        onClick={() => setSidebar({ day: d, period: p })}
                      >
                        {slot?.entries?.map((e, i) => {
                          const sub = subjects.find(s => s.id === e.subjectId);
                          const t = teachers.find(t => t.id === e.teacherId);
                          return (
                            <div
                              key={i}
                              className="mb-1 bg-(--status-m-bg) rounded px-3 py-2 flex justify-between"
                            >
                              <div>
                                <div className="text-(--text) text-sm font-semibold">{sub?.name}</div>
                                <div className="text-(--status-m-text) text-xs capitalize font-medium">{t?.name}</div>
                              </div>
                              <button
                                className="p-1 hover:text-red-500"
                                onClick={ev => {
                                  ev.stopPropagation();
                                  removeEntry(d, p, i);
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                        <div className="text-xs text-(--text-muted) opacity-40 flex justify-center items-center gap-1">
                          <Plus size={12} /> Add
                        </div>
                      </div>
                    );
                  })}
                  {BREAKS.filter(b => b.afterPeriod === p).map((b, i) => (
                    <div
                      key={`break-${p}-${i}`}
                      className="col-span-full text-center py-2 bg-(--status-o-bg) text-(--status-o-text) text-sm font-semibold border-b-3 border-(--border)"
                    >
                      {b.label} - {b.duration} min
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
        )}

        {sidebar && (
          <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-50">
            <div className="w-full max-w-md bg-(--bg-card) h-full py-4 px-5 space-y-4 overflow-y-auto border-l-3 border-(--primary)">
              <div className="flex justify-between items-center">
                <div className="flex justify-start items-center gap-3">
                  <Layers size={15} />
                  <h3 className="font-semibold">Assign Subject</h3>
                </div>
                <button className="p-1 hover:text-red-500" onClick={() => setSidebar(null)}>✕</button>
              </div>
              {mappings.map((m, i) => {
                const used = getUsageCount(m.subjectId, m.teacherId);
                const max = m.periodsPerWeek;
                const sub = subjects.find(s => s.id === m.subjectId);
                const t = teachers.find(t => t.id === m.teacherId);
                const exhausted = used >= max;

                return (
                  <div
                    key={i}
                    onClick={() => !exhausted && applySingleMapping(m)}
                    className={`
                      relative rounded-lg border border-(--border)
                      bg-(--bg-card)
                      p-4 transition-all
                      ${
                        exhausted
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer hover:border-(--primary) hover:shadow-sm"
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex justify-start items-center gap-3">
                      <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                        <Book size={15} />
                      </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-(--text)">
                              {sub?.name || "Unknown Subject"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-(--text-muted)">
                            <span className="capitalize font-medium">
                              {t?.name || "Unknown Teacher"}
                            </span>
                          </div>
                        </div>
                      </div>
                      {exhausted && (
                        <div className="flex items-center gap-1 bg-(--status-a-bg) text-(--status-a-text) px-2 py-1 rounded-md text-xs font-medium">
                          <AlertTriangle size={14} />
                          Full
                        </div>
                      )}
                    </div>
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-(--text-muted)">
                        <span>Weekly allocation</span>
                        <span className={exhausted ? "text-red-600 font-medium" : ""}>
                          {used} / {max}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                        <div
                          className={`
                            h-full rounded-full transition-all
                            ${exhausted ? "bg-red-500" : "bg-(--primary)"}
                          `}
                          style={{
                            width: `${Math.min((used / max) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          {conflict && (
            <div className="fixed inset-0 bg-black/50 px-5 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="bg-(--bg-card) rounded-xl p-6 w-full max-w-md space-y-4 border border-(--border)">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-(--status-o-bg) text-(--status-o-text)">
                    <AlertTriangle size={17} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Teacher Busy</h3>
                    <p className="text-sm text-(--text-muted)">
                      This teacher is already assigned.
                    </p>
                  </div>
                </div>
                <div className="text-sm space-y-1">
                  <p>
                    <b className="capitalize">{teachers.find(t => t.id === conflict.teacherId)?.name}</b> is busy in
                  </p>
                  <p className="text-(--text-muted)">
                    Class: <span className="font-semibold text-(--text)">{classData.find(c => c.id === conflict.from.classId)?.name} {getSectionName(conflict.from.classId, conflict.from.sectionId)}</span>
                  </p>
                  <p className="text-(--text-muted) capitalize">
                    {conflict.day} • Period {conflict.period}
                  </p>
                </div>
          
                <div className="flex justify-end gap-3 pt-3">
                  <button
                    className="btn-outline"
                    onClick={() => setConflict(null)}
                  >
                    Cancel
                  </button>
          
                  <button
                    className="btn-primary"
                    onClick={() => {
                      setConflict(null);
                      forceAssign(conflict);
                    }}
                  >
                    Override & Replace
                  </button>
                </div>
              </div>
            </div>
          )}
          </>          
        )}
      </div>
    </RequirePermission>
  );
}
