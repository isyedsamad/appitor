import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const exportEmployeeDailyExcel = ({ branchInfo, date, employees, dayRecords, stats }) => {
    const sheetData = [
        [`School: ${branchInfo?.name || "Appitor School"}`],
        [`Employee Attendance | Date: ${date}`],
        [],
        ["Staff ID", "Employee Name", "Designation", "Status"]
    ];

    employees.forEach(e => {
        const st = dayRecords[e.uid];
        const statusLabel = st === 'P' ? 'Present' : st === 'A' ? 'Absent' : st === 'L' ? 'Leave' : st === 'H' ? 'Half Day' : st === 'O' ? 'Overtime' : 'Not Marked';
        sheetData.push([
            e.employeeId,
            e.name,
            e.designation || "Staff",
            statusLabel
        ]);
    });

    sheetData.push([]);
    sheetData.push(["Summary", "Count"]);
    sheetData.push(["Present", stats.P || 0]);
    sheetData.push(["Absent", stats.A || 0]);
    sheetData.push(["Leave", stats.L || 0]);
    sheetData.push(["Half Day", stats.H || 0]);
    sheetData.push(["Overtime", stats.O || 0]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");
    XLSX.writeFile(wb, `Employee_Attendance_${date}.xlsx`);
};

export const exportEmployeeDailyPDF = ({ branchInfo, schoolName, date, employees, dayRecords, stats }) => {
    const doc = new jsPDF('p', 'mm', 'a4');
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
    doc.text(`DAILY EMPLOYEE ATTENDANCE REPORT | Date: ${date}`, centerX, currentY + 23, { align: 'center' });

    currentY += headerH + 6;

    // Info Section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Human Resources Dept.`, margin, currentY);
    doc.text(`Date: ${date}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 8;

    // Stats Cards
    const cardW = (pageWidth - (margin * 2) - 8) / 5;
    const cardH = 18;
    const metrics = [
        { label: "PRESENT", val: stats.P || 0, color: [21, 128, 61], bg: [240, 253, 244] },
        { label: "ABSENT", val: stats.A || 0, color: [185, 28, 28], bg: [254, 242, 242] },
        { label: "LEAVE", val: stats.L || 0, color: [234, 88, 12], bg: [255, 247, 237] },
        { label: "HALF DAY", val: stats.H || 0, color: [126, 34, 206], bg: [250, 245, 255] },
        { label: "OVERTIME", val: stats.O || 0, color: [29, 78, 216], bg: [239, 246, 255] }
    ];

    metrics.forEach((m, i) => {
        const x = margin + (i * (cardW + 2));
        doc.setFillColor(...m.bg);
        doc.roundedRect(x, currentY, cardW, cardH, 1, 1, 'F');
        doc.setFontSize(6);
        doc.setTextColor(107, 114, 128);
        doc.text(m.label, x + 2.5, currentY + 5);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...m.color);
        doc.text(m.val.toString(), x + 2.5, currentY + 13);
    });

    currentY += cardH + 10;

    // Table
    const tableData = employees.map(e => [
        e.employeeId,
        e.name.toUpperCase(),
        (e.designation || 'Staff').toUpperCase(),
        dayRecords[e.uid] === 'P' ? 'PRESENT' : dayRecords[e.uid] === 'A' ? 'ABSENT' : dayRecords[e.uid] === 'L' ? 'LEAVE' : dayRecords[e.uid] === 'H' ? 'HALF DAY' : dayRecords[e.uid] === 'O' ? 'OVERTIME' : 'N/A'
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Staff ID', 'Name', 'Designation', 'Status']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42] },
        columnStyles: {
            3: { fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                if (data.cell.raw === 'PRESENT') data.cell.styles.textColor = [21, 128, 61];
                if (data.cell.raw === 'ABSENT') data.cell.styles.textColor = [185, 28, 28];
                if (data.cell.raw === 'HALF DAY') data.cell.styles.textColor = [126, 34, 206];
            }
        }
    });

    // Footer
    const pHeight = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, pHeight - 10);
    doc.text(`Employee Attendance Analytics`, pageWidth - margin, pHeight - 10, { align: 'right' });

    window.open(doc.output('bloburl'), '_blank');
};
