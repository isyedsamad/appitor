import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export function exportEmployeeMonthlyExcel({ branchInfo, month, employees, daysInMonth, monthRecords }) {
  const sheetData = [];
  sheetData.push([`School: ${branchInfo?.name || "Appitor School"}`]);
  sheetData.push([`Employee Monthly Attendance | Month: ${month}`]);
  sheetData.push([]);
  sheetData.push([
    "Staff ID",
    "Employee Name",
    "Designation",
    ...daysInMonth.map(d => `Day ${d}`),
    "Attendance %",
  ]);

  employees.forEach(e => {
    let present = 0;
    let marked = 0;
    const row = [
      e.employeeId,
      e.name,
      e.designation || "Staff",
    ];
    daysInMonth.forEach(d => {
      const st = monthRecords[e.uid]?.[d] || "-";
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
  XLSX.writeFile(wb, `Employee_Attendance_${month}.xlsx`);
}

export function exportEmployeeMonthlyPDF({ branchInfo, schoolName, month, employees, daysInMonth, monthRecords }) {
  const doc = new jsPDF('l', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const margin = 10;
  const centerX = pageWidth / 2;
  let currentY = 8;

  // Header
  const headerH = 28;
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, currentY, pageWidth - (margin * 2), headerH, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(schoolName?.toUpperCase() || "APPITOR SCHOOL", centerX, currentY + 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225);
  doc.text(branchInfo?.name || "Campus View", centerX, currentY + 17, { align: 'center' });

  doc.setFontSize(8);
  doc.text(`MONTHLY EMPLOYEE ATTENDANCE REPORT - ${month}`, centerX, currentY + 23, { align: 'center' });

  currentY += headerH + 6;

  const tableData = employees.map(e => {
    let present = 0;
    let marked = 0;
    const row = [
      e.employeeId,
      e.name.toUpperCase().slice(0, 15),
      (e.designation || 'Staff').toUpperCase().slice(0, 10),
    ];
    daysInMonth.forEach(d => {
      const st = monthRecords[e.uid]?.[d] || "-";
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
    head: [['ID', 'Name', 'Role', ...daysInMonth.map(d => d.toString()), '%']],
    body: tableData,
    theme: 'grid',
    styles: { fontSize: 5.5, cellPadding: 0.8, halign: 'center' },
    headStyles: { fillColor: [15, 23, 42], fontSize: 5.5 },
    columnStyles: {
      1: { halign: 'left', cellWidth: 25 },
      2: { halign: 'left', cellWidth: 15 },
      [daysInMonth.length + 3]: { fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Handle status coloring for Matrix columns
      if (data.section === 'body' && data.column.index >= 3 && data.column.index < daysInMonth.length + 3) {
        if (data.cell.raw === 'P') data.cell.styles.textColor = [21, 128, 61];
        if (data.cell.raw === 'A') data.cell.styles.textColor = [185, 28, 28];
        if (data.cell.raw === 'L') data.cell.styles.textColor = [234, 88, 12];
        if (data.cell.raw === 'H') data.cell.styles.textColor = [126, 34, 206];
        if (data.cell.raw === '-') data.cell.styles.textColor = [200, 200, 200];
      }
    }
  });

  window.open(doc.output('bloburl'), '_blank');
}