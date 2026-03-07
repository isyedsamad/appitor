import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function capitalizeWords(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 0)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export function exportTeacherTimetablePdf({ schoolName, branchName, teacherName, employeeId, slots, days, periods, breaks = [], getClassName, getSection, getSubjectName }) {
    const doc = new jsPDF("landscape", "pt", "a4");
    const PRIMARY = "#e45011";
    const BORDER = "#e5e7eb";
    const TEXT = "#0f172a";
    const MUTED = "#64748b";
    const BREAK_BG = "#fff7ed";
    const BREAK_TEXT = "#c2410c";

    doc.setFillColor(15, 23, 42); // Navy background
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 80, 'F');
    doc.setTextColor(255, 255, 255);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(schoolName?.toUpperCase() || "APPITOR SCHOOL", 40, 38);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text(branchName || "Main Campus", 40, 48);

    doc.setFontSize(8.5);
    doc.text(`TEACHER TIMETABLE | Generated on ${new Date().toLocaleDateString()}`, 40, 56);

    doc.setTextColor("#ffffff");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(
        `${capitalizeWords(teacherName)} (${employeeId || 'N/A'})`,
        doc.internal.pageSize.width - 40,
        42,
        { align: "right" }
    );
    doc.setFont("helvetica", "normal");
    const head = [["Period", ...days]];
    const body = [];
    periods.forEach(p => {
        const row = [String(p)];
        days.forEach(day => {
            const slot = slots?.find(x => x.day === day && x.period === p);
            if (!slot) {
                row.push("—");
            } else {
                row.push(
                    `${getSubjectName(slot.subjectId)}\n${getClassName(slot.classId)} ${getSection(slot.classId, slot.sectionId)}`
                );
            }
        });
        body.push(row);
        breaks
            .filter(b => Number(b.afterPeriod) === Number(p))
            .forEach(b => {
                body.push([
                    {
                        content: `${b.label} - ${b.duration} min`,
                        colSpan: days.length + 1,
                        styles: {
                            halign: "center",
                            fontStyle: "normal",
                            fillColor: BREAK_BG,
                            textColor: BREAK_TEXT,
                        },
                    },
                ]);
            });
    });

    autoTable(doc, {
        startY: 90,
        head,
        body,
        theme: "grid",
        styles: {
            fontSize: 10,
            cellPadding: 8,
            textColor: TEXT,
            lineColor: BORDER,
            lineWidth: 0.5,
            valign: "middle",
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: 255,
            fontStyle: "bold",
            halign: "center",
        },
        columnStyles: {
            0: {
                halign: "center",
                fontStyle: "bold",
                cellWidth: 60,
            },
        },
        didParseCell(data) {
            if (data.cell.raw === "—") {
                data.cell.styles.textColor = MUTED;
                data.cell.styles.fontStyle = "italic";
            }
        },
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
        `${schoolName || "School"}_Teacher_${teacherName}_Timetable.pdf`
    );
}
