import * as XLSX from "xlsx";

export function exportMonthExcel() {
  const rows = [];
  employees.forEach(e => {
    let present = 0;
    let marked = 0;
    const row = {
      "Employee ID": e.employeeId,
      Name: e.name,
    };
    daysInMonth.forEach(d => {
      const st = monthRecords[e.uid]?.[d] || "-";
      row[d] = st;
      if (st !== "-") marked++;
      if (st === "P") present++;
    });
    row["Attendance %"] =
      marked === 0 ? "0%" : `${Math.round((present / marked) * 100)}%`;
    rows.push(row);
  });
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Attendance");
  XLSX.writeFile(wb, `Employee_Attendance_${value}.xlsx`);
}