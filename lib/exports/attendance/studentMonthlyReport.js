import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportStudentMonthlyExcel({ branchInfo, className, section, month, students, days, monthRecords }) {
  const sheetData = [];
  sheetData.push([`School: ${branchInfo?.name || "Appitor School"}`]);
  sheetData.push([`Class: ${className} | Section: ${section} | Month: ${month}`]);
  sheetData.push([]);
  sheetData.push([
    "Admission ID",
    "Roll No",
    "Name",
    ...days.map(d => `Day ${d}`),
    "Attendance %",
  ]);

  students.forEach(s => {
    let present = 0;
    let marked = 0;
    const row = [
      s.appId,
      s.rollNo?.toString().padStart(2, '0') || "-",
      s.name,
    ];
    days.forEach(d => {
      const st = monthRecords[s.uid]?.[d] || "-";
      row.push(st);
      if (st !== "-") marked++;
      if (st === "P") present++;
    });
    const percent = marked === 0 ? "0%" : `${Math.round((present / marked) * 100)}%`;
    row.push(percent);
    sheetData.push(row);
  });

  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Monthly Attendance");
  XLSX.writeFile(wb, `Student_Attendance_${month}_${className}_${section}.xlsx`);
}

export function exportStudentMonthlyPDF({ branchInfo, className, section, month, students, days, monthRecords }) {
  const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for monthly matrix
  const pageWidth = doc.internal.pageSize.width;
  const margin = 10;
  const centerX = pageWidth / 2;
  let currentY = 8;

  // Header
  doc.setFillColor(17, 24, 39);
  doc.rect(margin, currentY, pageWidth - (margin * 2), 20, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(branchInfo?.name?.toUpperCase() || "APPITOR SCHOOL", centerX, currentY + 7, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(209, 213, 219);
  doc.text(`MONTHLY STUDENT ATTENDANCE REPORT - ${month}`, centerX, currentY + 13, { align: 'center' });
  doc.text(`Class: ${className} | Section: ${section}`, centerX, currentY + 17, { align: 'center' });

  currentY += 28;

  const tableData = students.map(s => {
    let present = 0;
    let marked = 0;
    const row = [
      s.rollNo?.toString().padStart(2, '0') || "-",
      s.name.toUpperCase().slice(0, 15),
    ];
    days.forEach(d => {
      const st = monthRecords[s.uid]?.[d] || "-";
      row.push(st);
      if (st !== "-") marked++;
      if (st === "P") present++;
    });
    const percent = marked === 0 ? "0%" : `${Math.round((present / marked) * 100)}%`;
    row.push(percent);
    return row;
  });

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Student Name', ...days.map(d => d.toString()), '%']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 6, cellPadding: 1, halign: 'center' },
    headStyles: { fillColor: [55, 65, 81], fontSize: 6 },
    columnStyles: {
      1: { halign: 'left', cellWidth: 30 },
      [days.length + 2]: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index >= 2 && data.column.index < days.length + 2) {
        if (data.cell.raw === 'P') data.cell.styles.textColor = [21, 128, 61];
        if (data.cell.raw === 'A') data.cell.styles.textColor = [185, 28, 28];
        if (data.cell.raw === '-') data.cell.styles.textColor = [200, 200, 200];
      }
    }
  });

  window.open(doc.output('bloburl'), '_blank');
}
