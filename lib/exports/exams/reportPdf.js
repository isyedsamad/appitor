import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateSlash } from "@/lib/dateUtils";

export const generateReportPDF = ({ reports, termName, classSectionName, session, branchInfo, options = { size: 'a4', copies: 1 }, schoolUser = {} }) => {
    const isLandscape = options.size === '1/2' && options.copies === 2;
    const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    let reportHeight = pageHeight;
    let reportWidth = pageWidth;

    if (options.size === '1/2') reportHeight = pageHeight / (isLandscape ? 1 : 2);
    if (options.size === '1/2' && isLandscape) reportWidth = pageWidth / 2;
    if (options.size === '1/3') reportHeight = pageHeight / 3;
    if (options.size === '1/4') reportHeight = pageHeight / 4;

    const numCopies = Math.min(options.copies, options.size === 'a4' ? 1 : (options.size === '1/2' ? 2 : (options.size === '1/3' ? 3 : 4)));

    // Reports can be an array of students
    const students = Array.isArray(reports) ? reports : [reports];

    students.forEach((student, studentIndex) => {
        if (studentIndex > 0) {
            doc.addPage();
        }

        for (let i = 0; i < numCopies; i++) {
            let xOffset = 0;
            let yOffset = 0;
            if (isLandscape) {
                xOffset = i * reportWidth;
            } else {
                yOffset = i * reportHeight;
            }
            if (i > 0) {
                doc.setDrawColor(220, 220, 220);
                doc.setLineDashPattern([2, 1], 0);
                if (isLandscape) {
                    doc.line(xOffset, 0, xOffset, pageHeight);
                } else {
                    doc.line(0, yOffset, pageWidth, yOffset);
                }
                doc.setLineDashPattern([], 0);
            }

            const copyLabel = i === 0 ? "STUDENT COPY" : "OFFICE COPY";
            renderSingleReport(doc, student, termName, classSectionName, session, branchInfo, schoolUser, xOffset, yOffset, reportWidth, reportHeight, copyLabel);
        }
    });

    const isSingle = students.length === 1;
    const fileName = isSingle ? `Report_Card_${students[0].rollNo}_${students[0].name.replace(/\s+/g, '_')}.pdf` : `Class_${classSectionName.replace(/\s+/g, '_')}_Reports.pdf`;

    window.open(doc.output('bloburl'), '_blank');
};

const renderSingleReport = (doc, student, termName, classSectionName, session, branchInfo, schoolUser, xOffset, yOffset, width, height, copyLabel) => {
    const baseHeight = 297;
    let scale = height / baseHeight;
    const isSmall = height < 100;
    const isVerySmall = height < 80;

    const margin = 8 * scale;
    const contentWidth = width - (margin * 2);
    let currentY = yOffset + margin;
    const centerX = xOffset + (width / 2);

    const headerH = isVerySmall ? 12 : (isSmall ? 16 : 22);
    doc.setFillColor(17, 24, 39);
    doc.rect(xOffset + margin, currentY - 2, contentWidth, headerH, 'F');

    currentY += 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isVerySmall ? 9 : (isSmall ? 8 : 12));
    doc.setTextColor(255, 255, 255);
    doc.text(schoolUser?.schoolName || "SCHOOL NAME", centerX, currentY + (isVerySmall ? 2 : 4), { align: 'center' });

    if (!isVerySmall) {
        currentY += isSmall ? 7 : 10;
        doc.setFontSize(isSmall ? 6.5 : 8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(209, 213, 219);
        doc.text(`Branch: ${branchInfo?.name} (${branchInfo?.branchCode || "N/A"})`, centerX, currentY, { align: 'center' });
    }

    if (!isSmall) {
        currentY += 4;
        doc.text(`Academic Session: ${session || "N/A"}`, centerX, currentY, { align: 'center' });
    }

    // Badge
    doc.setFillColor(55, 65, 81);
    const badgeW = isSmall ? 15 : 22;
    doc.rect(xOffset + width - margin - badgeW, yOffset + (isSmall ? 3 : 5), badgeW, isSmall ? 4 : 5, 'F');
    doc.setFontSize(isSmall ? 5 : 6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, xOffset + width - margin - (badgeW / 2), yOffset + (isSmall ? 6 : 8.5), { align: 'center' });

    currentY = yOffset + margin + headerH + (isSmall ? 1 : 2) - 3;
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(isSmall ? 0.2 : 0.4);
    doc.line(xOffset + margin, currentY, xOffset + width - margin, currentY);

    currentY += isSmall ? 3 : 5;
    doc.setFontSize(isSmall ? 7.5 : 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${(termName || "EXAM").toUpperCase()} PROGRESS REPORT`, centerX, currentY, { align: 'center' });

    currentY += isSmall ? 2 : 3;
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(isSmall ? 0.2 : 0.4);
    doc.line(xOffset + margin, currentY, xOffset + width - margin, currentY);

    // Profile Box
    currentY += isSmall ? 2 : 3;
    const profileH = isVerySmall ? 10 : (isSmall ? 12 : 17);
    doc.setFillColor(249, 250, 251);
    doc.rect(xOffset + margin, currentY, contentWidth, profileH, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.rect(xOffset + margin, currentY, contentWidth, profileH);

    doc.setFontSize(isSmall ? 7 : 8);
    doc.setTextColor(55, 65, 81);

    const labelX = xOffset + margin + 2;
    const valX = xOffset + margin + (isSmall ? 13 : 18);
    const midX = xOffset + margin + (contentWidth / 2);
    const midValX = midX + (isSmall ? 12 : 15);

    let rowY = currentY + (isSmall ? 4 : 5);
    doc.setFont("helvetica", "normal");
    doc.text("Name:", labelX, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${student.name?.substring(0, 20).toUpperCase()}`, valX, rowY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text("Roll No:", midX, rowY);
    doc.setFont("helvetica", "bold");
    doc.text(`${student.rollNo || "N/A"}`, midValX, rowY);

    if (!isVerySmall) {
        rowY += isSmall ? 3 : 5;
        doc.setFont("helvetica", "normal");
        doc.text("Father:", labelX, rowY);
        doc.setFont("helvetica", "bold");
        doc.text(`${student.fatherName?.substring(0, 15).toUpperCase() || "N/A"}`, valX, rowY);

        doc.setFont("helvetica", "normal");
        doc.text("Class:", midX, rowY);
        doc.setFont("helvetica", "bold");
        doc.text(`${classSectionName || "N/A"}`, midValX, rowY);

        if (!isSmall) {
            rowY += 5;
            doc.setFont("helvetica", "normal");
            doc.text("Rank:", labelX, rowY);
            doc.setFont("helvetica", "bold");
            doc.text(`${student.rank || "N/A"}`, valX, rowY);

            doc.setFont("helvetica", "normal");
            doc.text("App ID:", midX, rowY);
            doc.setFont("helvetica", "bold");
            doc.text(`${student.appId || "N/A"}`, midValX, rowY);
        }
    } else {
        rowY += 4;
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.text(`Class: ${classSectionName || "N/A"} | Rank: ${student.rank || "N/A"}`, labelX, rowY);
    }

    currentY += profileH + (isSmall ? 2 : 4);

    // Marks Table
    let tableData = [];
    if (student.subjectResults && Array.isArray(student.subjectResults)) {
        student.subjectResults.forEach(sub => {
            const marksStr = sub.isAbsent ? "AB" : `${sub.obtained}`;
            tableData.push([
                sub.subjectName || "Subject",
                `${sub.maxMarks} / ${sub.passMarks}`,
                marksStr,
                sub.grade || "-",
                sub.remark || "-"
            ]);
        });
    }

    autoTable(doc, {
        startY: currentY,
        margin: { left: xOffset + margin, right: (doc.internal.pageSize.width - (xOffset + width)) + margin },
        head: [['Subject Name', 'Max / Pass', 'Obtained', 'Grade', 'Remarks']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: isSmall ? 6 : 7.5, cellPadding: isSmall ? 1 : 1.5, lineColor: [243, 244, 246] },
        headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 'auto', fontStyle: 'bold' },
            1: { cellWidth: isSmall ? 15 : 22, halign: 'center' },
            2: { cellWidth: isSmall ? 15 : 20, halign: 'center', fontStyle: 'bold' },
            3: { cellWidth: isSmall ? 12 : 15, halign: 'center', fontStyle: 'bold' },
            4: { cellWidth: isSmall ? 15 : 25, halign: 'left' }
        },
    });

    currentY = doc.lastAutoTable.finalY + (isSmall ? 2 : 4);

    // Summary Box
    const summaryTotalH = isVerySmall ? 14 : (isSmall ? 18 : 22);
    const summaryY = yOffset + height - margin - summaryTotalH - (isSmall ? 4 : 8);
    const finalY = Math.min(currentY, summaryY);
    let sY = finalY;

    const summaryW = isSmall ? 65 : 80;
    const sX = xOffset + width - margin - summaryW;

    doc.setFontSize(isSmall ? 7 : 8);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");

    doc.text("Total Obtained Marks:", sX, sY + (isSmall ? 2 : 3));
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text(`${student.totalObtainedMarks} / ${student.totalMaxMarks}`, xOffset + width - margin - 2, sY + (isSmall ? 2 : 3), { align: 'right' });

    sY += isSmall ? 4 : 5;
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");
    doc.text("Final Percentage:", sX, sY + (isSmall ? 2 : 3));
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text(`${student.percentage}%`, xOffset + width - margin - 2, sY + (isSmall ? 2 : 3), { align: 'right' });

    sY += isSmall ? 4 : 5;
    doc.setFillColor(17, 24, 39);
    doc.rect(sX - 1, sY, summaryW + 1, isSmall ? 6 : 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(isSmall ? 8 : 9);
    doc.setFont("helvetica", "bold");
    doc.text("OVERALL GRADE:", sX, sY + (isSmall ? 4 : 4.5));
    doc.text(`${student.overallGrade}`, xOffset + width - margin - 2, sY + (isSmall ? 4 : 4.5), { align: 'right' });

    // Footer
    let footerY = yOffset + height - margin - (isSmall ? 2 : 4);
    doc.setFontSize(isSmall ? 6 : 7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(156, 163, 175);
    doc.text("Electronically Generated - Valid without signature", centerX, footerY, { align: 'center' });

    if (!isSmall) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text("CLASS TEACHER", xOffset + margin + 15, yOffset + height - margin - 10, { align: 'center' });
        doc.line(xOffset + margin, yOffset + height - margin - 14, xOffset + margin + 30, yOffset + height - margin - 14);

        doc.text("PRINCIPAL", xOffset + width - margin - 15, yOffset + height - margin - 10, { align: 'center' });
        doc.line(xOffset + width - margin - 30, yOffset + height - margin - 14, xOffset + width - margin, yOffset + height - margin - 14);
    }
};
