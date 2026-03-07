import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function exportClassTimetablePdf({ schoolName, branchName, className, sectionName, timetable, days, periods, breaks = [], getSubjectName, getTeacherName }) {
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
  doc.text(`CLASS TIMETABLE | Generated on ${new Date().toLocaleDateString()}`, 40, 56);

  doc.setTextColor("#ffffff");
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
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
