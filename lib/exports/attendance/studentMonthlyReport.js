import * as XLSX from "xlsx";

export function studentMonthlyReport({ className, section, month, students, days, monthRecords }) {
  const sheetData = [];
  sheetData.push([`Class: ${className} | Section: ${section} | Month: ${month}`])
  sheetData.push([
    "Admission ID",
    "Name",
    ...days.map(d => `Day ${d}`),
    "Attendance %",
  ]);
  students.forEach(s => {
    let present = 0;
    let marked = 0;
    const row = [
      s.admissionId,
      s.name,
    ];
    days.forEach(d => {
      const st = monthRecords[s.uid]?.[d] || "-";
      row.push(st);
      if (st !== "-") marked++;
      if (st === "P") present++;
    });
    const percent =
      marked === 0 ? "0%" : `${Math.round((present / marked) * 100)}%`;
    row.push(percent);
    sheetData.push(row);
  });
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, ws, "Attendance");

  XLSX.writeFile(
    wb,
    `Attendance_${new Date().toISOString().slice(0, 7)}.xlsx`
  );
}
