"use client";

import { useState } from "react";
import { BarChart3, Filter, Download, FileText, Users } from "lucide-react";
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

export default function StudentReportsPage() {
    const { classData, schoolUser, sessionList, currentSession } = useSchool();
    const { branchInfo } = useBranch();
    const { theme } = useTheme();

    const [filters, setFilters] = useState({
        sessionId: currentSession || "",
        className: "",
        section: "",
        status: "",
        gender: ""
    });

    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);

    const selectedClass = classData?.find((c) => c.id === filters.className);

    const handleFilterChange = (key, value) => {
        setFilters(prev => {
            const updated = { ...prev, [key]: value };
            if (key === 'className') updated.section = ''; // Reset section if class changes
            return updated;
        });
    };

    async function fetchReportData() {
        if (!filters.className) {
            toast.error("Please select a class to generate the report.");
            return;
        }

        setLoading(true);
        try {
            if (!filters.sessionId) {
                toast.error("Please select a session.");
                return;
            }

            const basePath = [
                "schools",
                branchInfo.schoolId,
                "branches",
                branchInfo.id,
                "meta",
            ];

            let fetchedStudents = [];

            if (filters.section) {
                const rosterRef = doc(db, ...basePath, `${filters.className}_${filters.section}_${filters.sessionId}`);
                const snap = await getDoc(rosterRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const classId = data.classId;
                    const sectionId = data.sectionId;
                    fetchedStudents = (data.students || []).map((s) => ({
                        ...s,
                        classId,
                        sectionId,
                    }));
                }
            } else {
                const metaColRef = collection(db, ...basePath);
                const snaps = await getDocs(metaColRef);
                snaps.forEach((d) => {
                    const data = d.data();
                    const docId = d.id;
                    // Check if docId ends with current session or matches filters.sessionId
                    if (data.classId === filters.className && docId.endsWith(`_${filters.sessionId}`) && Array.isArray(data.students)) {
                        const classId = data.classId;
                        const sectionId = data.sectionId;
                        fetchedStudents.push(
                            ...data.students.map((s) => ({
                                ...s,
                                classId,
                                sectionId,
                            }))
                        );
                    }
                });
            }

            // Apply Frontend Filters
            if (filters.status) {
                fetchedStudents = fetchedStudents.filter(s => s.status === filters.status);
            }
            if (filters.gender) {
                fetchedStudents = fetchedStudents.filter(s => s.gender?.toLowerCase() === filters.gender.toLowerCase());
            }

            // Sort by App ID
            fetchedStudents.sort((a, b) => String(a.appId).localeCompare(String(b.appId)));
            setStudents(fetchedStudents);

            if (fetchedStudents.length === 0) {
                toast.info("No students found matching the selected criteria.");
            }

        } catch (err) {
            console.error("FETCH REPORT ERROR:", err);
            toast.error("Failed to generate report.");
        } finally {
            setLoading(false);
        }
    }

    // Helper to format data for exports
    const getFormattedExportData = () => {
        return students.map((s) => ({
            "Roll No": s.rollNo || "-",
            "App ID": s.appId || "-",
            "Name": s.name ? s.name.toUpperCase() : "-",
            "Gender": s.gender || "-",
            "DOB": s.dob || "-",
            "Class": classData?.find(c => c.id === s.classId)?.name || "-",
            "Section": classData?.find(c => c.id === s.classId)?.sections?.find(sec => sec.id === s.sectionId)?.name || "-",
            "Status": s.status ? s.status.toUpperCase() : "-",
        }));
    };

    const exportToCSV = () => {
        if (students.length === 0) {
            toast.error("No data to export.");
            return;
        }
        const data = getFormattedExportData();
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Student_Report");
        XLSX.writeFile(workbook, `Student_Report_${branchInfo?.name || "Branch"}_${new Date().toLocaleDateString()}.xlsx`);
    };

    const exportToPDF = () => {
        if (students.length === 0) {
            toast.error("No data to export.");
            return;
        }

        const doc = new jsPDF('p', 'pt', 'a4');
        const data = getFormattedExportData();

        // Colors
        const primaryColor = [41, 128, 185]; // Professional Blue
        const textColor = [51, 51, 51];

        // Professional Header
        doc.setFillColor(...primaryColor);
        doc.rect(0, 0, doc.internal.pageSize.width, 80, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text(branchInfo?.name || "School Database", 40, 40);

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Student Roster Report", 40, 60);

        // Date & Filters Section
        doc.setTextColor(...textColor);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.width - 40, 110, { align: 'right' });

        let filterText = `Class: ${classData?.find(c => c.id === filters.className)?.name || "All"}`;
        if (filters.section) filterText += ` | Section: ${selectedClass?.sections?.find(s => s.id === filters.section)?.name || "All"}`;
        if (filters.status) filterText += ` | Status: ${filters.status}`;
        if (filters.gender) filterText += ` | Gender: ${filters.gender}`;

        doc.setFont("helvetica", "bold");
        doc.text("Report Criteria:", 40, 110);
        doc.setFont("helvetica", "normal");
        doc.text(filterText, 40, 125);

        // Line Separator
        doc.setDrawColor(200, 200, 200);
        doc.line(40, 140, doc.internal.pageSize.width - 40, 140);

        // Table Data
        const tableColumn = ["Roll No", "App ID", "Name", "Gender", "DOB", "Class", "Section", "Status"];
        const tableRows = data.map(row => [
            row["Roll No"],
            row["App ID"],
            row["Name"],
            row["Gender"],
            row["DOB"],
            row["Class"],
            row["Section"],
            row["Status"]
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 160,
            styles: {
                fontSize: 9,
                font: "helvetica",
                cellPadding: 6,
                textColor: [60, 60, 60],
                lineColor: [220, 220, 220],
                lineWidth: 0.5,
            },
            headStyles: {
                fillColor: primaryColor,
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'left'
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252] // Slate-50 background for alternating rows
            },
            didDrawPage: function (data) {
                // Footer logic
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
        doc.save(`Student_Report_${safeBranchName}_${new Date().toLocaleDateString()}.pdf`);
    };

    return (
        <RequirePermission permission="report.student.view">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                            <BarChart3 size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold text-(--text)">Student Reports</h1>
                            <p className="text-sm text-(--text-muted)">Generate, view, and export student data</p>
                        </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={exportToCSV}
                            disabled={students.length === 0}
                            className="btn-outline flex items-center gap-2"
                        >
                            <FileText size={16} color="green" /> Export Excel
                        </button>
                        <button
                            onClick={exportToPDF}
                            disabled={students.length === 0}
                            className="btn-outline flex items-center gap-2"
                        >
                            <Download size={16} color="red" /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Filter Card */}
                <div className="">

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Session <span className="text-red-500">*</span></label>
                            <select
                                className="input w-full"
                                value={filters.sessionId}
                                onChange={e => handleFilterChange('sessionId', e.target.value)}
                            >
                                <option value="">Select Session</option>
                                {sessionList?.map(s => (
                                    <option key={s.id} value={s.id}>{s.id}</option>
                                ))}
                            </select>
                        </div>

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

                        <div>
                            <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Status</label>
                            <select
                                className="input w-full"
                                value={filters.status}
                                onChange={e => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="disabled">Disabled</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-(--text-muted) uppercase mb-1 block">Gender</label>
                            <select
                                className="input w-full"
                                value={filters.gender}
                                onChange={e => handleFilterChange('gender', e.target.value)}
                            >
                                <option value="">All Genders</option>
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={fetchReportData}
                                disabled={loading}
                                className="btn-primary w-full h-10 flex items-center justify-center gap-2"
                            >
                                {loading ? "Generating..." : "Generate Report"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="border border-(--border) rounded-xl overflow-hidden bg-(--bg) shadow-sm">
                    <div className="p-4 border-b border-(--border) flex justify-between items-center bg-(--bg-soft)">
                        <h2 className="text-sm font-semibold flex items-center gap-2 text-(--text)">
                            Report Preview
                        </h2>
                        <span className="text-xs font-medium px-2 py-1 rounded-md bg-(--primary-soft) text-(--primary)">
                            {students.length} Records Found
                        </span>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="min-w-full text-sm shrink-0">
                            <thead className="bg-(--bg-soft) sticky top-0 z-10 shadow-sm">
                                <tr className="text-left text-(--text-muted)">
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Roll No</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">App ID</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Class - Section</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Gender</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">DOB</th>
                                    <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border)">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-12 text-center text-(--text-muted)">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--primary) mx-auto mb-4"></div>
                                            Generating your report...
                                        </td>
                                    </tr>
                                ) : students.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-12 text-center text-(--text-muted)">
                                            Set your filters and click "Generate Report"
                                        </td>
                                    </tr>
                                ) : (
                                    students.map((s) => (
                                        <tr key={s.uid} className="hover:bg-(--bg-soft) transition-colors">
                                            <td className="px-4 py-3 font-medium whitespace-nowrap text-(--text)">{s.rollNo.toString().padStart(2, '0') || "-"}</td>
                                            <td className="px-4 py-3 font-medium whitespace-nowrap text-(--text)">{s.appId || "-"}</td>
                                            <td className="px-4 py-3 font-medium capitalize whitespace-nowrap text-(--text)">{s.name || "-"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-(--text)">
                                                {classData?.find((c) => c.id === s.classId)?.name || "-"} - {" "}
                                                {classData?.find((c) => c.id === s.classId)?.sections?.find((sec) => sec.id === s.sectionId)?.name || "-"}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-(--text)">{s.gender || "-"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-(--text)">{s.dob || "-"}</td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase
                                                        ${s.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}
                                                    `}>
                                                    {s.status || "-"}
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
