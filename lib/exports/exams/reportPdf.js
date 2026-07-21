import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateReportPDF = ({
    reports,
    termName,
    classSectionName,
    session,
    branchInfo,
    options = { size: '1/2', copies: 2, showOfficeCopy: true },
    schoolUser = {}
}) => {
    const isLandscape = options.size === '1/2' || options.copies === 2;
    const orientation = isLandscape ? 'l' : 'p';
    const doc = new jsPDF(orientation, 'mm', 'a4');

    const pageWidth = doc.internal.pageSize.width;   // 297mm in landscape, 210mm in portrait
    const pageHeight = doc.internal.pageSize.height; // 210mm in landscape, 297mm in portrait

    const students = Array.isArray(reports) ? reports : [reports];

    if (isLandscape) {
        // Landscape A4 (297mm x 210mm) with 2 copies side-by-side (148.5mm each)
        const reportWidth = pageWidth / 2; // 148.5mm
        const reportHeight = pageHeight;   // 210mm

        if (options.showOfficeCopy) {
            // Each student gets 1 Landscape page containing [Student Copy | Office Copy]
            students.forEach((student, idx) => {
                if (idx > 0) doc.addPage();

                // Left Half: Student Copy
                renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, 0, 0, reportWidth, reportHeight, "STUDENT COPY");

                // Vertical Divider Line in the middle
                doc.setDrawColor(200, 200, 200);
                doc.setLineDashPattern([1.5, 1.5], 0);
                doc.line(reportWidth, 0, reportWidth, reportHeight);
                doc.setLineDashPattern([], 0);

                // Right Half: Office Copy
                renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, reportWidth, 0, reportWidth, reportHeight, "OFFICE COPY");
            });
        } else {
            // Packing Mode: Fill Left & Right slots with student copies
            const numCopies = options.copies || 2;
            let items = [];
            students.forEach(s => {
                for (let c = 0; c < numCopies; c++) {
                    items.push(s);
                }
            });

            items.forEach((student, idx) => {
                const slotIdx = idx % 2; // 0 = Left, 1 = Right
                if (idx > 0 && slotIdx === 0) doc.addPage();

                const xOffset = slotIdx * reportWidth;

                // Vertical Divider Line if Right slot
                if (slotIdx === 1) {
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineDashPattern([1.5, 1.5], 0);
                    doc.line(reportWidth, 0, reportWidth, reportHeight);
                    doc.setLineDashPattern([], 0);
                }

                renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, xOffset, 0, reportWidth, reportHeight, "STUDENT COPY");
            });
        }
    } else {
        // Full Portrait A4 mode
        students.forEach((student, idx) => {
            if (idx > 0) doc.addPage();
            renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, 0, 0, pageWidth, pageHeight, "STUDENT COPY");
        });
    }

    window.open(doc.output('bloburl'), '_blank');
};

const renderSingleReport = (doc, student, termName, classSectionName, session, branchInfo, schoolUser, xOffset, yOffset, width, height, copyLabel) => {
    const margin = 5;
    const contentWidth = width - (margin * 2);
    let currentY = yOffset + margin;
    const centerX = xOffset + (width / 2);

    const isSideBySide = width < 160;

    // Header Box
    const headerH = isSideBySide ? 20 : 24;
    doc.setFillColor(15, 23, 42);
    doc.rect(xOffset + margin, currentY, contentWidth, headerH, 'F');

    // School Name
    currentY += (isSideBySide ? 8 : 10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isSideBySide ? 14 : 20);
    doc.setTextColor(255, 255, 255);
    doc.text(schoolUser?.schoolName?.toUpperCase() || "APPITOR SCHOOL", centerX, currentY, { align: 'center' });

    // Subtitle (Branch + Session)
    currentY += (isSideBySide ? 5 : 7);
    doc.setFontSize(isSideBySide ? 7.5 : 9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text(`${branchInfo?.name || "Main Branch"} | Academic Session: ${session}`, centerX, currentY, { align: 'center' });

    // Copy Label Badge (Top-Right inside Header)
    doc.setFillColor(30, 41, 59);
    const badgeW = isSideBySide ? 22 : 26;
    const badgeH = isSideBySide ? 4.5 : 5.5;
    doc.rect(xOffset + width - margin - badgeW - 1, yOffset + margin + 1, badgeW, badgeH, 'F');
    doc.setFontSize(isSideBySide ? 5.5 : 6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, xOffset + width - margin - (badgeW / 2) - 1, yOffset + margin + (isSideBySide ? 3.5 : 4.5), { align: 'center' });

    // Title Section
    currentY = yOffset + margin + headerH + (isSideBySide ? 5 : 7);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(isSideBySide ? 9.5 : 11.5);
    doc.setFont("helvetica", "bold");
    doc.text(`${(termName || "EXAM").toUpperCase()} - PROGRESS REPORT`, centerX, currentY, { align: 'center' });

    currentY += (isSideBySide ? 2.5 : 3.5);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(xOffset + margin, currentY, xOffset + width - margin, currentY);

    // Student Information Grid
    currentY += (isSideBySide ? 4.5 : 6);
    doc.setFontSize(isSideBySide ? 8 : 9.5);

    const col1 = xOffset + margin + 2;
    const val1 = col1 + (isSideBySide ? 16 : 22);
    const col2 = centerX + 2;
    const val2 = col2 + (isSideBySide ? 16 : 22);

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
        currentY += (isSideBySide ? 4.5 : 5.5);
    };

    drawRow("NAME:", student.name?.toUpperCase(), "ROLL NO:", student.rollNo);
    drawRow("FATHER:", student.fatherName?.toUpperCase() || "--", "CLASS:", classSectionName);

    currentY += 1;

    // Marks Table
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
            fontSize: isSideBySide ? 7.5 : 8.5,
            cellPadding: isSideBySide ? 1.8 : 2.5,
            lineColor: [226, 232, 240],
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
            1: { cellWidth: isSideBySide ? 16 : 20, halign: 'center' },
            2: { cellWidth: isSideBySide ? 22 : 26, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: isSideBySide ? 16 : 20, halign: 'center', fontStyle: 'bold' }
        },
    });

    currentY = doc.lastAutoTable.finalY + (isSideBySide ? 4 : 6);

    // Metric Summary Cards
    const cardW = (contentWidth - 4) / 3;
    const cardH = isSideBySide ? 12 : 14;

    const drawMetric = (x, y, label, value, color) => {
        doc.setFillColor(248, 250, 252);
        doc.rect(x, y, cardW, cardH, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(x, y, cardW, cardH, 'S');

        doc.setFontSize(isSideBySide ? 6.5 : 7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text(label, x + cardW / 2, y + (isSideBySide ? 3.8 : 4.5), { align: 'center' });

        doc.setFontSize(isSideBySide ? 11 : 13);
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(value, x + cardW / 2, y + (isSideBySide ? 9 : 11), { align: 'center' });
    };

    drawMetric(xOffset + margin, currentY, "PERCENTAGE", `${student.percentage}%`, [37, 99, 235]);
    drawMetric(xOffset + margin + cardW + 2, currentY, "OVERALL GRADE", student.overallGrade || "-", [22, 163, 74]);
    drawMetric(xOffset + margin + (cardW + 2) * 2, currentY, "CLASS RANK", `#${student.rank || "N/A"}`, [234, 88, 12]);

    currentY += cardH + (isSideBySide ? 3 : 4);
    doc.setFontSize(isSideBySide ? 5.5 : 6.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont("helvetica", "bold");
    doc.text("SCHEME: A: 90%+ | B: 75%+ | C: 60%+ | D: 45%+ | E: <45%", centerX, currentY, { align: 'center' });

    // Signature Footer
    currentY = yOffset + height - margin - (isSideBySide ? 9 : 12);
    const sigX1 = xOffset + margin + (isSideBySide ? 18 : 22);
    const sigX2 = centerX;
    const sigX3 = xOffset + width - margin - (isSideBySide ? 18 : 22);

    doc.setFontSize(isSideBySide ? 6.5 : 7.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(71, 85, 105);

    const drawSigLine = (x, label) => {
        const lineW = isSideBySide ? 24 : 32;
        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.15);
        doc.line(x - lineW / 2, currentY, x + lineW / 2, currentY);
        doc.text(label, x, currentY + 3, { align: 'center' });
    };

    drawSigLine(sigX1, "PARENT SIGN");
    drawSigLine(sigX2, "TEACHER SIGN");
    drawSigLine(sigX3, "PRINCIPAL SIGN");

    // Powered By watermark
    doc.setFontSize(4.5);
    doc.setTextColor(203, 213, 225);
    doc.text("POWERED BY APPITOR", centerX, yOffset + height - 1.5, { align: 'center' });
};
