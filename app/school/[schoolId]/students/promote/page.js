"use client";

import { useState, useMemo } from "react";
import {
  Users,
  CheckSquare,
  Square,
  ArrowUp,
  ChevronDown,
  RefreshCw,
  Search,
  Hash,
  CheckCircle2,
  ArrowRight,
  ChartNoAxesCombined,
  ChevronRight,
  Check,
  ArrowDown,
  ArrowUpDown,
  TrendingUp,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { canManage } from "@/lib/school/permissionUtils";
import RequirePermission from "@/components/school/RequirePermission";

export default function PromoteDemotePage() {
  const { schoolUser, classData, setLoading, loading, sessionList, currentSession } = useSchool();
  const { branchInfo } = useBranch();

  const [fromSession, setFromSession] = useState(currentSession || "");
  const [fromClass, setFromClass] = useState("");
  const [fromSection, setFromSection] = useState("");
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [toSession, setToSession] = useState("");
  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="ml-1 text-(--primary)" /> : <ArrowDown size={14} className="ml-1 text-(--primary)" />;
  };

  const sourceClass = classData?.find(c => c.id === fromClass);
  const targetClass = classData?.find(c => c.id === toClass);

  // Sync fromSession when currentSession is available
  useMemo(() => {
    if (currentSession && !fromSession) {
      setFromSession(currentSession);
    }
  }, [currentSession]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    const lower = searchTerm.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(lower) ||
      s.appId.toLowerCase().includes(lower) ||
      (s.rollNo && s.rollNo.toString().includes(lower))
    );
  }, [students, searchTerm]);

  const sortedStudents = useMemo(() => {
    let sortableItems = [...filteredStudents];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'rollNo') {
          aValue = aValue ? parseInt(aValue, 10) : 999999;
          bValue = bValue ? parseInt(bValue, 10) : 999999;
          return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredStudents, sortConfig]);

  async function loadStudents() {
    if (!fromSession || !fromClass || !fromSection) {
      toast.error("Select session, class and section");
      return;
    }
    setLoadingList(true);
    try {
      const rosterRef = doc(
        db,
        "schools",
        branchInfo.schoolId,
        "branches",
        branchInfo.id,
        "meta",
        `${fromClass}_${fromSection}_${fromSession}`
      );

      const snap = await getDoc(rosterRef);
      if (!snap.exists()) {
        setStudents([]);
        toast.info("No students found for selected session");
      } else {
        const data = snap.data();
        const results = (data.students || []).map((s) => ({
          ...s,
          classId: data.classId,
          sectionId: data.sectionId,
        }));
        results.sort((a, b) => {
          const rA = parseInt(a.rollNo) || 999;
          const rB = parseInt(b.rollNo) || 999;
          return rA - rB;
        });
        setStudents(results);
      }
      setSelected([]);
    } catch (err) {
      console.error("LOAD STUDENTS ERROR:", err);
      toast.error("Failed to load students");
    } finally {
      setLoadingList(false);
    }
  }

  function toggle(uid) {
    setSelected(prev =>
      prev.includes(uid)
        ? prev.filter(id => id !== uid)
        : [...prev, uid]
    );
  }

  function toggleAll() {
    if (selected.length === sortedStudents.length && sortedStudents.length > 0) {
      setSelected([]);
    } else {
      setSelected(sortedStudents.map(s => s.uid));
    }
  }

  async function promote() {
    if (!selected.length) {
      toast.error("Select students");
      return;
    }
    if (!toSession || !toClass || !toSection) {
      toast.error("Select target session, class & section");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/promote", {
        uids: selected,
        toClass,
        toSection,
        toSession,
      });
      toast.success(`${selected.length} students moved successfully`);
      loadStudents();
      setToClass("");
      setToSection("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Promotion failed");
    } finally {
      setLoading(false);
    }
  }

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "student.promote.manage", currentPlan);

  return (
    <RequirePermission permission="student.promote.view">
      <div className="space-y-5 pb-32 text-sm">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <TrendingUp size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Promotion Control</h1>
              <p className="text-xs text-(--text-muted) font-medium">
                Move students across sessions, classes, or mark as passed out
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">Session</label>
              <select
                className="input w-full bg-(--bg-card)"
                value={fromSession}
                onChange={e => setFromSession(e.target.value)}
              >
                <option value="">Select</option>
                {sessionList?.map(s => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">From Class</label>
              <select
                className="input w-full bg-(--bg-card)"
                value={fromClass}
                onChange={e => {
                  setFromClass(e.target.value);
                  setFromSection("");
                }}
              >
                <option value="">Select Class</option>
                {classData?.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">From Section</label>
              <select
                className="input w-full bg-(--bg-card)"
                value={fromSection}
                disabled={!sourceClass}
                onChange={e => setFromSection(e.target.value)}
              >
                <option value="">Select Section</option>
                {sourceClass?.sections.map(sec => (
                  <option key={sec.id} value={sec.id}>{sec.name}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 relative group">
              <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">Search Loaded</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                <input
                  type="text"
                  placeholder="Roll, Name, ID..."
                  className="input pl-9 w-full bg-(--bg-card)"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                onClick={loadStudents}
                disabled={loadingList || !fromSection || !fromSession}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loadingList ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                Search
              </button>
            </div>
          </div>
        </div>

        <div className="bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-(--bg) border-b border-(--border)">
                  <th className="px-5 py-3 w-12">
                    <button
                      onClick={toggleAll}
                      className="w-5 h-5 rounded border border-(--border) flex items-center justify-center bg-(--bg)"
                    >
                      {selected.length === sortedStudents.length && sortedStudents.length > 0 ? (
                        <Check size={14} className="text-(--primary)" />
                      ) : (
                        <Square size={14} className="text-(--text-muted)" />
                      )}
                    </button>
                  </th>
                  <th className="px-5 py-3 font-semibold text-(--text-muted) cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('rollNo')}>
                    <div className="flex items-center">Roll No {getSortIcon('rollNo')}</div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-(--text-muted) cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('appId')}>
                    <div className="flex items-center">App ID {getSortIcon('appId')}</div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-(--text-muted) cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('name')}>
                    <div className="flex items-center">Name {getSortIcon('name')}</div>
                  </th>
                  <th className="px-5 py-3 font-semibold text-(--text-muted) text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {loadingList ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="5" className="px-5 py-6">
                        <div className="h-4 bg-(--bg) rounded-full w-3/4"></div>
                      </td>
                    </tr>
                  ))
                ) : sortedStudents.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-10 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-(--bg) flex items-center justify-center text-(--text-muted)">
                          <Users size={32} />
                        </div>
                        <h3 className="text-base mt-4 font-semibold text-(--text)">No students to display</h3>
                        <p className="text-xs text-(--text-muted)">Select a class and section to load students for promotion</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sortedStudents.map((student) => {
                    const isSelected = selected.includes(student.uid);
                    return (
                      <tr
                        key={student.uid}
                        onClick={() => toggle(student.uid)}
                        className={`group cursor-pointer transition-colors ${isSelected ? 'bg-(--primary-soft)/20' : 'hover:bg-(--bg-soft)/30'}`}
                      >
                        <td className="px-5 py-3">
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center bg-(--bg) ${isSelected ? 'border-(--primary)' : 'border-(--text-muted)'}`}>
                            {isSelected ? <Check size={14} className="text-(--primary)" /> : null}
                          </div>
                        </td>
                        <td className={`px-5 py-3 font-semibold text-xs ${isSelected ? 'text-(--primary)' : 'text-(--text-muted)'}`}>
                          {student.rollNo ? student.rollNo.toString().padStart(2, '0') : '--'}
                        </td>
                        <td className="px-5 py-3 uppercase font-semibold">
                          {student.appId}
                        </td>
                        <td className="px-5 py-3 font-semibold text-(--text) capitalize">
                          {student.name}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${student.status === 'active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                            {student.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
        {selected.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 animate-in slide-in-from-bottom-8 duration-300">
            <div className="bg-(--bg) border border-(--border) rounded-2xl p-4 shadow-2xl flex flex-col lg:flex-row gap-4 items-center justify-between ring-4 ring-black/5 dark:ring-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-(--primary) text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <span className="font-bold text-lg">{selected.length}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-(--text)">Students Selected</p>
                  <p className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">Target Selection</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center flex-1 justify-center lg:justify-end">
                <div className="flex items-center gap-2">
                  <select
                    className="input w-36 bg-(--bg-soft)"
                    value={toSession}
                    onChange={e => setToSession(e.target.value)}
                  >
                    <option value="">To Session</option>
                    {sessionList?.map(s => (
                      <option key={s.id} value={s.id}>{s.id}</option>
                    ))}
                  </select>
                  <ArrowRight size={16} className="text-(--text-muted)" />
                  <select
                    className="input w-36 bg-(--bg-soft)"
                    value={toClass}
                    onChange={e => {
                      setToClass(e.target.value);
                      setToSection("");
                    }}
                  >
                    <option value="">Target Class</option>
                    <optgroup label="Academic Classes">
                      {classData?.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Exit Options">
                      <option value="passed_out">Passed Out / Alumni</option>
                    </optgroup>
                  </select>
                  <ArrowRight size={16} className="text-(--text-muted)" />
                  <select
                    className="input w-32 bg-(--bg-soft)"
                    disabled={!toClass}
                    value={toSection}
                    onChange={e => setToSection(e.target.value)}
                  >
                    <option value="">Section</option>
                    {toClass === "passed_out" ? (
                      <option value="All">All</option>
                    ) : (
                      targetClass?.sections.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))
                    )}
                  </select>
                </div>

                <button
                  onClick={promote}
                  disabled={!toSection || !toSession || loading || !editable}
                  className="btn-primary flex items-center gap-2 py-2.5 px-6 shadow-xl shadow-orange-500/10"
                >
                  <ArrowUp size={16} />
                  Promote Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
