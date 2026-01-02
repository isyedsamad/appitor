import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportClassTimetablePdf({schoolName, className, sectionName, timetable, days, periods, breaks = [], getSubjectName, getTeacherName}) {
  const doc = new jsPDF("landscape", "pt", "a4");
  const PRIMARY = "#e45011";
  const BORDER = "#e5e7eb";
  const TEXT = "#0f172a";
  const MUTED = "#64748b";
  const BREAK_BG = "#fff7ed";
  const BREAK_TEXT = "#c2410c";

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
  const head = [["Period", ...days]];
  const body = [];
  periods.forEach(p => {
    const row = [String(p)];
    days.forEach(day => {
      const slot = timetable?.[day]?.find(x => x.period === p);
      if (!slot || !slot.entries?.length) {
        row.push("—");
      } else {
        row.push(
          slot.entries
            .map(
              e =>
                `${getSubjectName(e.subjectId)}\n${capitalizeWords(
                  getTeacherName(e.teacherId)
                )}`
            )
            .join("\n\n")
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
  if (!text) return "";
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
