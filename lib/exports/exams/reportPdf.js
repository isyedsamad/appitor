import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateSlash } from "@/lib/dateUtils";

export const generateReportPDF = ({
    reports,
    termName,
    classSectionName,
    session,
    branchInfo,
    options = { size: 'a4', copies: 1, showOfficeCopy: false },
    schoolUser = {}
}) => {
    const isLandscape = options.size === '1/2' && !options.showOfficeCopy;
    const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const students = Array.isArray(reports) ? reports : [reports];
    const numCopies = options.copies || 1;

    // Slots per page
    const slotsPerPage = options.size === 'a4' ? 1 : (options.size === '1/2' ? 2 : (options.size === '1/3' ? 3 : 4));
    const reportWidth = isLandscape ? (pageWidth / 2) : pageWidth;
    const reportHeight = isLandscape ? pageHeight : (pageHeight / slotsPerPage);

    const actualShowOfficeCopy = options.showOfficeCopy && options.size !== 'a4';

    if (actualShowOfficeCopy) {
        // Office Copy Mode: Each student on one page (Top: Student, Bottom: Office)
        students.forEach((student, idx) => {
            if (idx > 0) doc.addPage();

            // Student Copy
            renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, 0, 0, pageWidth, pageHeight / 2, "STUDENT COPY");

            // Divider
            doc.setDrawColor(200, 200, 200);
            doc.setLineDashPattern([1, 1], 0);
            doc.line(0, pageHeight / 2, pageWidth, pageHeight / 2);
            doc.setLineDashPattern([], 0);

            // Office Copy
            renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, 0, pageHeight / 2, pageWidth, pageHeight / 2, "OFFICE COPY");
        });
    } else {
        // Student Packing Mode: Fill slots with different students to save paper
        // Item stream: [Student A (Copy 1), Student A (Copy 2), Student B (Copy 1), ...]
        let items = [];
        students.forEach(s => {
            for (let c = 0; c < numCopies; c++) {
                items.push(s);
            }
        });

        items.forEach((student, idx) => {
            const slotIdx = idx % slotsPerPage;
            if (idx > 0 && slotIdx === 0) doc.addPage();

            const xOffset = isLandscape ? (slotIdx * reportWidth) : 0;
            const yOffset = isLandscape ? 0 : (slotIdx * reportHeight);

            // Divider
            if (slotIdx > 0) {
                doc.setDrawColor(226, 232, 240);
                doc.setLineDashPattern([1, 1], 0);
                if (isLandscape) doc.line(xOffset, 0, xOffset, pageHeight);
                else doc.line(0, yOffset, pageWidth, yOffset);
                doc.setLineDashPattern([], 0);
            }

            renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, xOffset, yOffset, reportWidth, reportHeight, "STUDENT COPY");
        });
    }

    window.open(doc.output('bloburl'), '_blank');
};

const renderSingleReport = (doc, student, termName, classSectionName, session, branchInfo, schoolUser, xOffset, yOffset, width, height, copyLabel) => {
    const margin = 4;
    const contentWidth = width - (margin * 2);
    let currentY = yOffset + margin;
    const centerX = xOffset + (width / 2);

    const isSmall = height < 155; // Adjust threshold

    const headerH = isSmall ? 18 : 22;
    doc.setFillColor(15, 23, 42);
    doc.rect(xOffset + margin, currentY, contentWidth, headerH, 'F');

    currentY += (isSmall ? 8 : 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isSmall ? 16 : 22);
    doc.setTextColor(255, 255, 255);
    doc.text(schoolUser?.schoolName?.toUpperCase() || "APPITOR SCHOOL", centerX, currentY, { align: 'center' });

    currentY += (isSmall ? 5 : 7);
    doc.setFontSize(isSmall ? 8 : 10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text(`${branchInfo?.name || "Main Branch"} | Academic Session: ${session}`, centerX, currentY, { align: 'center' });

    // Copy Label Badge
    doc.setFillColor(30, 41, 59);
    const badgeW = isSmall ? 18 : 22;
    const badgeH = isSmall ? 4 : 5;
    doc.rect(xOffset + width - margin - badgeW - 1, yOffset + margin + 1, badgeW, badgeH, 'F');
    doc.setFontSize(isSmall ? 5 : 6);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, xOffset + width - margin - (badgeW / 2) - 1, yOffset + margin + (isSmall ? 3.8 : 4.5), { align: 'center' });

    currentY = yOffset + margin + headerH + (isSmall ? 4 : 6);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(isSmall ? 9 : 11);
    doc.setFont("helvetica", "bold");
    doc.text(`${(termName || "EXAM").toUpperCase()} - PROGRESS REPORT`, centerX, currentY, { align: 'center' });

    currentY += (isSmall ? 2 : 3);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(xOffset + margin, currentY, xOffset + width - margin, currentY);

    currentY += (isSmall ? 4 : 6);
    doc.setFontSize(isSmall ? 7.5 : 9);

    const col1 = xOffset + margin + 1;
    const val1 = col1 + (isSmall ? 15 : 20);
    const col2 = centerX + 2;
    const val2 = col2 + (isSmall ? 15 : 20);

    const drawRow = (l1, v1, l2, v2) => {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(l1, col1, currentY);
        doc.setTextColor(15, 23, 42);
        doc.text(String(v1 || "--"), val1, currentY);

        doc.setTextColor(100, 116, 139);
        doc.text(l2, col2, currentY);
        doc.setTextColor(15, 23, 42);
        doc.text(String(v2 || "--"), val2, currentY);
        currentY += (isSmall ? 4 : 5.5);
    };

    drawRow("NAME:", student.name?.toUpperCase(), "ROLL NO:", student.rollNo);
    drawRow("FATHER:", student.fatherName?.toUpperCase(), "CLASS:", classSectionName);

    currentY += 0.5;
    let tableData = [];
    if (student.subjectResults && Array.isArray(student.subjectResults)) {
        student.subjectResults.forEach(sub => {
            const marksStr = sub.isAbsent ? "AB" : `${sub.obtained}`;
            tableData.push([
                sub.subjectName?.toUpperCase() || "SUBJECT",
                sub.maxMarks || "100",
                marksStr,
                sub.grade || "-"
            ]);
        });
    }

    autoTable(doc, {
        startY: currentY,
        margin: { left: xOffset + margin, right: (doc.internal.pageSize.width - (xOffset + width)) + margin },
        head: [['SUBJECT NAME', 'MAX', 'MARKS', 'GRADE']],
        body: tableData,
        theme: 'grid',
        styles: {
            fontSize: isSmall ? 7 : 8,
            cellPadding: isSmall ? 1.5 : 2.5,
            lineColor: [241, 245, 249],
            font: 'helvetica',
            textColor: [15, 23, 42]
        },
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { cellWidth: isSmall ? 12 : 18, halign: 'center' },
            2: { cellWidth: isSmall ? 18 : 25, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: isSmall ? 15 : 20, halign: 'center', fontStyle: 'bold' }
        },
    });

    currentY = doc.lastAutoTable.finalY + (isSmall ? 4 : 6);

    const cardW = (contentWidth - 4) / 3;
    const cardH = isSmall ? 11 : 14;

    const drawMetric = (x, y, label, value, color) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(x, y, cardW, cardH, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, y, cardW, cardH, 'S');

        doc.setFontSize(isSmall ? 6 : 7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + cardW / 2, y + (isSmall ? 3.5 : 4.5), { align: 'center' });

        doc.setFontSize(isSmall ? 12 : 14);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(value, x + cardW / 2, y + (isSmall ? 8.5 : 11), { align: 'center' });
    };

    drawMetric(xOffset + margin, currentY, "PERCENTAGE", `${student.percentage}%`, [37, 99, 235]);
    drawMetric(xOffset + margin + cardW + 2, currentY, "OVERALL GRADE", student.overallGrade || "-", [22, 163, 74]);
    drawMetric(xOffset + margin + (cardW + 2) * 2, currentY, "CLASS RANK", `#${student.rank || "N/A"}`, [234, 88, 12]);

    currentY += cardH + (isSmall ? 3 : 4);
    doc.setFontSize(isSmall ? 5 : 6);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "bold");
    doc.text("SCHEME: A+: 90+ | A: 80+ | B: 70+ | C: 60+ | D: 50+ | E: <50 (Fail)", centerX, currentY, { align: 'center' });

    currentY = yOffset + height - margin - (isSmall ? 8 : 12);
    const sigX1 = xOffset + margin + 15;
    const sigX2 = centerX;
    const sigX3 = xOffset + width - margin - 15;

    doc.setFontSize(isSmall ? 6 : 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);

    const drawSigLine = (x, label) => {
        const lineW = isSmall ? 20 : 30;
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.15);
        doc.line(x - lineW / 2, currentY, x + lineW / 2, currentY);
        doc.text(label, x, currentY + 3, { align: 'center' });
    };

    drawSigLine(sigX1, "PARENT");
    drawSigLine(sigX2, "CLASS TEACHER");
    drawSigLine(sigX3, "PRINCIPAL");

    doc.setFontSize(4);
    doc.setTextColor(226, 232, 240);
    doc.text("POWERED BY APPITOR", centerX, yOffset + height - 1.5, { align: 'center' });
};
