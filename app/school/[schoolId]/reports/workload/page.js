"use client";

import { useState, useEffect } from "react";
import { Download, FileText, LayoutDashboard, Users, Clock, AlertTriangle, Book, Search, CalendarDays } from "lucide-react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import RequirePermission from "@/components/school/RequirePermission";

export default function TeacherWorkloadReportPage() {
    const { employeeData, classData, subjectData, schoolUser } = useSchool();
    const { branchInfo, branch } = useBranch();
    const { theme } = useTheme();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState(null);
    const [workloadData, setWorkloadData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTeacher, setSelectedTeacher] = useState(null);

    useEffect(() => {
        if (schoolUser?.schoolId && branch && employeeData?.length > 0) {
            fetchWorkloadReport();
        }
    }, [schoolUser, branch, employeeData]);

    const fetchWorkloadReport = async () => {
        setLoading(true);
        try {
            const basePath = ["schools", schoolUser.schoolId, "branches", branch];
            const settingsRef = doc(db, ...basePath, "timetable", "items", "timetableSettings", "global");
            const settingsSnap = await getDoc(settingsRef);
            let totalPeriodsInWeek = 40;
            let workingDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
            let periodsPerDay = 8;

            if (settingsSnap.exists()) {
                const sData = settingsSnap.data();
                setSettings(sData);
                workingDays = sData.workingDays || workingDays;
                periodsPerDay = sData.totalPeriods || periodsPerDay;
                totalPeriodsInWeek = workingDays.length * periodsPerDay;
            }

            const teacherDocsRef = collection(db, ...basePath, "timetable", "items", "teachers");
            const teacherSnaps = await getDocs(teacherDocsRef);

            const teacherSlotsMap = {};
            teacherSnaps.forEach(doc => {
                teacherSlotsMap[doc.id] = doc.data().slots || [];
            });

            const activeTeachers = employeeData.filter(e => e.status !== 'disabled' && (e.role?.toLowerCase().includes('teacher') || e.role?.toLowerCase().includes('faculty')));

            const calculatedData = activeTeachers.map(teacher => {
                const slots = teacherSlotsMap[teacher.uid] || [];
                const uniqueClasses = new Set();
                const uniqueSubjects = new Set();

                slots.forEach(slot => {
                    uniqueClasses.add(`${slot.classId}_${slot.sectionId}`);
                    uniqueSubjects.add(slot.subjectId);
                });

                const totalAssigned = slots.length;
                const utilizationPercent = Math.round((totalAssigned / totalPeriodsInWeek) * 100);

                return {
                    ...teacher,
                    slots,
                    metrics: {
                        totalAssigned,
                        capacity: totalPeriodsInWeek,
                        utilizationPercent,
                        classesCount: uniqueClasses.size,
                        subjectsCount: uniqueSubjects.size
                    }
                };
            });

            calculatedData.sort((a, b) => b.metrics.utilizationPercent - a.metrics.utilizationPercent);
            setWorkloadData(calculatedData);

        } catch (error) {
            console.error("Failed to fetch workload:", error);
            toast.error("Failed to load teacher workloads.");
        } finally {
            setLoading(false);
        }
    };

    const filteredData = workloadData.filter(t =>
        t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalTeachers = workloadData.length;
    const avgUtilization = totalTeachers > 0
        ? Math.round(workloadData.reduce((acc, curr) => acc + curr.metrics.utilizationPercent, 0) / totalTeachers)
        : 0;
    const overloadedTeachers = workloadData.filter(t => t.metrics.utilizationPercent > 85).length;

    const getUtilizationColor = (percent) => {
        if (percent > 85) return theme === 'dark' ? 'bg-red-950 text-red-500' : 'bg-red-100 text-red-700';
        if (percent > 50) return theme === 'dark' ? 'bg-green-950 text-green-500' : 'bg-green-100 text-green-700';
        return theme === 'dark' ? 'bg-yellow-950 text-yellow-500' : 'bg-yellow-100 text-yellow-700';
    };

    const getUtilizationBarColor = (percent) => {
        if (percent > 85) return 'bg-red-500';
        if (percent > 50) return 'bg-green-500';
        return 'bg-yellow-500';
    };

    const getClassName = (cId, sId) => {
        const c = classData?.find(cl => cl.id === cId);
        if (!c) return "Unknown";
        const s = c.sections?.find(sec => sec.id === sId);
        return `${c.name} ${s ? s.name : ''}`;
    };

    const getSubjectName = (sId) => {
        const s = subjectData?.find(sub => sub.id === sId);
        return s ? s.name : "Unknown";
    };

    const getFormattedExportData = () => {
        return filteredData.map((r) => ({
            "Emp ID": r.employeeId || "-",
            "Name": r.name ? r.name.toUpperCase() : "-",
            "Role": r.role || "-",
            "Classes Handled": r.metrics.classesCount,
            "Subjects Taught": r.metrics.subjectsCount,
            "Periods Assigned": r.metrics.totalAssigned,
            "Max Capacity": r.metrics.capacity,
            "Utilization %": r.metrics.utilizationPercent + "%",
        }));
    };

    const exportToCSV = () => {
        if (filteredData.length === 0) return toast.error("No data to export.");
        const data = getFormattedExportData();
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Teacher Workload");
        XLSX.writeFile(workbook, `Teacher_Workload_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportToPDF = () => {
        if (filteredData.length === 0) return toast.error("No data to export.");
        const doc = new jsPDF('p', 'pt', 'a4');
        const data = getFormattedExportData();

        const primaryColor = [148, 146, 146];
        const textColor = [0, 0, 0];

        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, doc.internal.pageSize.width, 80, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(branchInfo?.name || "School Database", 40, 40);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Teacher Workload & Capacity Report", 40, 60);

        doc.setTextColor(...textColor);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 40, 110, { align: 'right' });
        doc.setFont("helvetica", "bold");
        doc.text("Report Summary:", 40, 110);
        doc.setFont("helvetica", "normal");
        doc.text(`Total Teachers: ${totalTeachers} | Avg Load: ${avgUtilization}% | Overloaded (>85%): ${overloadedTeachers}`, 40, 125);

        doc.setDrawColor(200, 200, 200);
        doc.line(40, 140, doc.internal.pageSize.width - 40, 140);

        const tableColumn = ["Emp ID", "Name", "Role", "Classes", "Subjects", "Assigned", "Capacity", "% Load"];
        const tableRows = data.map(row => [
            row["Emp ID"], row["Name"], row["Role"], row["Classes Handled"],
            row["Subjects Taught"], row["Periods Assigned"], row["Max Capacity"], row["Utilization %"]
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 160,
            styles: { fontSize: 9, font: "helvetica", cellPadding: 6, textColor: [60, 60, 60], lineColor: [220, 220, 220], lineWidth: 0.5 },
            headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didDrawPage: function (data) {
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text("Page " + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.height - 20);
                doc.text("Generated via Appitor", doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 20, { align: 'right' });
            }
        });

        doc.save(`Teacher_Workload_${(branchInfo?.name || "Branch").replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
    };

    return (
        <RequirePermission permission="report.workload.view">
            <div className="max-w-7xl mx-auto space-y-4 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                            <LayoutDashboard size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Teacher Workload</h1>
                            <p className="text-sm text-(--text-muted)">Monitor timetable distribution and capacity</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportToCSV}
                            disabled={filteredData.length === 0}
                            className="btn-outline flex justify-center items-center gap-2"
                        >
                            <FileText size={16} color="green" /> Export Excel
                        </button>
                        <button
                            onClick={exportToPDF}
                            disabled={filteredData.length === 0}
                            className="btn-outline flex justify-center items-center gap-2"
                        >
                            <Download size={16} color="red" /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-(--bg-card) border border-(--border) p-5 rounded-xl shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-600'}`}>
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-(--text-muted)">Teaching Staff</p>
                            <h2 className="text-2xl font-bold text-(--text)">{totalTeachers} <span className="text-xs font-normal text-(--text-muted)">evaluating</span></h2>
                        </div>
                    </div>
                    <div className="bg-(--bg-card) border border-(--border) p-5 rounded-xl shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-600'}`}>
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-(--text-muted)">Average Load</p>
                            <h2 className="text-2xl font-bold text-(--text)">{avgUtilization}% <span className="text-xs font-normal text-(--text-muted)">utilization</span></h2>
                        </div>
                    </div>
                    <div className="bg-(--bg-card) border border-(--border) p-5 rounded-xl shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${overloadedTeachers > 0 ? `${theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-600'}` : `${theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'}`}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-(--text-muted)">Overloaded Teachers</p>
                            <h2 className="text-2xl font-bold text-(--text)">{overloadedTeachers} <span className="text-xs font-normal text-(--text-muted)">(&gt;85% capacity)</span></h2>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-(--bg-card) border border-(--border) rounded-xl shadow-sm overflow-hidden flex flex-col">
                    {/* Table Toolbar */}
                    <div className="p-4 border-b border-(--border) bg-(--bg-soft) flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                        <h2 className="text-sm font-semibold flex items-center gap-2 text-(--text)">
                            Workload Matrix
                        </h2>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input w-full pl-9 h-9 text-sm"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    <div className="flex-1 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-(--bg-soft) sticky top-0 z-10 shadow-sm border-b border-(--border)">
                                <tr className="text-left text-(--text-muted)">
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Emp ID</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Teacher Name</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Classes</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Subjects</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Periods / Wk</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Capacity Load</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border)">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12 text-center text-(--text-muted)">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--primary) mx-auto mb-4"></div>
                                            Calculating workloads... (1 Read request)
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12 text-center text-(--text-muted)">
                                            No teaching staff found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((t) => (
                                        <tr key={t.uid} className="hover:bg-(--bg-soft) transition-colors cursor-pointer" onClick={() => setSelectedTeacher(t)}>
                                            <td className="px-4 py-3 whitespace-nowrap text-(--text) font-medium">{t.employeeId || "-"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <p className="text-(--text) font-semibold capitalize">{t.name}</p>
                                                <p className="text-xs text-(--text-muted) capitalize">{t.role}</p>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-(--text-muted)">{t.metrics.classesCount}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-(--text-muted)">{t.metrics.subjectsCount}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className="font-semibold text-(--text)">{t.metrics.totalAssigned}</span>
                                                <span className="text-xs text-(--text-muted)"> / {t.metrics.capacity}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <div className="flex items-center gap-3 max-w-[150px]">
                                                    <div className={`h-2 w-full ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} rounded-full overflow-hidden flex-1 border border-black/5 ${theme === 'dark' ? 'dark:border-white/5' : 'dark:border-white/5'}`}>
                                                        <div
                                                            className={`h-full rounded-full ${getUtilizationBarColor(t.metrics.utilizationPercent)}`}
                                                            style={{ width: `${Math.min(t.metrics.utilizationPercent, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${getUtilizationColor(t.metrics.utilizationPercent)}`}>
                                                        {t.metrics.utilizationPercent}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-right">
                                                <button
                                                    className="p-1.5 hover:bg-(--primary-soft) hover:text-(--primary) rounded-md transition-colors text-(--text-muted)"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedTeacher(t); }}
                                                >
                                                    <CalendarDays size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Timetable Quick View Drawer/Modal */}
                {selectedTeacher && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end transition-opacity">
                        <div className="w-full max-w-2xl bg-(--bg-card) h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

                            {/* Drawer Header */}
                            <div className="p-5 border-b border-(--border) flex justify-between items-center bg-(--bg-soft) shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center font-bold text-xl uppercase border border-(--primary)/20">
                                        {selectedTeacher.name?.charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-(--text) capitalize">{selectedTeacher.name}</h2>
                                        <p className="text-sm text-(--text-muted) capitalize">{selectedTeacher.role} • {selectedTeacher.employeeId}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedTeacher(null)}
                                    className="p-2 rounded-full text-gray-500 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Drawer Body - Quick Stats */}
                            <div className="p-5 flex gap-4 shrink-0 overflow-x-auto border-b border-(--border)">
                                <div className="bg-(--bg-soft) px-4 py-3 rounded-lg border border-(--border) flex-1 min-w-[120px]">
                                    <p className="text-xs text-(--text-muted) mb-1 uppercase font-semibold">Utilization</p>
                                    <p className={`text-xl font-bold ${selectedTeacher.metrics.utilizationPercent > 85 ? 'text-red-500' : 'text-(--primary)'}`}>
                                        {selectedTeacher.metrics.utilizationPercent}%
                                    </p>
                                </div>
                                <div className="bg-(--bg-soft) px-4 py-3 rounded-lg border border-(--border) flex-1 min-w-[120px]">
                                    <p className="text-xs text-(--text-muted) mb-1 uppercase font-semibold">Periods Assigned</p>
                                    <p className="text-xl font-bold text-(--text)">
                                        {selectedTeacher.metrics.totalAssigned} <span className="text-sm font-medium text-(--text-muted)">/ {selectedTeacher.metrics.capacity}</span>
                                    </p>
                                </div>
                                <div className="bg-(--bg-soft) px-4 py-3 rounded-lg border border-(--border) flex-1 min-w-[120px]">
                                    <p className="text-xs text-(--text-muted) mb-1 uppercase font-semibold">Unique Classes</p>
                                    <p className="text-xl font-bold text-(--text)">{selectedTeacher.metrics.classesCount}</p>
                                </div>
                            </div>

                            {/* Drawer Body - Timetable Grid */}
                            <div className="p-5 flex-1 overflow-y-auto bg-(--bg)">
                                <h3 className="text-sm font-semibold text-(--text) mb-4 uppercase tracking-wider flex items-center gap-2">
                                    <CalendarDays size={16} /> Weekly Schedule View
                                </h3>

                                {settings && settings.workingDays ? (
                                    <div className="grid gap-3">
                                        {settings.workingDays.map(day => {
                                            // Find slots for this day
                                            const daySlots = selectedTeacher.slots.filter(s => s.day === day).sort((a, b) => a.period - b.period);

                                            return (
                                                <div key={day} className="border border-(--border) rounded-lg bg-(--bg-card) overflow-hidden shadow-sm">
                                                    <div className="bg-(--bg-soft) px-4 py-2 border-b border-(--border) font-semibold text-sm text-(--text)">
                                                        {day}
                                                    </div>
                                                    <div className="p-3">
                                                        {daySlots.length > 0 ? (
                                                            <div className="flex flex-wrap gap-2">
                                                                {daySlots.map((slot, idx) => (
                                                                    <div key={idx} className="bg-[var(--status-m-bg)] text-[var(--status-m-text)] bg-opacity-10 border border-[var(--status-m-bg)] border-opacity-30 rounded-md p-2 min-w-[140px] flex-1">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className="text-xs font-bold opacity-70">Period {slot.period}</span>
                                                                            <Book size={12} className="opacity-50" />
                                                                        </div>
                                                                        <div className="font-semibold text-sm line-clamp-1">{getSubjectName(slot.subjectId)}</div>
                                                                        <div className="text-xs opacity-80 mt-0.5 font-medium">{getClassName(slot.classId, slot.sectionId)}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-(--text-muted) italic px-2 py-3">Free all day</div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center p-8 text-(--text-muted)">Timetable settings not found.</div>
                                )}
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </RequirePermission>
    );
}

