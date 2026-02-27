import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportPeriodTimetablePdf({ schoolName, day, period, busyTeachers, freeTeachers, getTeacherName, getClassName, getSection, getSubjectName }) {
    const doc = new jsPDF("p", "pt", "a4");
    const PRIMARY = "#e45011";
    const BORDER = "#e5e7eb";
    const TEXT = "#0f172a";
    const MUTED = "#64748b";

    doc.setFillColor(PRIMARY);
    doc.rect(0, 0, doc.internal.pageSize.width, 70, "F");
    doc.setTextColor("#ffffff");
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(schoolName || "School Name", 40, 42);

    doc.setFontSize(14);
    doc.text(
        `${day} • Period ${period}`,
        doc.internal.pageSize.width - 40,
        42,
        { align: "right" }
    );

    doc.setFontSize(14);
    doc.setTextColor(TEXT);
    doc.text("Engaged Faculty", 40, 100);

    const busyHead = [["Teacher", "Assignment", "Status"]];
    const busyBody = busyTeachers.map(e => [
        getTeacherName(e.teacherId),
        `${getClassName(e.classId)} ${getSection(e.classId, e.sectionId)} - ${getSubjectName(e.subjectId)}`,
        "Busy"
    ]);

    autoTable(doc, {
        startY: 115,
        head: busyHead,
        body: busyBody.length ? busyBody : [["No teachers occupied", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 9 }
    });

    const nextY = doc.lastAutoTable.finalY + 30;
    doc.setTextColor(TEXT);
    doc.text("Available Faculty (Substitution Assist)", 40, nextY);

    const freeHead = [["Teacher", "Employee ID", "Status"]];
    const freeBody = freeTeachers.map(t => [
        t.name,
        t.employeeId || "-",
        "Available"
    ]);

    autoTable(doc, {
        startY: nextY + 15,
        head: freeHead,
        body: freeBody.length ? freeBody : [["No free teachers available", "-", "-"]],
        theme: "grid",
        headStyles: { fillColor: [34, 197, 94] },
        styles: { fontSize: 9 }
    });

    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(MUTED);
    doc.text(
        `Generated on ${new Date().toLocaleString()}`,
        40,
        pageHeight - 20
    );

    doc.save(
        `${schoolName || "School"}_Period_${day}_P${period}_Report.pdf`
    );
}
