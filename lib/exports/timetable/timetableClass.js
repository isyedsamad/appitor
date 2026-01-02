import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportClassTimetablePdf({schoolName, className, sectionName, timetable, days, periods, getSubjectName, getTeacherName}) {
  const doc = new jsPDF("landscape", "pt", "a4");
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
    `Class ${className} - ${sectionName}`,
    doc.internal.pageSize.width - 40,
    42,
    { align: "right" }
  );

  doc.setFont("helvetica", "normal");

  const head = [
    ["Period", ...days.map(d => d)],
  ];

  const body = periods.map(p => {
    const row = [String(p)];

    days.forEach(day => {
      const slot = timetable?.[day]?.find(x => x.period === p);

      if (!slot || !slot.entries?.length) {
        row.push("—");
      } else {
        row.push(
          slot.entries
            .map(e =>
              `${getSubjectName(e.subjectId)}\n${capitalizeWords(getTeacherName(e.teacherId))}`
            )
            .join("\n\n")
        );
      }
    });

    return row;
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
      fillColor: [228, 80, 17],
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

  /* ---------------- FOOTER ---------------- */

  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    40,
    pageHeight - 20
  );

  doc.save(
    `${schoolName || "School"}_Class_${className}_${sectionName}_Timetable.pdf`
  );
}



function capitalizeWords(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}