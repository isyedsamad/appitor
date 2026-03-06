"use client";

import { useEffect, useState, useMemo } from "react";
import { Search, Loader2, ArrowUp, ArrowDown, ArrowUpDown, Download, Printer, BarChart3, PieChart as PieChartIcon, Users, Trophy } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { hasPermission } from "@/lib/school/permissionUtils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import * as XLSX from "xlsx";
import { generateReportPDF } from "@/lib/exports/exams/reportPdf";
import { X } from "lucide-react";

const GRADE_COLORS = {
    "A": "#22c55e",
    "B": "#84cc16",
    "C": "#eab308",
    "D": "#f59e0b",
    "E": "#f97316",
    "F": "#ef4444",
    "G": "#dc2626",
    "H": "#991b1b",
    "-": "#9ca3af"
};

const GRADE_POINTS = {
    A: 95,
    B: 85,
    C: 70,
    D: 55,
    E: 40,
    F: 30,
    G: 20,
    H: 10
};

export default function ExamReportsPage() {
    const { schoolUser, sessionList, classData, setLoading, subjectData } = useSchool();
    const { branch, branchInfo } = useBranch();
    const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
    const canView = hasPermission(schoolUser, "exam.marks.view", false, currentPlan);

    const [terms, setTerms] = useState([]);
    const [setups, setSetups] = useState([]);
    const [students, setStudents] = useState([]);
    const [reports, setReports] = useState([]);
    const [filters, setFilters] = useState({
        session: "",
        termId: "",
        classId: "",
        sectionId: ""
    });
    const [searched, setSearched] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'rank', direction: 'asc' });

    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null); // null means Print All
    const [pdfOptions, setPdfOptions] = useState({ size: 'a4', copies: 1 });

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

    const getClassName = id => classData.find(c => c.id === id)?.name;
    const getSectionName = (cid, sid) =>
        classData.find(c => c.id === cid)?.sections.find(s => s.id === sid)?.name;
    const getSubjectName = id => subjectData.find(s => s.id === id)?.name;

    async function fetchTerms(session) {
        if (!session) {
            setTerms([]);
            return;
        }
        setLoading(true);
        const q = query(
            collection(
                db,
                "schools",
                schoolUser.schoolId,
                "branches",
                branch,
                "exams",
                "items",
                "exam_terms"
            ),
            where("session", "==", session)
        );
        const snap = await getDocs(q);
        setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
    }

    async function loadReportData() {
        const { session, termId, classId, sectionId } = filters;
        if (!session || !termId || !classId || !sectionId) {
            toast.error("Please select all filters");
            return;
        }
        setLoading(true);
        try {
            // 1. Fetch Exam Setups for the selected criteria
            const setupQ = query(
                collection(
                    db,
                    "schools",
                    schoolUser.schoolId,
                    "branches",
                    branch,
                    "exams",
                    "items",
                    "exam_setups"
                ),
                where("session", "==", session),
                where("termId", "==", termId),
                where("classId", "==", classId),
                where("sectionId", "==", sectionId)
            );
            const setupSnap = await getDocs(setupQ);
            const setupData = setupSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSetups(setupData);

            // 2. Fetch Students
            const rosterRef = doc(
                db,
                "schools",
                schoolUser.schoolId,
                "branches",
                branch,
                "meta",
                `${classId}_${sectionId}_${session}`
            );
            const snap = await getDoc(rosterRef);
            let stuData = [];
            if (snap.exists()) {
                const roster = snap.data();
                stuData = (roster.students || [])
                    .filter((s) => s.status === "active" && s.rollNo !== null)
                    .sort((a, b) => a.rollNo - b.rollNo)
                    .map((s) => ({
                        ...s,
                        classId: roster.classId,
                        sectionId: roster.sectionId,
                    }));
            }
            setStudents(stuData);

            // 3. Fetch Marks
            const existingMarks = await loadExistingMarks(stuData, termId);

            // Calculate Reports
            const reportData = calculateReports(stuData, setupData, existingMarks);
            setReports(reportData);
            setSearched(true);
        } catch (err) {
            toast.error('Failed: ' + err);
        } finally {
            setLoading(false);
        }
    }

    async function loadExistingMarks(stuData, termId) {
        if (stuData.length === 0) return {};
        const promises = stuData.map(stu => {
            const ref = collection(
                db,
                "schools",
                schoolUser.schoolId,
                "branches",
                branch,
                "exams",
                "items",
                "student_marks"
            );
            return getDocs(
                query(
                    ref,
                    where("studentId", "==", stu.uid),
                    where("termId", "==", termId)
                )
            );
        });
        const snaps = await Promise.all(promises);
        const loadedMarks = {};
        snaps.forEach((snap, index) => {
            if (snap.empty) return;
            const data = snap.docs[0].data();
            loadedMarks[stuData[index].uid] = data.marks || [];
        });
        return loadedMarks;
    }

    function getGradeFromPercentage(percentage) {
        if (percentage >= 90) return "A";
        if (percentage >= 80) return "B";
        if (percentage >= 70) return "C";
        if (percentage >= 60) return "D";
        if (percentage >= 50) return "E";
        if (percentage >= 40) return "F";
        if (percentage >= 33) return "G";
        return "H";
    }

    function calculateReports(stuData, setupData, marksData) {
        let rawReports = stuData.map(stu => {
            const stuMarks = marksData[stu.uid] || [];
            let maxTotal = 0;
            let totalMarks = 0;
            let gradePointsSum = 0;
            let gradeCount = 0;
            let subjectResults = [];

            setupData.forEach(setup => {
                const m = stuMarks.find(x => x.setupId === setup.id);
                const val = m ? m.value : undefined;

                let obtainedValue = "-";
                let isAbsent = false;

                if (setup.markingType === "marks") {
                    if (val !== undefined && val !== "" && !isNaN(val)) {
                        totalMarks += Number(val);
                        maxTotal += Number(setup.maxMarks || 0);
                        obtainedValue = Number(val);
                    } else if (val === "AB" || val === "ab") {
                        isAbsent = true;
                        obtainedValue = 0;
                    } else {
                        obtainedValue = 0;
                    }
                } else if (setup.markingType === "grades") {
                    if (val && GRADE_POINTS[val] !== undefined) {
                        gradePointsSum += GRADE_POINTS[val];
                        gradeCount += 1;
                        obtainedValue = val;
                    } else if (val === "AB" || val === "ab") {
                        isAbsent = true;
                    }
                }

                subjectResults.push({
                    subjectId: setup.subjectId,
                    subjectName: getSubjectName(setup.subjectId),
                    maxMarks: Number(setup.maxMarks) || 0,
                    passMarks: setup.passMarks,
                    obtained: obtainedValue,
                    isAbsent,
                    grade: setup.markingType === "grades" ? val : '',
                    remark: ''
                });
            });

            const marksPercentage = maxTotal > 0 ? (totalMarks / maxTotal) * 100 : null;
            const gradePercentage = gradeCount > 0 ? gradePointsSum / gradeCount : null;
            let finalPercentage = null;
            if (marksPercentage !== null && gradePercentage !== null) {
                finalPercentage = Math.round((marksPercentage + gradePercentage) / 2);
            } else if (marksPercentage !== null) {
                finalPercentage = Math.round(marksPercentage);
            } else if (gradePercentage !== null) {
                finalPercentage = Math.round(gradePercentage);
            }

            let derivedGrade = "-";
            if (finalPercentage !== null) {
                derivedGrade =
                    finalPercentage >= 90 ? "A" :
                        finalPercentage >= 75 ? "B" :
                            finalPercentage >= 60 ? "C" :
                                finalPercentage >= 45 ? "D" :
                                    "E";
            } else {
                finalPercentage = 0;
            }

            return {
                ...stu,
                totalMaxMarks: maxTotal,
                totalObtainedMarks: totalMarks,
                percentage: finalPercentage,
                overallGrade: derivedGrade,
                subjectResults
            };
        });

        // Calculate Ranks safely
        rawReports.sort((a, b) => b.percentage - a.percentage);

        let currentRank = 1;
        let rankReports = rawReports.map((r, i) => {
            if (i > 0 && r.percentage < rawReports[i - 1].percentage) {
                currentRank = i + 1;
            }
            return { ...r, rank: currentRank };
        });

        return rankReports;
    }

    const sortedReports = useMemo(() => {
        let sortableItems = [...reports];
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
    }, [reports, sortConfig]);

    const chartData = useMemo(() => {
        if (reports.length === 0 || setups.length === 0) return { subjectAverages: [], gradeDistribution: [] };

        const subjectAverages = setups.map(setup => {
            let total = 0;
            let count = 0;
            reports.forEach(r => {
                const sub = r.subjectResults.find(s => s.subjectId === setup.subjectId);
                if (sub && !sub.isAbsent) {
                    total += sub.obtained;
                    count++;
                }
            });
            return {
                name: getSubjectName(setup.subjectId)?.substring(0, 10),
                fullName: getSubjectName(setup.subjectId),
                average: count > 0 ? Number((total / count).toFixed(1)) : 0,
                maxMarks: Number(setup.maxMarks)
            };
        });

        const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0, G: 0, H: 0 };
        reports.forEach(r => {
            if (gradeCounts[r.overallGrade] !== undefined) {
                gradeCounts[r.overallGrade]++;
            }
        });

        const gradeDistribution = Object.keys(gradeCounts)
            .filter(k => gradeCounts[k] > 0)
            .map(k => ({
                name: `Grade ${k}`,
                value: gradeCounts[k],
                color: GRADE_COLORS[k] || "#ccc"
            }));

        return { subjectAverages, gradeDistribution };
    }, [reports, setups, subjectData]);

    const exportToExcel = () => {
        if (!sortedReports || sortedReports.length === 0) return;
        setLoading(true);
        try {
            const className = getClassName(filters.classId);
            const sectionName = getSectionName(filters.classId, filters.sectionId);
            const termName = terms.find(t => t.id === filters.termId)?.name || 'Term';

            const exportData = sortedReports.map(r => ({
                Rank: r.rank,
                "Roll No": r.rollNo,
                "Student Name": r.name,
                "Obtained Marks": r.totalObtainedMarks,
                "Total Marks": r.totalMaxMarks,
                "Percentage (%)": r.percentage,
                "Overall Grade": r.overallGrade
            }));

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Class Rankings");
            XLSX.writeFile(wb, `Rankings_${className}_${sectionName}_${termName}.xlsx`);
        } catch (err) {
            toast.error("Export failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmDownload = () => {
        const className = getClassName(filters.classId);
        const sectionName = getSectionName(filters.classId, filters.sectionId);
        const termName = terms.find(t => t.id === filters.termId)?.name || 'Term';
        const sessionName = sessionList?.find(s => s.id === filters.session)?.session || filters.session;

        const reportsToPrint = selectedReport ? [selectedReport] : sortedReports;

        if (reportsToPrint.length === 0) {
            toast.error("No reports to print");
            return;
        }

        generateReportPDF({
            reports: reportsToPrint,
            termName,
            classSectionName: `${className} - ${sectionName}`,
            session: sessionName,
            branchInfo,
            schoolUser,
            options: pdfOptions
        });

        setShowDownloadModal(false);
    };

    return (
        <RequirePermission permission="exam.marks.view">
            <div className="space-y-4 bg-(--bg) text-(--text)">
                <div className="flex items-start gap-3">
                    <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold text-(--text)">Exam Reports & Analytics</h1>
                        <p className="text-xs font-semibold text-(--text-muted)">
                            Analyze student outcomes and generate report cards
                        </p>
                    </div>
                </div>

                <div className="grid md:grid-cols-6 gap-2 md:items-end">
                    <Select
                        label="Session"
                        value={filters.session}
                        options={sessionList?.map(s => ({ id: s.id, name: s.session })) || []}
                        onChange={v => {
                            setFilters({ ...filters, session: v, termId: "" });
                            fetchTerms(v);
                        }}
                    />

                    <Select
                        label="Exam Term"
                        value={filters.termId}
                        options={terms}
                        onChange={v => setFilters({ ...filters, termId: v })}
                        disabled={!filters.session}
                    />

                    <Select
                        label="Class"
                        value={filters.classId}
                        options={classData || []}
                        onChange={v =>
                            setFilters({ ...filters, classId: v, sectionId: "" })
                        }
                    />

                    <Select
                        label="Section"
                        value={filters.sectionId}
                        options={classData?.find(c => c.id === filters.classId)?.sections || []}
                        onChange={v => setFilters({ ...filters, sectionId: v })}
                        disabled={!filters.classId}
                    />

                    <button
                        onClick={loadReportData}
                        className="btn-primary flex items-center justify-center gap-2"
                    >
                        <Search size={15} /> Search
                    </button>
                </div>

                {searched && reports.length > 0 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* Analytics Dashboards */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-(--bg-card) p-5 border border-(--border) rounded-2xl shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-(--primary)" /> Class Subject Averages
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.subjectAverages} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--text-muted)" }} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--text)' }}
                                                itemStyle={{ color: 'var(--text)' }}
                                                labelStyle={{ fontWeight: 'bold', color: 'var(--text)' }}
                                            />
                                            <Bar dataKey="average" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Average Marks" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-(--bg-card) p-5 border border-(--border) rounded-2xl shadow-sm">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <PieChartIcon size={18} className="text-(--primary)" /> Overall Grade Distribution
                                </h3>
                                <div className="h-64 w-full flex items-center justify-center">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData.gradeDistribution}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                                labelLine={{ stroke: 'var(--text-muted)' }}
                                            >
                                                {chartData.gradeDistribution.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)', borderRadius: '8px' }}
                                                itemStyle={{ color: 'var(--text)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm overflow-hidden">
                            <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-(--border) bg-(--bg-soft)">
                                <h3 className="font-bold flex items-center gap-2">
                                    <Trophy size={18} className="text-(--primary)" /> Class Rankings
                                </h3>
                                <div className="flex gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                                    <button
                                        onClick={exportToExcel}
                                        className="btn-outline flex-1 sm:flex-none justify-center gap-2 text-sm px-4"
                                    >
                                        <Download size={16} /> Excel Export
                                    </button>
                                    <button
                                        onClick={() => { setSelectedReport(null); setShowDownloadModal(true); }}
                                        className="btn-primary flex-1 sm:flex-none justify-center gap-2 text-sm px-4"
                                    >
                                        <Printer size={16} /> Print All Reports
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto min-h-[300px]">
                                <table className="w-full text-sm">
                                    <thead className="bg-(--bg-soft) text-(--text-muted) border-b border-(--border)">
                                        <tr>
                                            <th className="px-5 py-3 text-left w-12 cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('rank')}>
                                                <div className="flex items-center">Rank {getSortIcon('rank')}</div>
                                            </th>
                                            <th className="px-5 py-3 text-left cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('rollNo')}>
                                                <div className="flex items-center">Student {getSortIcon('rollNo')}</div>
                                            </th>
                                            <th className="px-5 py-3 text-left min-w-[120px] cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('totalObtainedMarks')}>
                                                <div className="flex items-center">Total Marks {getSortIcon('totalObtainedMarks')}</div>
                                            </th>
                                            <th className="px-5 py-3 text-left w-32 cursor-pointer hover:text-(--text) transition-colors select-none" onClick={() => handleSort('percentage')}>
                                                <div className="flex items-center">Percentage {getSortIcon('percentage')}</div>
                                            </th>
                                            <th className="px-5 py-3 text-center w-24">Grade</th>
                                            <th className="px-5 py-3 text-right w-24">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-(--border)">
                                        {sortedReports.map((r, i) => (
                                            <tr key={r.uid} className="hover:bg-(--bg-soft)/50 transition-colors">
                                                <td className="px-5 py-4">
                                                    <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold
                                  ${r.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                                                            r.rank === 2 ? 'bg-gray-200 text-gray-700' :
                                                                r.rank === 3 ? 'bg-orange-100 text-orange-700' : 'bg-(--bg) text-(--text-muted)'}
                                `}>
                                                        #{r.rank}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-(--text) capitalize">{r.name}</div>
                                                    <div className="text-xs font-semibold text-(--text-muted)">Roll No: {r.rollNo || 'N/A'}</div>
                                                </td>
                                                <td className="px-5 py-4 font-semibold">
                                                    {r.totalObtainedMarks} <span className="text-(--text-muted) text-xs">/ {r.totalMaxMarks}</span>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="w-full bg-(--border) rounded-full h-2 mb-1">
                                                        <div className={`h-2 rounded-full ${r.percentage >= 60 ? 'bg-(--status-p-text)' : r.percentage >= 40 ? 'bg-yellow-500' : 'bg-(--status-a-text)'}`} style={{ width: `${r.percentage}%` }}></div>
                                                    </div>
                                                    <span className="font-bold">{r.percentage}%</span>
                                                </td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-(--bg) border border-(--border)">
                                                        {r.overallGrade}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <button
                                                        onClick={() => { setSelectedReport(r); setShowDownloadModal(true); }}
                                                        className="p-2 text-(--primary) hover:bg-(--primary-soft) rounded-full transition-colors"
                                                    >
                                                        <Printer size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {searched && reports.length === 0 && (
                    <div className="p-10 text-center text-(--text-muted) border border-(--border) rounded-2xl bg-(--bg-card)">
                        <div className="w-16 h-16 bg-(--bg-soft) rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="opacity-50" />
                        </div>
                        <p className="font-semibold text-lg">No Results Found</p>
                        <p className="text-sm">No marks have been entered for this class term yet.</p>
                    </div>
                )}

            </div>

            {showDownloadModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-(--bg-card) w-full max-w-md rounded-2xl border border-(--border) shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
                            <h3 className="font-bold flex items-center gap-2">
                                <Printer size={18} className="text-(--primary)" /> Print Report Card{selectedReport ? '' : 's'}
                            </h3>
                            <button onClick={() => setShowDownloadModal(false)} className="p-1.5 hover:bg-(--border) rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-6">
                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-(--text-muted) uppercase">Layout Size</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'a4', label: 'Full A4' },
                                        { id: '1/2', label: '1/2 A4' },
                                    ].map(sz => (
                                        <button
                                            key={sz.id}
                                            onClick={() => setPdfOptions({ ...pdfOptions, size: sz.id, copies: 1 })}
                                            className={`p-3 rounded-xl border text-sm font-semibold transition-all
                                                ${pdfOptions.size === sz.id ? "border-(--primary) bg-(--primary-soft) text-(--primary)" : "border-(--border) hover:border-(--text-muted)"}`}
                                        >
                                            {sz.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[11px] font-bold text-(--text-muted) uppercase">Copies on Page</p>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(num => {
                                        const disabled = (pdfOptions.size === 'a4' && num > 1) ||
                                            (pdfOptions.size === '1/2' && num > 2) ||
                                            (pdfOptions.size === '1/3' && num > 3);
                                        return (
                                            <button
                                                key={num}
                                                disabled={disabled}
                                                onClick={() => setPdfOptions({ ...pdfOptions, copies: num })}
                                                className={`w-10 h-10 rounded-lg border font-bold transition-all flex items-center justify-center
                                                ${pdfOptions.copies === num ? "border-(--primary) bg-(--primary) text-white" : "border-(--border) text-(--text-muted)"}
                                                ${disabled ? "opacity-0 pointer-events-none" : ""}`}
                                            >
                                                {num}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="bg-(--bg-soft) p-4 rounded-xl border border-(--border) text-sm space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-(--text-muted)">Selected For Print:</span>
                                    <span className="font-semibold text-(--primary)">{selectedReport ? '1 Student' : `${sortedReports.length} Students`}</span>
                                </div>
                                {selectedReport && (
                                    <div className="flex justify-between border-t border-(--border) pt-2">
                                        <span className="text-(--text-muted)">Name:</span>
                                        <span className="font-semibold">{selectedReport.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-(--bg-soft) border-t border-(--border)">
                            <button
                                onClick={confirmDownload}
                                className="btn-primary w-full py-3 font-semibold shadow-lg shadow-(--primary-soft)/20"
                            >
                                Generate PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </RequirePermission>
    );
}

function Select({ label, value, onChange, options, disabled = false }) {
    return (
        <div className="flex flex-col flex-1">
            <label className="text-sm font-medium text-(--text-muted) whitespace-nowrap overflow-hidden text-ellipsis">{label}</label>
            <select
                className="input"
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="">Select</option>
                {options && options.map(o => (
                    <option key={o.id} value={o.id}>
                        {o.name || o.id}
                    </option>
                ))}
            </select>
        </div>
    );
}
