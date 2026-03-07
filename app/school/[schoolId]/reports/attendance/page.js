"use client";

import { useState } from "react";
import { BarChart3, Filter, Download, FileText, Users, LayoutList, Zap } from "lucide-react";
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

export default function AttendanceReportsPage() {
    const { classData, schoolUser, employeeData } = useSchool();
    const { branchInfo, branch } = useBranch();
    const { theme } = useTheme();
    const [reportType, setReportType] = useState("students");

    const [filters, setFilters] = useState({
        monthYear: new Date().toISOString().slice(0, 7),
        className: "",
        section: "",
    });

    const [records, setRecords] = useState([]);
    const [monthDays, setMonthDays] = useState([]);
    const [loading, setLoading] = useState(false);

    const selectedClass = classData?.find((c) => c.id === filters.className);

    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const updated = { ...prev, [key]: value };
            if (key === 'className') updated.section = '';
            return updated;
        });
    };

    const getDaysInMonth = (monthStr) => {
        if (!monthStr) return [];
        const [year, m] = monthStr.split("-");
        const totalDays = new Date(year, m, 0).getDate();
        return Array.from({ length: totalDays }, (_, i) => i + 1);
    };

    async function fetchAttendanceReport() {
        if (!filters.monthYear) {
            toast.error("Please select a month to generate the report.");
            return;
        }

        if (reportType === "students" && !filters.className) {
            toast.error("Please select a class for the student report.");
            return;
        }

        setLoading(true);
        try {
            const basePath = [
                "schools",
                branchInfo.schoolId,
                "branches",
                branchInfo.id,
            ];

            const [year, m] = filters.monthYear.split("-");
            const sessionStr = Number(m) <= 3
                ? `${Number(year) - 1}-${year.slice(-2)}`
                : `${year}-${(Number(year) + 1).toString().slice(-2)}`;
            const dList = getDaysInMonth(filters.monthYear);
            setMonthDays(dList);
            let entities = [];
            if (reportType === "students") {
                if (filters.section) {
                    const rosterRef = doc(db, ...basePath, "meta", `${filters.className}_${filters.section}_${sessionStr}`);
                    const snap = await getDoc(rosterRef);
                    if (snap.exists()) {
                        const data = snap.data();
                        entities = (data.students || []).map((s) => ({ ...s, classId: data.classId, sectionId: data.sectionId }));
                    }
                } else {
                    const metaColRef = collection(db, ...basePath, "meta");
                    const snaps = await getDocs(metaColRef);
                    snaps.forEach((d) => {
                        const data = d.data();
                        if (d.id.endsWith(`_${sessionStr}`) && data.classId === filters.className && Array.isArray(data.students)) {
                            entities.push(...data.students.map((s) => ({ ...s, classId: data.classId, sectionId: data.sectionId })));
                        }
                    });
                }
                entities = entities.filter(s => s.status === 'active');
            } else {
                entities = employeeData.filter(e => e.status !== 'disabled');
            }
            const promises = dList.map(async (d) => {
                const day = String(d).padStart(2, "0");
                const formattedDate = `${day}-${m}-${year}`;

                let docId = "";
                if (reportType === "students") {
                    let requiredSections = filters.section ? [filters.section] : (selectedClass?.sections?.map(s => s.id) || []);
                    let dailyRecords = {};
                    for (const sec of requiredSections) {
                        const stDocId = `student_${formattedDate}_${filters.className}_${sec}`;
                        const snap = await getDoc(doc(db, ...basePath, "attendance", stDocId));
                        if (snap.exists()) {
                            dailyRecords = { ...dailyRecords, ...(snap.data().records || {}) };
                        }
                    }
                    return dailyRecords;

                } else {
                    docId = `employee_${formattedDate}`;
                    const snap = await getDoc(doc(db, ...basePath, "attendance", docId));
                    return snap.exists() ? snap.data().records || {} : {};
                }
            });

            const allDailyRecords = await Promise.all(promises);

            const calculatedRecords = entities.map(entity => {
                let P = 0, A = 0, L = 0, M = 0, H = 0, O = 0;
                let totalMarked = 0;

                allDailyRecords.forEach(dayRecords => {
                    const status = dayRecords[entity.uid];
                    if (status) {
                        totalMarked++;
                        if (status === "P") P++;
                        if (status === "A") A++;
                        if (status === "L") L++;
                        if (status === "M") M++;
                        if (status === "H") H++;
                        if (status === "O") O++;
                    }
                });

                let presentScore = P + (0.5 * L) + (0.5 * M) + (0.5 * H);
                if (reportType === 'employees') presentScore = P;
                const percent = totalMarked === 0 ? 0 : Math.round((presentScore / totalMarked) * 100);

                return {
                    ...entity,
                    stats: {
                        P, A, L, M, H, O, totalMarked, percent
                    }
                }
            });

            if (reportType === 'students') {
                calculatedRecords.sort((a, b) => String(a.appId).localeCompare(String(b.appId)));
            } else {
                calculatedRecords.sort((a, b) => String(a.employeeId).localeCompare(String(b.employeeId)));
            }

            setRecords(calculatedRecords);

            if (calculatedRecords.length === 0) {
                toast.info("No records found matching the criteria.");
            }

        } catch (err) {
            console.error("FETCH REPORT ERROR:", err);
            toast.error("Failed to generate report.");
        } finally {
            setLoading(false);
        }
    }

    const getFormattedExportData = () => {
        return records.map((r) => {
            const base = {
                "ID": reportType === 'students' ? (r.appId || "-") : (r.employeeId || "-"),
                "Name": r.name ? r.name.toUpperCase() : "-",
            };

            if (reportType === 'students') {
                base["Roll No"] = r.rollNo || "-";
                base["Class"] = classData?.find(c => c.id === r.classId)?.name || "-";
                base["Section"] = classData?.find(c => c.id === r.classId)?.sections?.find(sec => sec.id === r.sectionId)?.name || "-";
            } else {
                base["Role"] = r.role || "-";
            }

            base["P"] = r.stats.P;
            base["A"] = r.stats.A;
            base["L"] = r.stats.L;
            if (reportType === 'students') {
                base["M"] = r.stats.M;
            } else {
                base["H"] = r.stats.H;
                base["O"] = r.stats.O;
            }
            base["Total Marked"] = r.stats.totalMarked;
            base["%"] = r.stats.percent + "%";

            return base;
        });
    };

    const exportToCSV = () => {
        if (records.length === 0) {
            toast.error("No data to export.");
            return;
        }
        const data = getFormattedExportData();
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance_Report");
        XLSX.writeFile(workbook, `Attendance_Report_${reportType}_${filters.monthYear}_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportToPDF = () => {
        if (records.length === 0) {
            toast.error("No data to export.");
            return;
        }

        const doc = new jsPDF('p', 'pt', 'a4');
        const data = getFormattedExportData();

        const primaryColor = [15, 23, 42];
        const textColor = [15, 23, 42];

        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, doc.internal.pageSize.width, 80, 'F');
        doc.setTextColor(255, 255, 255);

        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(schoolUser?.schoolName?.toUpperCase() || "APPITOR SCHOOL", 40, 38);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225);
        doc.text(branchInfo?.name || "Main Campus", 40, 52);

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        const capType = reportType.charAt(0).toUpperCase() + reportType.slice(1);
        doc.text(`ATTENDANCE CATEGORY REPORT | ${capType}`, 40, 64);

        doc.setTextColor(...textColor);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 40, 110, { align: 'right' });

        let filterText = `Month: ${filters.monthYear}`;
        if (reportType === 'students') {
            filterText += ` | Class: ${classData?.find(c => c.id === filters.className)?.name || "All"}`;
            if (filters.section) filterText += ` | Section: ${selectedClass?.sections?.find(s => s.id === filters.section)?.name || "All"}`;
        }

        doc.setFont("helvetica", "bold");
        doc.text("Report Criteria:", 40, 110);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(15, 23, 42);
        doc.text(filterText, 40, 125);

        doc.setDrawColor(200, 200, 200);
        doc.line(40, 140, doc.internal.pageSize.width - 40, 140);

        let tableColumn = [];
        if (reportType === 'students') tableColumn = ["ID", "Roll No", "Name", "Class", "Section", "P", "A", "L", "M", "Marked", "%"];
        else tableColumn = ["ID", "Name", "Role", "P", "A", "L", "H", "O", "Marked", "%"];

        const tableRows = data.map(row => {
            if (reportType === 'students') return [row["ID"], row["Roll No"].toString().padStart(2, '0'), row["Name"], row["Class"], row["Section"], row["P"], row["A"], row["L"], row["M"], row["Total Marked"], row["%"]];
            return [row["ID"], row["Name"], row["Role"], row["P"], row["A"], row["L"], row["H"], row["O"], row["Total Marked"], row["%"]];
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 160,
            styles: {
                fontSize: 9,
                font: "helvetica",
                cellPadding: 6,
                textColor: [15, 23, 42],
                lineColor: [226, 232, 240],
                lineWidth: 0.5,
            },
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            },
            didDrawPage: function (data) {
                const pageNumber = "Page " + doc.internal.getNumberOfPages();
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(
                    pageNumber,
                    data.settings.margin.left,
                    doc.internal.pageSize.height - 20
                );
                doc.text(
                    "Generated via Appitor",
                    doc.internal.pageSize.width - data.settings.margin.right,
                    doc.internal.pageSize.height - 20,
                    { align: 'right' }
                );
            }
        });

        const safeBranchName = (branchInfo?.name || "Branch").replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Attendance_Report_${reportType}_${filters.monthYear}_${safeBranchName}.pdf`);
    };

    const getStatusColor = (percent) => {
        if (percent >= 75) return theme == 'dark' ? 'bg-green-950 text-green-500' : 'bg-green-100 text-green-700';
        if (percent >= 60) return theme == 'dark' ? 'bg-yellow-950 text-yellow-500' : 'bg-yellow-100 text-yellow-700';
        return theme == 'dark' ? 'bg-red-950 text-red-500' : 'bg-red-100 text-red-700';
    };

    return (
        <RequirePermission permission="report.attendance.view">
            <div className="max-w-7xl mx-auto space-y-5">
                {/* Header & Controls */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
                            <BarChart3 size={20} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Attendance Reports</h1>
                            <p className="text-xs font-semibold text-(--text-muted)">Monthly attendance summaries</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        {/* Export Buttons */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={exportToCSV}
                                disabled={records.length === 0}
                                className="btn-outline flex-1 md:flex-none justify-center items-center gap-2"
                            >
                                <FileText size={16} color="green" /> Export Excel
                            </button>
                            <button
                                onClick={exportToPDF}
                                disabled={records.length === 0}
                                className="btn-outline flex-1 md:flex-none justify-center items-center gap-2"
                            >
                                <Download size={16} color="red" /> Export PDF
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filter Card */}
                <div className="flex flex-col gap-4">
                    {/* Scope Selection */}
                    <div className="flex items-center gap-3">
                        <div className="flex border border-(--border) bg-(--bg-card) rounded-lg overflow-hidden">
                            <button
                                onClick={() => { setReportType("students"); setRecords([]); }}
                                className={`px-4 py-2 rounded-none rounded-l-md text-sm font-semibold flex items-center gap-2 ${reportType === "students"
                                    ? "bg-(--primary) text-white"
                                    : "text-(--text-muted) hover:bg-(--bg-soft)"
                                    }`}
                            >
                                <Users size={16} /> Students
                            </button>
                            <button
                                onClick={() => { setReportType("employees"); setRecords([]); }}
                                className={`px-4 py-2 rounded-none rounded-r-md text-sm font-semibold flex items-center gap-2 ${reportType === "employees"
                                    ? "bg-(--primary) text-white"
                                    : "text-(--text-muted) hover:bg-(--bg-soft)"
                                    }`}
                            >
                                <LayoutList size={16} /> Employees
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Month & Year <span className="text-red-500">*</span></label>
                            <input
                                type="month"
                                className="input w-full"
                                value={filters.monthYear}
                                onChange={(e) => handleFilterChange('monthYear', e.target.value)}
                            />
                        </div>

                        {reportType === "students" && (
                            <>
                                <div>
                                    <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Class <span className="text-red-500">*</span></label>
                                    <select
                                        className="input w-full"
                                        value={filters.className}
                                        onChange={e => handleFilterChange('className', e.target.value)}
                                    >
                                        <option value="">Select class</option>
                                        {classData?.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Section</label>
                                    <select
                                        className="input w-full"
                                        value={filters.section}
                                        disabled={!filters.className}
                                        onChange={e => handleFilterChange('section', e.target.value)}
                                    >
                                        <option value="">All sections</option>
                                        {selectedClass?.sections?.map(sec => (
                                            <option key={sec.id} value={sec.id}>{sec.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}

                        <div className="flex items-end">
                            <button
                                onClick={fetchAttendanceReport}
                                disabled={loading}
                                className="btn-primary w-full h-10 flex items-center justify-center gap-2"
                            >
                                {loading ? "Generating..." : "Generate Report"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="border border-(--border) rounded-xl overflow-hidden bg-(--bg-card) shadow-sm">
                    <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
                        <h2 className="text-sm font-semibold flex items-center gap-2 text-(--text)">
                            Report Preview
                        </h2>
                        <span className="text-xs font-medium px-2 py-1 rounded-md bg-(--primary-soft) text-(--primary)">
                            {records.length} Records Found
                        </span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="min-w-full text-sm shrink-0">
                            <thead className="bg-(--bg-soft) sticky top-0 z-10 shadow-sm">
                                <tr className="text-left text-(--text-muted)">
                                    {reportType === 'students' ? (
                                        <>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Roll No</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap">App ID</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Class - Section</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Emp ID</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Role</th>
                                        </>
                                    )}
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">P</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">A</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">L</th>
                                    {reportType === 'students' ? (
                                        <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">M</th>
                                    ) : (
                                        <>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">H</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">O</th>
                                        </>
                                    )}
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Marked</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">Total %</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border)">
                                {loading ? (
                                    <tr>
                                        <td colSpan="12" className="px-4 py-12 text-center text-(--text-muted)">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--primary) mx-auto mb-4"></div>
                                            Crunching numbers...
                                        </td>
                                    </tr>
                                ) : records.length === 0 ? (
                                    <tr>
                                        <td colSpan="12" className="px-4 py-12 text-center text-(--text-muted)">
                                            Set your filters and click "Generate Report"
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((r) => (
                                        <tr key={r.uid} className="hover:bg-(--bg-soft) transition-colors">
                                            {reportType === 'students' ? (
                                                <>
                                                    <td className="px-4 py-3 font-medium whitespace-nowrap text-(--text)">{(r.rollNo?.toString() || "").padStart(2, '0') || "-"}</td>
                                                    <td className="px-4 py-3 font-medium whitespace-nowrap text-(--text)">{r.appId || "-"}</td>
                                                    <td className="px-4 py-3 font-medium capitalize whitespace-nowrap text-(--text)">{r.name || "-"}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-(--text)">
                                                        {classData?.find((c) => c.id === r.classId)?.name || "-"} - {" "}
                                                        {classData?.find((c) => c.id === r.classId)?.sections?.find((sec) => sec.id === r.sectionId)?.name || "-"}
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 font-medium whitespace-nowrap text-(--text)">{r.employeeId || "-"}</td>
                                                    <td className="px-4 py-3 font-medium capitalize whitespace-nowrap text-(--text)">{r.name || "-"}</td>
                                                    <td className="px-4 py-3 capitalize whitespace-nowrap text-(--text)">{r.role || "-"}</td>
                                                </>
                                            )}

                                            <td className="px-4 py-3 whitespace-nowrap text-center font-medium bg-[var(--status-p-bg)] text-[var(--status-p-text)] bg-opacity-20">{r.stats.P}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center font-medium bg-[var(--status-a-bg)] text-[var(--status-a-text)] bg-opacity-20">{r.stats.A}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center font-medium bg-[var(--status-l-bg)] text-[var(--status-l-text)] bg-opacity-20">{r.stats.L}</td>
                                            {reportType === 'students' ? (
                                                <td className="px-4 py-3 whitespace-nowrap text-center font-medium bg-[var(--status-m-bg)] text-[var(--status-m-text)] bg-opacity-20">{r.stats.M}</td>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center font-medium bg-[var(--status-h-bg)] text-[var(--status-h-text)] bg-opacity-20">{r.stats.H}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center font-medium bg-[var(--status-o-bg)] text-[var(--status-o-text)] bg-opacity-20">{r.stats.O}</td>
                                                </>
                                            )}
                                            <td className="px-4 py-3 whitespace-nowrap text-center text-(--text-muted)">{r.stats.totalMarked}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${getStatusColor(r.stats.percent)}`}>
                                                    {r.stats.percent}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </RequirePermission>
    );
}
