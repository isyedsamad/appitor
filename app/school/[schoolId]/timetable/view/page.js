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
  CalendarDays,
  Eye,
  Download,
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { exportClassTimetablePdf } from "@/lib/exports/timetable/timetableClass";
import { exportTeacherTimetablePdf } from "@/lib/exports/timetable/timetableTeacher";
import { exportPeriodTimetablePdf } from "@/lib/exports/timetable/timetablePeriod";

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

  const [liveInfo, setLiveInfo] = useState({ day: "", period: null, isActive: false });
  const [universalSearch, setUniversalSearch] = useState("");
  const [selectedCell, setSelectedCell] = useState(null);
  const [hoveredEntity, setHoveredEntity] = useState({ type: null, id: null });

  const getDayName = (date) => new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);

  const getClassName = id => classData.find(c => c.id === id)?.name;
  const selectedClass = classData && classData?.find(c => c.id === classId);
  const getSection = (cid, sid) => classData?.find(c => c.id === cid)?.sections.find(s => s.id == sid)?.name;
  const getTeacherName = id => employeeData.find(t => t.uid === id)?.name;
  const getSubjectName = id => subjectData.find(s => s.id === id)?.name;

  useEffect(() => {
    const updateLiveStatus = () => {
      if (!timetableSettings || !timetableSettings.startTime) return;

      const now = new Date();
      const currentDay = getDayName(now).toUpperCase().substring(0, 3);

      const isWorkingDay = (timetableSettings.workingDays || []).some(d =>
        d.toUpperCase().substring(0, 3) === currentDay
      );

      if (!isWorkingDay) {
        setLiveInfo({ day: getDayName(now), period: null, isActive: false });
        return;
      }

      const [sHour, sMin] = timetableSettings.startTime.split(':').map(Number);
      const schoolStart = new Date(now);
      schoolStart.setHours(sHour, sMin, 0, 0);

      const diffMinutes = Math.floor((now - schoolStart) / (1000 * 60));
      if (diffMinutes < 0) {
        setLiveInfo({ day: getDayName(now), period: null, isActive: false, msg: "School hasn't started" });
        return;
      }

      const periodDur = timetableSettings.periodDuration || 40;
      const breaks = timetableSettings.breaks || [];

      let currentMark = 0;
      let foundPeriod = null;

      for (let p = 1; p <= (timetableSettings.totalPeriods || 0); p++) {
        const pStart = currentMark;
        const pEnd = currentMark + periodDur;

        if (diffMinutes >= pStart && diffMinutes < pEnd) {
          foundPeriod = p;
          break;
        }

        currentMark = pEnd;

        const breakAfter = breaks.find(b => Number(b.afterPeriod) === p);
        if (breakAfter) {
          const bStart = currentMark;
          const bEnd = currentMark + Number(breakAfter.duration);
          if (diffMinutes >= bStart && diffMinutes < bEnd) {
            setLiveInfo({ day: getDayName(now), period: `Break (${breakAfter.label})`, isActive: true });
            return;
          }
          currentMark = bEnd;
        }
      }

      if (foundPeriod) {
        setLiveInfo({ day: getDayName(now), period: foundPeriod, isActive: true });
      } else {
        setLiveInfo({ day: getDayName(now), period: null, isActive: false, msg: "School closed" });
      }
    };

    updateLiveStatus();
    const interval = setInterval(updateLiveStatus, 60000);
    return () => clearInterval(interval);
  }, [timetableSettings]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "timetable", "items", "timetableSettings", "global");
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

  const DAYS = useMemo(() => timetableSettings?.workingDays || [], [timetableSettings]);

  useEffect(() => {
    setGRID_COLS(`grid-cols-[70px_repeat(${DAYS.length},minmax(140px,1fr))]`);
  }, [DAYS]);

  const BREAKS = timetableSettings?.breaks || [];
  const PERIODS = useMemo(() => {
    const total = timetableSettings?.totalPeriods || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [timetableSettings]);

  const searchResults = useMemo(() => {
    if (!universalSearch || universalSearch.length < 2) return null;
    const query = universalSearch.toLowerCase();

    return {
      teachers: employeeData.filter(t => t.name?.toLowerCase().includes(query) || t.employeeId?.toLowerCase().includes(query)).slice(0, 5),
      classes: classData.filter(c => c.name?.toLowerCase().includes(query)).slice(0, 5),
      subjects: subjectData.filter(s => s.name?.toLowerCase().includes(query)).slice(0, 5)
    };
  }, [universalSearch, employeeData, classData, subjectData]);

  if (!timetableSettings) return null;

  const loadClassView = async () => {
    if (!classId || !sectionId) return;
    try {
      setLoading(true);
      const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "timetable", "items", "classes", `${classId}_${sectionId}`);
      const snap = await getDoc(ref);
      setData(snap.exists() ? snap.data().days : {});
    } catch (err) {
      toast.error("Failed to load class timetable");
    } finally {
      setLoading(false);
    }
  };

  const loadTeacherView = async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "timetable", "items", "teachers", teacherId);
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
      const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "timetable", "items", "periodIndex", `${day}_${period}`);
      const snap = await getDoc(ref);
      setData(snap.exists() ? snap.data() : null);
    } catch (err) {
      console.log(err);
      toast.error("Failed to load period view");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequirePermission permission="timetable.view.view">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group">
          <div className="flex items-start gap-3 relative z-10">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <Eye size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-(--text)">View Timetable</h1>
                {liveInfo.isActive && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 text-xs font-semibold uppercase tracking-wider border border-green-500/20">
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-(--text-muted)">
                {liveInfo.isActive
                  ? `Currently ${liveInfo.day} Period ${liveInfo.period}`
                  : liveInfo.msg || `${liveInfo.day || '---'} • ${liveInfo.msg || 'School Closed'}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 w-full md:w-auto px-2">
            <div className="relative w-full md:w-72">
              {/* <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={16} /> */}
              {/* <input
                type="text"
                placeholder="Universal Search..."
                value={universalSearch}
                onChange={(e) => setUniversalSearch(e.target.value)}
                className="input pl-10 h-10 w-full bg-(--bg) border-(--border) focus:ring-2 focus:ring-(--primary) transition-all"
              /> */}
              {searchResults && (
                <div className="absolute top-full left-0 w-full mt-2 bg-(--bg-card) border border-(--border) rounded-xl shadow-2xl z-50 p-2 space-y-3 max-h-96 overflow-y-auto">
                  {searchResults.teachers.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-semibold text-(--text-muted) uppercase tracking-widest">Teachers</p>
                      {searchResults.teachers.map(t => (
                        <button key={t.uid} onClick={() => { setMode("teacher"); setTeacherId(t.uid); setUniversalSearch(""); loadTeacherView(); }} className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-(--primary-soft) hover:text-(--primary) flex items-center justify-between transition-colors">
                          <span className="capitalize">{t.name}</span>
                          <User size={12} className="opacity-40" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchResults.classes.length > 0 && (
                    <div>
                      <p className="px-2 py-1 text-[10px] font-semibold text-(--text-muted) uppercase tracking-widest">Classes</p>
                      {searchResults.classes.map(c => (
                        <div key={c.id} className="space-y-1">
                          {c.sections.map(s => (
                            <button key={s.id} onClick={() => { setMode("class"); setClassId(c.id); setSectionId(s.id); setUniversalSearch(""); loadClassView(); }} className="w-full text-left px-3 py-1.5 text-xs rounded-lg hover:bg-(--primary-soft) hover:text-(--primary) flex items-center justify-between transition-colors">
                              <span>{c.name} - {s.name}</span>
                              <Users size={12} className="opacity-40" />
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="absolute right-0 top-0 h-full w-32 bg-gradient-to-l from-(--primary-soft) to-transparent opacity-10 pointer-events-none" />
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
                className={`flex items-center text-sm font-normal gap-2 px-5 py-2 rounded-md border transition-all duration-200
                  ${mode === m.id
                    ? "bg-(--primary) border-(--primary) text-white shadow-md shadow-(--primary-soft)"
                    : "bg-(--bg-card) border-(--border) text-(--text-muted) hover:border-(--primary) hover:text-(--primary)"
                  }`}
              >
                <Icon size={14} />
                {m.label}
              </button>
            );
          })}
        </div>

        {mode === "class" && (
          <div className="flex flex-col md:flex-row gap-3 md:justify-between md:items-end">
            <div className="grid md:grid-cols-4 items-end gap-3 flex-1">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Class</p>
                <select
                  className="input h-10"
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
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Section</p>
                <select
                  value={sectionId}
                  className="input h-10"
                  onChange={e => setSectionId(e.target.value)}
                >
                  <option value="">Select Section</option>
                  {selectedClass?.sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary h-10 gap-2 md:max-w-40" onClick={() => loadClassView()}>
                <Search size={16} />Load Matrix
              </button>
            </div>
            {data && (
              <button
                onClick={() =>
                  exportClassTimetablePdf({
                    schoolName: schoolUser.schoolName,
                    className: getClassName(classId),
                    sectionName: getSection(classId, sectionId),
                    timetable: data,
                    days: DAYS,
                    breaks: BREAKS,
                    periods: PERIODS,
                    getSubjectName,
                    getTeacherName,
                  })
                }
                className="btn-outline h-10 flex items-center justify-center gap-2 px-6 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <Download size={16} color="green" />
                Export Timetable
              </button>
            )}
          </div>
        )}

        {mode === "teacher" && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="grid md:grid-cols-4 items-end gap-3 flex-1">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Faculty Member</p>
                <select
                  value={teacherId}
                  className="input h-10 capitalize"
                  onChange={e => setTeacherId(e.target.value)}
                >
                  <option value="">Select Teacher</option>
                  {employeeData && employeeData.map(t => (
                    <option key={t.uid} value={t.uid}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button className="btn-primary h-10 gap-2 md:max-w-48" onClick={() => loadTeacherView()}>
                <Search size={16} />View Schedule
              </button>
            </div>
            {Array.isArray(data) && mode === "teacher" && (
              <button
                onClick={() =>
                  exportTeacherTimetablePdf({
                    schoolName: schoolUser.schoolName,
                    teacherName: getTeacherName(teacherId),
                    employeeId: employeeData.find(t => t.uid === teacherId)?.employeeId,
                    slots: data,
                    days: DAYS,
                    periods: PERIODS,
                    breaks: BREAKS,
                    getClassName,
                    getSection,
                    getSubjectName,
                  })
                }
                className="btn-outline h-10 flex items-center justify-center gap-2 px-6 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <Download size={16} color="green" />
                Export Timetable
              </button>
            )}
          </div>
        )}

        {mode === "period" && (
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div className="grid md:grid-cols-4 items-end gap-3 flex-1">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Day</p>
                <select className="input h-10 capitalize" value={day} onChange={e => setDay(e.target.value)}>
                  <option value="">Select Day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Period Slot</p>
                <select className="input h-10" value={period} onChange={e => setPeriod(e.target.value)}>
                  <option value="">Select Period</option>
                  {PERIODS.map(p => <option key={p} value={p}>P{p}</option>)}
                </select>
              </div>
              <button className="btn-primary h-10 gap-2 md:max-w-48" onClick={() => loadPeriodView()}>
                <Search size={16} />Analyze Slot
              </button>
            </div>
            {data && mode === "period" && (
              <button
                onClick={() => {
                  const busyEntries = data.entries || [];
                  const busyTeacherIds = busyEntries.map(e => e.teacherId);
                  const freeTeachers = employeeData.filter(t => !busyTeacherIds.includes(t.uid));
                  exportPeriodTimetablePdf({
                    schoolName: schoolUser.schoolName,
                    day,
                    period,
                    busyTeachers: busyEntries,
                    freeTeachers,
                    getTeacherName,
                    getClassName,
                    getSection,
                    getSubjectName,
                  });
                }}
                className="btn-outline h-10 flex items-center justify-center gap-2 px-6 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
              >
                <Download size={16} color="green" />
                Export Analysis
              </button>
            )}
          </div>
        )}

        <div className="min-h-[400px]">
          {mode === "class" && data && (
            <div className="bg-(--bg-card) border border-(--border) rounded-lg shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="timetable-grid min-w-[1000px]" style={{ '--days-count': DAYS.length }}>
                  <div className="bg-(--bg-soft) p-3" />
                  {DAYS.map(d => (
                    <div key={d} className="text-[10px] font-semibold text-center py-3 bg-(--bg-soft) text-(--text-muted) uppercase tracking-widest border-l border-(--border)">
                      {d}
                    </div>
                  ))}
                  {PERIODS.map(p => (
                    <div key={`p-row-${p}`} className="contents">
                      <div className="text-[10px] font-semibold text-center py-6 bg-(--bg-soft) text-(--text-muted) flex items-center justify-center border-t border-(--border)">
                        P{p}
                      </div>
                      {DAYS.map(d => (
                        <div
                          key={`${d}-${p}`}
                          className="min-h-[80px] border-t border-l border-(--border) p-2 transition-all duration-150 hover:bg-(--primary-soft) hover:bg-opacity-20 group"
                        >
                          {(data[d] || [])
                            .find(x => x.period === p)
                            ?.entries.map((e, i) => (
                              <div
                                key={i}
                                className="mb-1 bg-(--status-m-bg) rounded px-3 py-2 flex justify-between shadow-sm border border-(--border) group-hover:border-(--status-m-border) transition-all"
                              >
                                <div>
                                  <div className="text-(--text) text-sm font-semibold">{getSubjectName(e.subjectId)}</div>
                                  <div className="text-(--status-m-text) text-xs capitalize font-medium">{getTeacherName(e.teacherId)}</div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                      {BREAKS.filter(b => b.afterPeriod === p).map((b, i) => (
                        <div
                          key={`break-${p}-${i}`}
                          className="col-span-full text-center py-3 bg-(--status-o-bg) bg-opacity-10 text-(--status-o-text) text-[11px] font-semibold uppercase tracking-[0.2em] border-t border-(--border) flex items-center justify-center gap-2"
                        >
                          <Coffee size={14} /> {b.label} • {b.duration} Minutes
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === "teacher" && Array.isArray(data) && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-(--border) bg-(--bg-card) p-3.5 shadow-sm relative overflow-hidden group hover:border-(--primary) transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted) opacity-70">Weekly Load</p>
                    <div className="p-1.5 rounded-lg bg-(--primary-soft) text-(--primary)">
                      <Zap size={14} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold text-(--text)">{data.length}</span>
                    <span className="text-xs font-medium text-(--text-muted)">Periods</span>
                  </div>
                  <div className="mt-3 h-1 w-full bg-(--bg) rounded-full overflow-hidden border border-(--border)">
                    <div className="h-full bg-(--primary) transition-all duration-700" style={{ width: `${Math.min((data.length / 30) * 100, 100)}%` }} />
                  </div>
                </div>

                <div className="rounded-xl border border-(--border) bg-(--bg-card) p-3.5 shadow-sm relative overflow-hidden group hover:border-(--primary) transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted) opacity-70">Active Days</p>
                    <div className="p-1.5 rounded-lg bg-(--primary-soft) text-(--primary)">
                      <CalendarDays size={14} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold text-(--text)">{new Set(data.map(s => s.day)).size}</span>
                    <span className="text-xs font-medium text-(--text-muted)">Working</span>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {DAYS.map(d => (
                      <div key={d} className={`h-1 flex-1 rounded-full ${data.some(s => s.day === d) ? 'bg-(--primary)' : 'bg-(--bg) border border-(--border)'}`} />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-(--border) bg-(--bg-card) p-3.5 shadow-sm relative overflow-hidden group hover:border-(--primary) transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted) opacity-70">Subject Focus</p>
                    <div className="p-1.5 rounded-lg bg-(--primary-soft) text-(--primary)">
                      <BookOpen size={14} />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-semibold text-(--text)">{new Set(data.map(s => s.subjectId)).size}</span>
                    <span className="text-xs font-medium text-(--text-muted)">Courses</span>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {Array.from(new Set(data.map(s => s.subjectId))).slice(0, 3).map(sid => (
                      <span key={sid} className="px-1.5 py-0.5 rounded-md bg-(--bg) border border-(--border) text-[9px] font-semibold text-(--text-muted) uppercase">
                        {getSubjectName(sid)?.substring(0, 6)}..
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-(--border) bg-(--bg-card) p-3.5 shadow-sm">
                <h3 className="text-[10px] font-semibold uppercase tracking-widest text-(--text-muted) mb-3 flex items-center gap-2">
                  <Grid size={14} className="text-(--primary)" /> Load Distribution
                </h3>
                <div className="flex gap-2">
                  {DAYS.map(d => {
                    const count = data.filter(x => x.day === d).length;
                    return (
                      <div key={d} className="flex-1 space-y-1.5 text-center">
                        <div className="text-[9px] font-semibold text-(--text-muted) uppercase">{d.substring(0, 3)}</div>
                        <div className="h-2 rounded-full bg-(--bg) overflow-hidden border border-(--border) relative">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${count > 6 ? 'bg-red-500' : count > 4 ? 'bg-amber-400' : 'bg-green-500'}`}
                            style={{ width: `${Math.min((count / 8) * 100, 100)}%` }}
                          />
                        </div>
                        <div className="text-[10px] font-semibold text-(--text)">{count}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-(--border) bg-(--bg-card) shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[60px_repeat(6,1fr)] min-w-[1000px]">
                    <div className="bg-(--bg-soft) p-3" />
                    {DAYS.map(d => (
                      <div key={d} className="text-[9px] font-semibold text-center py-3 bg-(--bg-soft) text-(--text-muted) uppercase tracking-widest border-l border-(--border)">
                        {d}
                      </div>
                    ))}
                    {PERIODS.map(p => (
                      <div key={`tp-${p}`} className="contents">
                        <div className="text-[10px] font-semibold text-center py-4 bg-(--bg-soft) text-(--text-muted) flex items-center justify-center border-t border-(--border)">
                          P{p}
                        </div>
                        {DAYS.map(d => {
                          const slot = data.find(x => x.day === d && x.period === p);
                          return (
                            <div key={`${d}-${p}`} className={`border-t border-l border-(--border) p-1.5 min-h-[70px] transition-all hover:bg-(--primary-soft) hover:bg-opacity-10 group`}>
                              {slot ? (
                                <div className="mb-1 bg-(--status-m-bg) rounded px-3 py-2 flex flex-col justify-center shadow-sm border border-(--border) group-hover:border-(--status-m-border) transition-all">
                                  <div className="text-(--text) text-sm font-semibold uppercase truncate">{getSubjectName(slot.subjectId)}</div>
                                  <div className="text-(--status-m-text) text-xs capitalize font-medium opacity-90 truncate">
                                    {getClassName(slot.classId)} {getSection(slot.classId, slot.sectionId)}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <div className="text-[8px] font-semibold text-(--text-muted) opacity-20 uppercase tracking-widest">Free</div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {mode === "period" && data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-(--bg-card) border border-(--border) rounded-xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-(--primary-soft) text-(--primary)">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-(--text)">{day} • Slot P{period}</h3>
                    <p className="text-[11px] font-medium text-(--text-muted)">Real-time faculty deployment analysis</p>
                  </div>
                </div>
              </div>

              {(() => {
                const busyEntries = data.entries || [];
                const busyTeacherIds = busyEntries.map(e => e.teacherId);
                const freeTeachers = employeeData.filter(t => !busyTeacherIds.includes(t.uid));

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2">
                        <h4 className="text-xs font-semibold uppercase text-red-500 flex items-center gap-2">
                          <AlertCircle size={14} /> Engaged Faculty ({busyEntries.length})
                        </h4>
                      </div>
                      <div className="grid gap-2">
                        {busyEntries.map((e, i) => (
                          <div key={i} className="bg-(--bg-card) border border-(--border) rounded-lg p-3 flex items-center justify-between shadow-sm border-l-4 border-l-red-500">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded uppercase bg-(--status-a-bg) text-(--status-a-text) flex items-center justify-center font-semibold text-xs">{getTeacherName(e.teacherId)?.charAt(0)}</div>
                              <div>
                                <p className="font-semibold text-(--text) text-sm capitalize">{getTeacherName(e.teacherId)}</p>
                                <p className="text-[10px] font-semibold text-(--text-muted)">{getClassName(e.classId)} {getSection(e.classId, e.sectionId)} • {getSubjectName(e.subjectId)}</p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-(--status-a-bg) text-(--status-a-text) text-[9px] font-semibold uppercase border border-(--status-a-border) italic">Occupied</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-2">
                        <h4 className="text-xs font-semibold uppercase text-green-600 flex items-center gap-2">
                          <Zap size={14} /> Substitution Assist ({freeTeachers.length})
                        </h4>
                      </div>
                      <div className="grid gap-2">
                        {freeTeachers.map(t => (
                          <div key={t.uid} className="bg-(--bg-card) border border-(--border) rounded-lg p-3 flex items-center justify-between shadow-sm hover:border-(--primary) transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded uppercase bg-(--status-p-bg) text-(--status-p-text) flex items-center justify-center font-semibold text-xs group-hover:bg-(--primary-soft) group-hover:text-(--primary) transition-colors">{t.name?.charAt(0)}</div>
                              <div>
                                <p className="font-semibold text-(--text) text-sm capitalize">{t.name}</p>
                                <p className="text-[10px] font-semibold text-(--text-muted)">Available • {t.employeeId}</p>
                              </div>
                            </div>
                            {/* <button className="px-3 py-1 rounded-md bg-green-500/10 text-green-600 text-[9px] font-semibold uppercase hover:bg-green-500 hover:text-white transition-all">Substitute</button> */}
                          </div>
                        ))}
                      </div>
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

function Coffee({ size }) {
  return <BookOpen size={size} />;
}
