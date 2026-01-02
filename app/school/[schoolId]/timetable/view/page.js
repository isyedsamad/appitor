"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Users,
  User,
  Clock,
  Filter,
  Grid,
  BookOpen,
  AlertCircle,
  Search,
  FileDown,
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { exportClassTimetablePdf } from "@/lib/exports/timetable/timetableClass";

const MODES = [
  { id: "class", label: "Class View", icon: Users },
  { id: "teacher", label: "Teacher View", icon: User },
  { id: "period", label: "Period View", icon: Clock },
];

export default function ViewTimetablePage() {
  const { schoolUser, classData, employeeData, subjectData, setLoading } = useSchool();
  const { branch } = useBranch();
  const [mode, setMode] = useState("class");
  const [timetableSettings, setTimetableSettings] = useState(null);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [day, setDay] = useState("");
  const [period, setPeriod] = useState("");
  const [data, setData] = useState(null);
  const [GRID_COLS, setGRID_COLS] = useState('');

  const getClassName = id => classData.find(c => c.id === id)?.name;
  const selectedClass = classData && classData?.find(c => c.id === classId);
  const getSection = (cid, sid) => classData?.find(c => c.id === cid)?.sections.find(s => s.id == sid)?.name;
  const getTeacherName = id =>
    employeeData.find(t => t.id === id)?.name;
  const getSubjectName = id =>
    subjectData.find(s => s.id === id)?.name;

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
        setTimetableSettings(snap.data());
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

  const DAYS = useMemo(() => {
    return timetableSettings?.workingDays || [];
  }, [timetableSettings]);

  useEffect(() => {
    setGRID_COLS(`grid-cols-[70px_repeat(${DAYS.length},minmax(140px,1fr))]`);
  }, [DAYS])
  
  const PERIODS = useMemo(() => {
    const total = timetableSettings?.totalPeriods || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [timetableSettings]);

  if (!timetableSettings) return null;

  const loadClassView = async () => {
    if (!classId || !sectionId) return;
    setGRID_COLS(`grid-cols-[70px_repeat(${DAYS.length},minmax(140px,1fr))]`);
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
        "classes",
        `${classId}_${sectionId}`
      );
      const snap = await getDoc(ref);
      setData(snap.exists() ? snap.data().days : {});
    } catch(err) {
      toast.error("Failed to load class timetable");
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherView = async () => {
    if (!teacherId) return;
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
        "teachers",
        teacherId
      );
      const snap = await getDoc(ref);
      setData(snap.exists() ? snap.data().slots || [] : []);
    } catch {
      toast.error("Failed to load teacher timetable");
    } finally {
      setLoading(false);
    }
  };
  const loadPeriodView = async () => {
    if (!day || !period) return;
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
        "periodIndex",
        `${day}_${period}`
      );
      const snap = await getDoc(ref);
      setData(snap.exists() ? snap.data() : null);
    } catch(err) {
      console.log(err);
      toast.error("Failed to load period view");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequirePermission permission="timetable.view">
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-(--primary-soft) text-(--primary)">
              <Calendar size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                View Timetable
              </h1>
              <p className="text-sm text-(--text-muted)">
                Class • Teacher • Availability
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  setData(null);
                }}
                className={`flex items-center text-sm gap-2 px-4 py-2 rounded-lg border
                  ${
                    mode === m.id
                      ? "bg-(--primary) border-(--primary) text-white"
                      : "border-(--border) text-(--text-muted)"
                  }`}
              >
                <Icon size={15} />
                {m.label}
              </button>
            );
          })}
        </div>
        {mode === "class" && (
          <div className="flex flex-col md:flex-row gap-3 md:justify-between md:items-end">
            <div className="grid md:grid-cols-4 items-end gap-3">
              <div className="flex flex-col">
                <p className="text-xs text-(--text-muted) font-medium">Class</p>
                <select
                  className="input"
                  value={classId}
                  onChange={e => {
                    setClassId(e.target.value);
                    setSectionId("");
                  }}
                >
                  <option value="">Select Class</option>
                  {classData && classData.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <p className="text-xs text-(--text-muted) font-medium">Section</p>
                <select
                  value={sectionId}
                  className="input"
                  onChange={e => setSectionId(e.target.value)}
                >
                  <option value="">Select Section</option>
                  {selectedClass?.sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary gap-2 md:max-w-40" onClick={() => loadClassView()}>
              <Search size={16} />Load
              </button>
            </div>
            {mode === "class" && data && (
              <button
                onClick={() =>
                  exportClassTimetablePdf({
                    schoolName: schoolUser.schoolName,
                    className: getClassName(classId),
                    sectionName: getSection(classId, sectionId),
                    timetable: data,
                    days: DAYS,
                    periods: PERIODS,
                    getSubjectName,
                    getTeacherName,
                  })
                }
                className="
                  btn-outline flex items-center gap-2
                  hover:bg-(--primary-soft)
                "
              >
                <FileDown size={16} className="text-red-500" />
                Export PDF
              </button>
            )}
          </div>
        )}

        {mode === "teacher" && (
          <div className="grid md:grid-cols-4 items-end gap-3">
            <div className="flex flex-col">
              <p className="text-xs text-(--text-muted) font-medium">Teacher</p>
              <select
                value={teacherId}
                className="input capitalize"
                onChange={e => setTeacherId(e.target.value)}
              >
                <option value="">Select Teacher</option>
                {employeeData && employeeData.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <button className="btn-primary gap-2 md:max-w-40" onClick={() => loadTeacherView()}>
             <Search size={16} />Load
            </button>
          </div>
        )}

        {mode === "period" && (
          <div className="grid md:grid-cols-5 items-end gap-3">
            <div className="flex flex-col">
              <p className="text-xs text-(--text-muted) font-medium">Day</p>
              <select className="input capitalize" value={day} onChange={e => setDay(e.target.value)}>
                <option value="">Select Day</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col">
              <p className="text-xs text-(--text-muted) font-medium">Period</p>
              <select className="input" value={period} onChange={e => setPeriod(e.target.value)}>
                <option value="">Select Period</option>
                {PERIODS.map(p => <option key={p} value={p}>P{p}</option>)}
              </select>
            </div>
            <button className="btn-primary gap-2 md:max-w-40" onClick={() => loadPeriodView()}>
             <Search size={16} />Load
            </button>
          </div>
        )}

        <div>
          {mode === "class" && data && (
            <div className="border border-(--border) rounded-lg bg-(--bg-card) overflow-x-auto">
            <div className={`grid ${GRID_COLS}`}>
              <div />
              {DAYS.map(d => (
                <div key={d} className="text-sm font-semibold text-center py-4">
                  {d}
                </div>
              ))}
              {PERIODS.map(p => (
                <>
                  <div key={p} className="text-sm font-semibold text-center py-3">
                    P{p}
                  </div>
                  {DAYS.map(d => (
                    <div
                    key={d}
                    className="
                      min-h-[80px] border border-(--border) p-2
                      transition-all duration-150
                      hover:bg-(--primary-soft)
                      hover:shadow-sm
                    "
                  >
                      {(data[d] || [])
                        .find(x => x.period === p)
                        ?.entries.map((e, i) => (
                          <div
                            key={i}
                            className="
                              text-xs mb-1 p-1.5 rounded
                              bg-(--status-m-bg)
                              border border-(--border)
                              hover:border-(--status-m-border)
                              transition
                            "
                          >
                            <div className="font-semibold text-sm text-(--status-m-text)">
                              {getSubjectName(e.subjectId)}
                            </div>
                            <div className="text-(--text) font-medium capitalize">
                              {getTeacherName(e.teacherId)}
                            </div>
                          </div>
                        ))}
                    </div>
                  ))}
                </>
              ))}
            </div>
            </div>
          )}

          {mode === "teacher" && Array.isArray(data) && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-(--border) bg-(--bg-card) p-4">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <div className="bg-(--primary-soft) p-1 rounded-sm">
                    <User size={16} className="text-(--primary)" />
                  </div>
                  Weekly Summary
                </h3>
                <div className="space-y-2 text-sm font-medium">
                  <div className="flex justify-between">
                    <span className="text-(--text-muted)">Total Periods</span>
                    <span className="font-semibold">{(data.length >= 10 || data.length == 0) ? data.length : "0" + data.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--text-muted)">Working Days</span>
                    <span>{(new Set(data.map(s => s.day)).size).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-(--text-muted)">Avg / Day</span>
                    <span>{(data.length / DAYS.length).toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-(--border) bg-(--bg-card) p-4 md:col-span-2">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <div className="bg-(--primary-soft) p-1 rounded-sm">
                    <Grid size={16} className="text-(--primary)" />
                  </div>
                  Load Distribution
                </h3>
                <div className="flex gap-2">
                  {DAYS.map(d => {
                    const count = data.filter(x => x.day === d).length;
                    return (
                      <div key={d} className="flex-1 text-center">
                        <div className="text-xs font-semibold">{d}</div>
                        <div
                          className={`mt-1 h-2 rounded-full ${
                            count >= 6
                              ? "bg-red-500"
                              : count >= 4
                              ? "bg-amber-400"
                              : "bg-green-500"
                          }`}
                          title={`${count} periods`}
                        />
                        <div className="text-sm mt-1 font-semibold">{count == 0 ? count : count.toString().padStart(2, '0')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {mode === "teacher" && Array.isArray(data) && (
            <div className="rounded-xl border border-(--border) bg-(--bg-card) p-4 mt-4 overflow-x-auto">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <div className="bg-(--primary-soft) p-1 rounded-sm">
                  <Clock size={16} className="text-(--primary)" />
                </div>
                Weekly Heatmap
              </h3>
              <div className="grid grid-cols-[40px_repeat(6,1fr)] gap-2">
                <div />
                {DAYS.map(d => (
                  <div key={d} className="text-xs text-center font-medium py-2">
                    {d}
                  </div>
                ))}
                {PERIODS.map(p => (
                  <>
                    <div key={p} className="text-xs text-center font-medium py-2">
                      P{p}
                    </div>
                    {DAYS.map(d => {
                      const slot = data.find(x => x.day === d && x.period === p);
                      return (
                        <div
                          key={d}
                          className={`
                            text-sm min-h-10 min-w-27 md:min-w-auto text-white rounded-md font-semibold cursor-pointer transition flex justify-center items-center
                            ${slot ? "bg-red-500/80" : "bg-green-500/70"}
                            hover:scale-[1.05]
                          `}
                          title={
                            slot
                              ? `${getClassName(slot.classId)} ${getSection(slot.classId, slot.sectionId)} • ${getSubjectName(slot.subjectId)}`
                              : "Free"
                          }
                        >
                          <p className="p-2 truncate">
                          {slot
                              ? `${getClassName(slot.classId)} ${getSection(slot.classId, slot.sectionId)} • ${getSubjectName(slot.subjectId)}`
                              : ""}
                          </p>
                        </div>
                      );
                    })}
                  </>
                ))}
              </div>
            </div>
          )}

          {mode === "period" && data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {day} • Period {period}
                  </h3>
                  <p className="text-sm text-(--text-muted)">
                    Faculty availability overview
                  </p>
                </div>
              </div>
              {(() => {
                const busyEntries = data.entries || [];
                const busyTeacherIds = busyEntries.map(e => e.teacherId);
                const freeTeachers = employeeData.filter(
                  t => !busyTeacherIds.includes(t.id)
                );
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-red-500">
                        <AlertCircle size={16} />
                        Busy Teachers ({busyEntries.length == 0 ? busyEntries.length : busyEntries.length.toString().padStart(2, '0')})
                      </h4>
                      {busyEntries.length === 0 && (
                        <div className="text-sm text-(--text-muted)">
                          No teachers occupied in this period
                        </div>
                      )}
                      {busyEntries.map((e, i) => (
                        <div
                          key={i}
                          className="
                            rounded-xl border border-(--status-a-border)
                            bg-(--status-a-bg)
                            p-4 flex justify-between items-center
                          "
                        >
                          <div>
                            <div className="font-semibold capitalize">
                              {getTeacherName(e.teacherId)}
                            </div>
                            <div className="text-sm text-(--status-a-text) font-medium flex items-center gap-1">
                              {getClassName(e.classId)} {getSection(e.classId, e.sectionId)} - {getSubjectName(e.subjectId)}
                            </div>
                          </div>
                          <span className="
                            text-xs px-3 py-1 rounded-full
                            bg-red-500 text-(--status-a-bg)
                          ">
                            Busy
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-green-500">
                        <Clock size={16} />
                        Free Teachers ({freeTeachers.length == 0 ? freeTeachers.length : freeTeachers.length.toString().padStart(2, '0')})
                      </h4>
                      {freeTeachers.length === 0 && (
                        <div className="text-sm text-(--text-muted)">
                          No free teachers available
                        </div>
                      )}
                      {freeTeachers.map(t => (
                        <div
                          key={t.id}
                          className="
                            rounded-xl border border-(--status-p-border)
                            bg-(--status-p-bg)
                            p-4 flex justify-between items-center
                            hover:shadow-sm transition
                          "
                        >
                          <div>
                            <div className="font-semibold capitalize">
                              {t.name}
                            </div>
                            <div className="text-xs text-(--status-p-text) font-medium flex items-center gap-1">
                              {t.employeeId}
                            </div>
                          </div>
                          <span className="
                            text-xs px-3 py-1 rounded-full
                            bg-green-500 text-(--status-p-bg)
                          ">
                            Available
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </RequirePermission>
  );
}
