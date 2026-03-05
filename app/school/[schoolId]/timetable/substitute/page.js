"use client";

import { useEffect, useState, useMemo } from "react";
import {
    Calendar,
    Users,
    User,
    Clock,
    Search,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Plus,
    Trash2,
    ChevronRight,
    Sparkles,
    Save,
    X,
    Info,
    Zap,
    BookOpen,
    CalendarClock,
    PlusCircle,
    Layers,
    Bell,
    BellOff,
    Send
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, query, where } from "firebase/firestore";
import { hasPermission } from "@/lib/school/permissionUtils";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export default function SubstitutionPage() {
    const { schoolUser, classData, employeeData, subjectData, setLoading, currentSession } = useSchool();
    const { branch, branchInfo } = useBranch();
    const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
    const canManage = hasPermission(schoolUser, "timetable.substitute.manage", false, currentPlan);
    const { theme } = useTheme();

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [classId, setClassId] = useState("");
    const [sectionId, setSectionId] = useState("");
    const [timetableSettings, setTimetableSettings] = useState(null);
    const [searched, setSearched] = useState(false);

    const [staticData, setStaticData] = useState({});
    const [localSubstitutions, setLocalSubstitutions] = useState([]);

    const [sidebarSlot, setSidebarSlot] = useState(null);
    const [allDateSubstitutions, setAllDateSubstitutions] = useState([]);
    const [staticBusyTeachers, setStaticBusyTeachers] = useState([]);

    // Notification State
    const [pendingSub, setPendingSub] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            try {
                setLoading(true);
                const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "timetable", "items", "timetableSettings", "global");
                const snap = await getDoc(ref);
                if (snap.exists()) setTimetableSettings(snap.data());
            } catch (err) {
                toast.error("Failed to load settings");
            } finally {
                setLoading(false);
            }
        };
        if (schoolUser?.schoolId && branch) loadSettings();
    }, [schoolUser?.schoolId, branch]);

    const dayOfWeek = useMemo(() => {
        if (!selectedDate) return "";
        return new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    }, [selectedDate]);

    const PERIODS = useMemo(() => {
        return Array.from({ length: timetableSettings?.totalPeriods || 0 }, (_, i) => i + 1);
    }, [timetableSettings]);

    const BREAKS = timetableSettings?.breaks || [];

    const loadData = async () => {
        if (!classId || !sectionId || !selectedDate) {
            toast.warning("Select all filters first");
            return;
        }
        try {
            setLoading(true);
            const base = ["schools", schoolUser.schoolId, "branches", branch, "timetable", "items"];

            const staticRef = doc(db, ...base, "classes", `${classId}_${sectionId}`);
            const staticSnap = await getDoc(staticRef);
            setStaticData(staticSnap.exists() ? staticSnap.data().days : {});

            const subRef = doc(db, ...base, "substitutions", `${classId}_${sectionId}_${selectedDate}`);
            const subSnap = await getDoc(subRef);
            setLocalSubstitutions(subSnap.exists() ? subSnap.data().substitutions || [] : []);

            const allSubRef = collection(db, ...base, "substitutions");
            const allSubQuery = query(allSubRef, where("date", "==", selectedDate));
            const allSubSnap = await getDocs(allSubQuery);
            const allSubs = allSubSnap.docs.map(d => d.data());
            setAllDateSubstitutions(allSubs);

            setSearched(true);
        } catch (err) {
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableTeachers = async (period) => {
        try {
            setLoading(true);
            const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "timetable", "items", "periodIndex", `${dayOfWeek}_${period}`);
            const snap = await getDoc(ref);
            const busy = snap.exists() ? snap.data().entries?.map(e => e.teacherId) || [] : [];
            setStaticBusyTeachers(busy);
        } catch {
            toast.error("Conflict check failed");
        } finally {
            setLoading(false);
        }
    };

    const saveSubstitutions = async (updatedSubs, notify = false) => {
        const subsToSave = updatedSubs || localSubstitutions;
        try {
            setLoading(true);
            await secureAxios.post("/api/school/timetable/substitute/save", {
                branch,
                classId,
                sectionId,
                date: selectedDate,
                day: dayOfWeek,
                substitutions: subsToSave,
                sessionId: currentSession,
                schoolName: schoolUser.schoolName,
                shouldNotify: notify
            });
            toast.success(notify ? "Saved & Notification Sent" : "Substitutions updated");
        } catch (err) {
            toast.error("Save failed");
        } finally {
            setLoading(false);
        }
    };

    const getAvailableTeachers = useMemo(() => {
        if (!sidebarSlot) return [];
        const busyStatic = new Set(staticBusyTeachers);
        const busySub = new Set();
        allDateSubstitutions.forEach(doc => {
            doc.substitutions?.forEach(s => {
                if (s.period === sidebarSlot.period) busySub.add(s.substituteTeacherId);
            });
        });

        return employeeData
            .filter(emp => emp.role.toLowerCase() === "teacher")
            .map(emp => ({
                ...emp,
                isBusy: busyStatic.has(emp.uid) || busySub.has(emp.uid)
            }))
            .sort((a, b) => (a.isBusy === b.isBusy ? 0 : a.isBusy ? 1 : -1));
    }, [sidebarSlot, employeeData, staticBusyTeachers, allDateSubstitutions]);

    const handleOpenAssistant = (p, staticSlot) => {
        setSidebarSlot({
            period: p,
            originalTeacherId: staticSlot?.entries?.[0]?.teacherId || null,
            originalSubjectId: staticSlot?.entries?.[0]?.subjectId || null
        });
        loadAvailableTeachers(p);
    };

    const addSubstitution = (teacherId) => {
        const newSub = {
            period: sidebarSlot.period,
            originalTeacherId: sidebarSlot.originalTeacherId,
            substituteTeacherId: teacherId,
            subjectId: sidebarSlot.originalSubjectId,
            note: ""
        };

        setPendingSub(newSub);
        setSidebarSlot(null);
    };

    const handleFinalSave = async (notify) => {
        if (!pendingSub) return;
        const updated = [...localSubstitutions.filter(x => x.period !== pendingSub.period), pendingSub];
        setLocalSubstitutions(updated);
        setPendingSub(null);
        await saveSubstitutions(updated, notify);
    };

    const removeSubstitution = async (period) => {
        const updated = localSubstitutions.filter(x => x.period !== period);
        setLocalSubstitutions(updated);
        await saveSubstitutions(updated, false);
    };

    const classObj = classData?.find((c) => c.id === classId);

    return (
        <RequirePermission permission="timetable.substitute.view">
            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                            <CalendarClock size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">
                                Substitution Manager
                            </h1>
                            <p className="text-xs text-(--text-muted) font-medium">
                                Manage date-specific faculty overrides
                            </p>
                        </div>
                    </div>
                    {searched && (
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1.5 rounded-md bg-(--primary-soft) text-(--primary) text-[11px] font-semibold uppercase tracking-wider border border-(--primary-soft)">
                                {dayOfWeek} • {new Date(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    )}
                </div>

                {/* Filters */}
                <div className="grid md:grid-cols-5 items-end gap-3">
                    <div className="flex flex-col">
                        <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Date</p>
                        <input
                            type="date"
                            className="input text-md"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setSearched(false);
                            }}
                        />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Class</p>
                        <select
                            className="input text-md"
                            value={classId}
                            onChange={(e) => {
                                setClassId(e.target.value);
                                setSectionId("");
                                setSearched(false);
                            }}
                        >
                            <option value="">Select Class</option>
                            {classData?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-[10px] text-(--text-muted) font-semibold uppercase tracking-wider">Section</p>
                        <select
                            value={sectionId}
                            className="input text-md"
                            onChange={(e) => {
                                setSectionId(e.target.value);
                                setSearched(false);
                            }}
                        >
                            <option value="">Select Section</option>
                            {classObj?.sections.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <button className="btn-primary gap-2 h-9 text-sm font-semibold" onClick={loadData}>
                        <Search size={14} />Search Matrix
                    </button>
                </div>

                {/* Timetable Grid */}
                {searched && (
                    <div className="rounded-xl bg-(--bg-card) border border-(--border) overflow-hidden shadow-sm">
                        <div className="timetable-grid" style={{ '--days-count': 1 }}>
                            <div className="bg-(--bg-soft)/50 border-r-3 border-b-3 border-(--border)" />
                            <div className="text-sm font-semibold text-center py-3 border-b-3 border-(--border) capitalize text-(--text)">
                                {dayOfWeek} Schedule View
                            </div>

                            {PERIODS.map(p => {
                                const dayData = staticData[dayOfWeek] || [];
                                const staticSlot = dayData.find(x => x.period === p);
                                const subSlot = localSubstitutions.find(x => x.period === p);
                                const isSubstituted = !!subSlot;

                                return (
                                    <div key={p} className="contents">
                                        <div className="text-xs font-semibold text-center py-3 border-r-3 border-b-3 border-(--border) flex flex-col items-center justify-center bg-(--bg-soft)/30 text-(--text-muted)">
                                            P{p}
                                        </div>
                                        <div
                                            className={`bg-(--bg-card) border-b-3 border-(--border) p-3 transition-all cursor-pointer hover:bg-(--primary)/5 relative group`}
                                            onClick={() => canManage && handleOpenAssistant(p, staticSlot)}
                                        >
                                            <div className="flex flex-wrap gap-2">
                                                {staticSlot?.entries?.map((e, i) => {
                                                    const sub = subjectData.find(s => s.id === e.subjectId);
                                                    const t = employeeData.find(t => t.uid === e.teacherId);
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`rounded min-w-full md:min-w-xs px-3 py-2 flex justify-between border transition-all ${isSubstituted ? `${theme === 'dark' ? 'opacity-70 bg-gray-700/40 border-gray-200 grayscale scale-[0.98]' : 'opacity-70 bg-gray-400/20 border-gray-200 grayscale scale-[0.98]'}` : 'bg-(--status-m-bg) border-(--status-m-bg)/20 shadow-sm'}`}
                                                        >
                                                            <div>
                                                                <div className="text-(--text) text-xs font-semibold uppercase">{sub?.name}</div>
                                                                <div className={`${isSubstituted ? `${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}` : 'text-(--status-m-text)'} text-[10px] capitalize font-medium opacity-90`}>
                                                                    {t?.name} <span className="text-[9px] opacity-60">(Static)</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {isSubstituted && (
                                                    <div className="bg-orange-500/5 min-w-full md:min-w-xs border-2 border-orange-500 rounded px-3 py-2 flex justify-between items-center shadow-sm relative animate-in zoom-in-95 duration-200">
                                                        <div className="absolute -top-1.5 -right-1.5 bg-orange-500 text-white p-0.5 rounded shadow-sm">
                                                            <Zap size={8} />
                                                        </div>
                                                        <div>
                                                            <div className="text-(--text) text-xs font-bold uppercase tracking-tight">
                                                                {subjectData.find(s => s.id === subSlot.subjectId)?.name}
                                                            </div>
                                                            <div className="text-orange-600 text-[10px] capitalize font-bold">
                                                                {employeeData.find(t => t.uid === subSlot.substituteTeacherId)?.name}
                                                            </div>
                                                        </div>
                                                        {canManage && (
                                                            <button
                                                                className="p-1 hover:text-red-500 transition-colors bg-(--bg-card) border border-(--border) rounded-full"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    removeSubstitution(p);
                                                                }}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                {(!isSubstituted && !staticSlot?.entries?.length && canManage) && (
                                                    <div className="h-full w-full py-4 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-all border-2 border-dashed border-(--border) rounded">
                                                        <div className="text-[9px] font-bold text-(--text-muted) flex items-center gap-1 uppercase tracking-widest">
                                                            <PlusCircle size={12} /> Assign
                                                        </div>
                                                    </div>
                                                )}
                                                {(!isSubstituted && staticSlot?.entries?.length > 0 && canManage) && (
                                                    <div className="h-full py-4 px-5 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-all border-2 border-dashed border-(--border) rounded">
                                                        <div className="text-[9px] font-bold text-(--text-muted) flex items-center gap-1 uppercase tracking-widest">
                                                            <PlusCircle size={12} /> Add Substitution
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {BREAKS.filter(b => b.afterPeriod === p).map((b, i) => (
                                            <div
                                                key={`break-${p}-${i}`}
                                                className="col-span-full text-center py-3 bg-(--status-o-bg) text-(--status-o-text) text-[10px] font-bold border-b-3 border-(--border) uppercase tracking-widest flex items-center justify-center gap-2"
                                            >
                                                <Layers size={12} className="opacity-50" /> {b.label} • {b.duration} MIN
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Sidebar Assistant */}
                {sidebarSlot && (
                    <>
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-end z-50 animate-in fade-in duration-200">
                            <div className="w-full max-w-md bg-(--bg-card) h-full border-l-3 border-orange-500 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
                                <div className="flex justify-between items-center border-b border-(--border) p-5 bg-orange-500/5">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-500 text-white rounded-lg shadow-lg shadow-orange-500/20">
                                            <Sparkles size={18} />
                                        </div>
                                        <h3 className="font-semibold text-base">Substitution Assistant</h3>
                                    </div>
                                    <button className="p-2 text-(--text-muted) rounded-full transition-colors" onClick={() => setSidebarSlot(null)}>
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="px-5 py-4 space-y-4 flex-1 overflow-y-auto">
                                    <div className="bg-(--bg-soft)/50 p-4 rounded-xl border border-(--border) space-y-2">
                                        <div className="text-[10px] font-bold text-(--text-muted) uppercase">Selected Period</div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-sm font-semibold text-(--text)">Period {sidebarSlot.period}</p>
                                                <p className="text-[11px] font-medium text-(--text-muted)">{dayOfWeek} • {new Date(selectedDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</p>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 text-[9px] font-bold uppercase border border-green-500/20">Conflict Check Auto</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b border-(--border) pb-2">
                                            <h4 className="text-xs font-semibold text-(--text-muted)">Available Faculty</h4>
                                        </div>

                                        <div className="grid gap-3">
                                            {getAvailableTeachers.map(teacher => (
                                                <div
                                                    key={teacher.uid}
                                                    onClick={() => !teacher.isBusy && addSubstitution(teacher.uid)}
                                                    className={`py-3 px-4 rounded-lg border transition-all ${teacher.isBusy ? `${theme === 'dark' ? 'bg-gray-700/50 border-(--border) shadow-xs opacity-70 cursor-not-allowed' : 'bg-gray-50 border-(--border) shadow-xs opacity-70 cursor-not-allowed'}` : 'bg-(--bg-card) border-(--border) hover:border-orange-500 hover:ring-2 hover:ring-orange-500/10 cursor-pointer shadow-xs active:scale-[0.98]'}`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded uppercase flex items-center justify-center font-bold text-sm ${teacher.isBusy ? `${theme === 'dark' ? 'bg-gray-500 text-gray-200' : 'bg-gray-200 text-gray-500'}` : 'bg-orange-500/10 text-orange-600 border border-orange-500/10'}`}>
                                                                {teacher.name?.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-semibold text-(--text) capitalize">{teacher.name}</p>
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[9px] font-semibold text-(--text-muted) bg-(--bg-soft) rounded uppercase tracking-wider">{teacher.employeeId}</span>
                                                                    {teacher.isBusy && <span className="text-[9px] font-bold text-red-500 flex items-center gap-0.5 uppercase"><AlertCircle size={10} /> Busy</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {!teacher.isBusy && (
                                                            <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-600 hover:bg-orange-500 hover:text-white transition-all shadow-sm">
                                                                <Plus size={14} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Minimal Confirmation / Notification Modal */}
                {pendingSub && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-(--bg-card) border border-(--border) rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="p-6 text-center space-y-4">
                                <div className="mx-auto w-12 h-12 bg-orange-500/10 text-orange-600 rounded-full flex items-center justify-center">
                                    <Bell size={22} />
                                </div>

                                <div>
                                    <h3 className="text-md font-semibold text-(--text)">Send Notification?</h3>
                                    <p className="text-[11px] text-(--text-muted) font-normal px-4">Would you like to notify students and parents about this substitution?</p>
                                </div>

                                <div className="bg-(--bg-soft) rounded-lg p-3 border border-(--border) flex items-center gap-3 text-left">
                                    <div className="w-8 h-8 rounded bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-xs uppercase border border-orange-500/10">
                                        {employeeData.find(t => t.uid === pendingSub.substituteTeacherId)?.name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-(--text) truncate capitalize">
                                            {employeeData.find(t => t.uid === pendingSub.substituteTeacherId)?.name}
                                        </p>
                                        <p className="text-[10px] font-semibold text-(--text-muted) uppercase">
                                            Period {pendingSub.period} • {dayOfWeek}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => handleFinalSave(false)}
                                        className="h-10 rounded-lg border border-(--border) text-xs font-semibold uppercase tracking-wider text-(--text-muted) hover:bg-(--bg-soft) transition-all"
                                    >
                                        Skip
                                    </button>
                                    <button
                                        onClick={() => handleFinalSave(true)}
                                        className="h-10 rounded-lg bg-orange-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-orange-600 transition-all shadow-sm shadow-orange-500/20"
                                    >
                                        <Send size={12} /> Notify
                                    </button>
                                </div>

                                <button
                                    onClick={() => setPendingSub(null)}
                                    className="text-[10px] font-semibold text-(--text-muted) hover:text-red-500 transition-colors uppercase tracking-widest pt-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RequirePermission>
    );
}
