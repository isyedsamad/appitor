import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

export const exportStudentDailyExcel = ({ branchInfo, className, section, date, students, dateRecords, stats }) => {
    const sheetData = [
        [`School: ${branchInfo?.name || "Appitor School"}`],
        [`Class: ${className} | Section: ${section} | Date: ${date}`],
        [],
        ["Roll No", "App ID", "Student Name", "Status"]
    ];

    students.forEach(s => {
        const st = dateRecords[s.uid];
        const statusLabel = st === 'P' ? 'Present' : st === 'A' ? 'Absent' : st === 'L' ? 'Leave' : st === 'M' ? 'Medical' : 'Not Marked';
        sheetData.push([
            s.rollNo?.toString().padStart(2, '0') || "-",
            s.appId,
            s.name,
            statusLabel
        ]);
    });

    sheetData.push([]);
    sheetData.push(["Summary", "Count", "Percentage"]);
    sheetData.push(["Present", stats.P, `${stats.percent}%`]);
    sheetData.push(["Absent", stats.A, `${Math.round((stats.A / (stats.total || 1)) * 100)}%`]);
    sheetData.push(["Leave", stats.L, `${Math.round((stats.L / (stats.total || 1)) * 100)}%`]);
    sheetData.push(["Medical", stats.M, `${Math.round((stats.M / (stats.total || 1)) * 100)}%`]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Daily Attendance");
    XLSX.writeFile(wb, `Student_Attendance_${date}_${className}_${section}.xlsx`);
};

export const exportStudentDailyPDF = ({ branchInfo, className, section, date, students, dateRecords, stats }) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const centerX = pageWidth / 2;
    let currentY = 8;

    // Header
    doc.setFillColor(17, 24, 39);
    doc.rect(margin, currentY, pageWidth - (margin * 2), 22, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(branchInfo?.name?.toUpperCase() || "APPITOR SCHOOL", centerX, currentY + 8, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(209, 213, 219);
    doc.text(`${branchInfo?.address || "Campus Address"}`, centerX, currentY + 14, { align: 'center' });
    doc.text(`DAILY STUDENT ATTENDANCE REPORT`, centerX, currentY + 18, { align: 'center' });

    currentY += 30;

    // Info Section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`Class: ${className} (${section})`, margin, currentY);
    doc.text(`Date: ${date}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 8;

    // Stats Cards
    const cardW = (pageWidth - (margin * 2) - 6) / 4;
    const cardH = 18;
    const metrics = [
        { label: "PRESENT", val: stats.P, color: [21, 128, 61], bg: [240, 253, 244] },
        { label: "ABSENT", val: stats.A, color: [185, 28, 28], bg: [254, 242, 242] },
        { label: "LEAVE/MED", val: stats.L + stats.M, color: [234, 88, 12], bg: [255, 247, 237] },
        { label: "STRENGTH", val: `${stats.percent}%`, color: [17, 24, 39], bg: [249, 250, 251] }
    ];

    metrics.forEach((m, i) => {
        const x = margin + (i * (cardW + 2));
        doc.setFillColor(...m.bg);
        doc.roundedRect(x, currentY, cardW, cardH, 1, 1, 'F');
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text(m.label, x + 3, currentY + 5);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...m.color);
        doc.text(m.val.toString(), x + 3, currentY + 13);
    });

    currentY += cardH + 10;

    // Table
    const tableData = students.map(s => [
        s.rollNo?.toString().padStart(2, '0') || "-",
        s.appId,
        s.name.toUpperCase(),
        dateRecords[s.uid] === 'P' ? 'PRESENT' : dateRecords[s.uid] === 'A' ? 'ABSENT' : dateRecords[s.uid] === 'L' ? 'LEAVE' : dateRecords[s.uid] === 'M' ? 'MEDICAL' : 'N/A'
    ]);

    autoTable(doc, {
        startY: currentY,
        head: [['Roll No', 'App ID', 'Student Name', 'Status']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [55, 65, 81] },
        columnStyles: {
            3: { fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
                if (data.cell.raw === 'PRESENT') data.cell.styles.textColor = [21, 128, 61];
                if (data.cell.raw === 'ABSENT') data.cell.styles.textColor = [185, 28, 28];
            }
        }
    });

    // Footer
    const pHeight = doc.internal.pageSize.height;
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, pHeight - 10);
    doc.text(`Page 1 of 1`, pageWidth - margin, pHeight - 10, { align: 'right' });

    window.open(doc.output('bloburl'), '_blank');
};
