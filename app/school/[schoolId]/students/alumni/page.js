"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
    Users,
    Search,
    RefreshCw,
    GraduationCap,
    Calendar,
    UserCheck,
    Check,
    Square,
    ArrowRight,
    ArrowUp,
    ExternalLink
} from "lucide-react";
import {
    doc,
    getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
import secureAxios from "@/lib/secureAxios";

export default function AlumniPage() {
    const { classData, schoolUser, setLoading, loading, sessionList, currentSession } = useSchool();
    const { branchInfo } = useBranch();
    const [session, setSession] = useState(currentSession || "");
    const [students, setStudents] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loadingList, setLoadingList] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [toSession, setToSession] = useState("");
    const [toClass, setToClass] = useState("");
    const [toSection, setToSection] = useState("");

    const targetClass = classData?.find(c => c.id === toClass);
    useEffect(() => {
        if (currentSession && !session) {
            setSession(currentSession);
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

    async function loadAlumni() {
        if (!session) {
            toast.error("Please select a session");
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
                `passed_out_All_${session}`
            );

            const snap = await getDoc(rosterRef);
            if (!snap.exists()) {
                setStudents([]);
                toast.info("No alumni records found for this session");
            } else {
                const data = snap.data();
                const results = (data.students || []).map((s) => ({
                    ...s,
                    className: "Passed Out",
                    sectionName: "All",
                }));

                results.sort((a, b) => a.name.localeCompare(b.name));
                setStudents(results);
                setSelected([]);
            }
        } catch (err) {
            console.error("LOAD ALUMNI ERROR:", err);
            toast.error("Failed to load alumni records");
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
        if (selected.length === filteredStudents.length && filteredStudents.length > 0) {
            setSelected([]);
        } else {
            setSelected(filteredStudents.map(s => s.uid));
        }
    }

    async function revertStudents() {
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
            toast.success(`${selected.length} students reverted successfully`);
            loadAlumni();
            setToClass("");
            setToSection("");
        } catch (err) {
            toast.error(err.response?.data?.message || "Revert failed");
        } finally {
            setLoading(false);
        }
    }

    return (
        <RequirePermission permission="student.alumni.view">
            <div className="space-y-5 pb-32 text-sm">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                            <GraduationCap size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Alumni & Passouts</h1>
                            <p className="text-xs text-(--text-muted) font-medium">
                                View, search, and manage records of graduated students
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-3 space-y-1.5">
                            <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1 flex items-center gap-1">
                                <Calendar size={10} /> Graduation Session
                            </label>
                            <select
                                className="input w-full bg-(--bg-card)"
                                value={session}
                                onChange={e => setSession(e.target.value)}
                            >
                                <option value="">Select Session</option>
                                {sessionList?.map(s => (
                                    <option key={s.id} value={s.id}>{s.id}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-7 relative group">
                            <label className="text-[10px] uppercase font-bold text-(--text-muted) tracking-wider ml-1">Search Records</label>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Search by Name, App ID..."
                                    className="input pl-9 w-full bg-(--bg-card)"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <button
                                onClick={loadAlumni}
                                disabled={loadingList || !session}
                                className="btn-primary w-full flex items-center justify-center gap-2 h-[38px]"
                            >
                                {loadingList ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
                                Search
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Table */}
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
                                            {selected.length === filteredStudents.length && filteredStudents.length > 0 ? (
                                                <Check size={14} className="text-(--primary)" />
                                            ) : (
                                                <Square size={14} className="text-(--text-muted)" />
                                            )}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4 font-semibold text-(--text-muted)">Roll No</th>
                                    <th className="px-6 py-4 font-semibold text-(--text-muted)">App ID</th>
                                    <th className="px-6 py-4 font-semibold text-(--text-muted)">Student Name</th>
                                    <th className="px-6 py-4 font-semibold text-(--text-muted)">Status</th>
                                    <th className="px-6 py-4 font-semibold text-(--text-muted) text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border)">
                                {loadingList ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="6" className="px-6 py-6">
                                                <div className="h-4 bg-(--bg) rounded-full w-3/4"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center">
                                                <div className="w-20 h-20 rounded-full bg-(--bg) flex items-center justify-center text-(--text-muted) mb-4">
                                                    <GraduationCap size={40} />
                                                </div>
                                                <h3 className="text-lg font-semibold text-(--text)">No alumni records found</h3>
                                                <p className="text-sm text-(--text-muted) max-w-xs mx-auto mt-1">
                                                    Select a session to view students who graduated during that period.
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => {
                                        const isSelected = selected.includes(student.uid);
                                        return (
                                            <tr
                                                key={student.uid}
                                                className={`hover:bg-(--bg-soft)/30 transition-colors group cursor-pointer ${isSelected ? 'bg-(--primary-soft)/20' : ''}`}
                                                onClick={() => toggle(student.uid)}
                                            >
                                                <td className="px-5 py-3">
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center bg-(--bg) ${isSelected ? 'border-(--primary)' : 'border-(--text-muted)'}`}>
                                                        {isSelected ? <Check size={14} className="text-(--primary)" /> : null}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-xs text-(--text-muted)">
                                                    {student.rollNo ? student.rollNo.toString().padStart(2, '0') : '--'}
                                                </td>
                                                <td className="px-6 py-4 uppercase font-bold text-(--text) tracking-tight">
                                                    {student.appId}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center font-bold text-xs uppercase">
                                                            {student.name.charAt(0)}
                                                        </div>
                                                        <span className="font-semibold text-(--text) capitalize">{student.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600">
                                                        <UserCheck size={12} /> Passed Out
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Link
                                                        href={`/school/${schoolUser.schoolId}/students/${student.uid}`}
                                                        className="inline-flex items-center gap-1.5 text-(--primary) hover:underline font-semibold text-xs"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <ExternalLink size={12} /> View Profile
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {students.length > 0 && (
                        <div className="px-6 py-4 bg-(--bg-soft)/20 border-t border-(--border) flex justify-between items-center">
                            <p className="text-xs font-medium text-(--text-muted)">
                                Showing {filteredStudents.length} of {students.length} alumni
                            </p>
                        </div>
                    )}
                </div>

                {/* Revert Selection Bar */}
                {selected.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 animate-in slide-in-from-bottom-8 duration-300">
                        <div className="bg-(--bg) border border-(--border) rounded-2xl p-4 shadow-2xl flex flex-col lg:flex-row gap-4 items-center justify-between ring-4 ring-black/5 dark:ring-white/5">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-(--primary) text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                                    <span className="font-bold text-lg">{selected.length}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-(--text)">Alumni Selected</p>
                                    <p className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">Revert to Active</p>
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
                                        className="input w-40 bg-(--bg-soft)"
                                        value={toClass}
                                        onChange={e => {
                                            setToClass(e.target.value);
                                            setToSection("");
                                        }}
                                    >
                                        <option value="">Target Class</option>
                                        {classData?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                    <ArrowRight size={16} className="text-(--text-muted)" />
                                    <select
                                        className="input w-32 bg-(--bg-soft)"
                                        disabled={!toClass}
                                        value={toSection}
                                        onChange={e => setToSection(e.target.value)}
                                    >
                                        <option value="">Section</option>
                                        {targetClass?.sections.map(sec => (
                                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={revertStudents}
                                    disabled={!toSection || !toSession || loading}
                                    className="btn-primary flex items-center gap-2 py-2.5 px-6 shadow-xl shadow-orange-500/10"
                                >
                                    <ArrowUp size={16} />
                                    Revert Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </RequirePermission>
    );
}
