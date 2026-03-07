import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateSlash } from "@/lib/dateUtils";

export const generateReceiptPDF = ({ receipt, student, branchInfo, options = { size: 'a4', copies: 1 }, schoolUser = {} }) => {
    const isLandscape = options.size === '1/2' && options.copies === 2;
    const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    let receiptHeight = pageHeight;
    let receiptWidth = pageWidth;

    if (options.size === '1/2') receiptHeight = pageHeight / (isLandscape ? 1 : 2);
    if (options.size === '1/2' && isLandscape) receiptWidth = pageWidth / 2;

    if (options.size === '1/3') receiptHeight = pageHeight / 3;
    if (options.size === '1/4') receiptHeight = pageHeight / 4;

    const numCopies = Math.min(options.copies, options.size === 'a4' ? 1 : (options.size === '1/2' ? 2 : (options.size === '1/3' ? 3 : 4)));

    for (let i = 0; i < numCopies; i++) {
        let xOffset = 0;
        let yOffset = 0;
        if (isLandscape) {
            xOffset = i * receiptWidth;
        } else {
            yOffset = i * receiptHeight;
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

        const copyLabel = i === 0 ? "STUDENT COPY" : (i === 1 ? "OFFICE COPY" : "BANK COPY");
        renderSingleReceipt(doc, receipt, student, branchInfo, schoolUser, xOffset, yOffset, receiptWidth, receiptHeight, copyLabel);
    }

    const fileName = `Receipt_${receipt.receiptNo}_${student.appId}.pdf`;
    // doc.save(fileName);
    window.open(doc.output('bloburl'), '_blank');
};

const drawRupee = (doc, x, y, size = 3) => {
    const oldLineWidth = doc.getLineWidth();
    const s = size / 5;
    doc.setLineWidth(0.2 * s);
    doc.line(x, y - (4 * s), x + (4 * s), y - (4 * s));
    doc.line(x, y - (2.5 * s), x + (4 * s), y - (2.5 * s));
    doc.line(x + (3.5 * s), y - (4 * s), x + (3.5 * s), y - (2.5 * s));
    doc.line(x + (3.5 * s), y - (2.5 * s), x, y);
    doc.setLineWidth(oldLineWidth);
};

const renderSingleReceipt = (doc, receipt, student, branchInfo, schoolUser, xOffset, yOffset, width, height, copyLabel) => {
    const baseHeight = 297;
    let scale = height / baseHeight;
    const isSmall = height < 100;
    const isVerySmall = height < 80;

    const margin = 8 * scale;
    const contentWidth = width - (margin * 2);
    let currentY = yOffset + margin;
    const centerX = xOffset + (width / 2);

    const headerH = isVerySmall ? 15 : (isSmall ? 20 : 28);
    doc.setFillColor(15, 23, 42);
    doc.rect(xOffset + margin, currentY - 2, contentWidth, headerH, 'F');

    currentY += (isSmall ? 5 : 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(isSmall ? 10 : 16);
    doc.setTextColor(255, 255, 255);
    doc.text(schoolUser?.schoolName?.toUpperCase() || "APPITOR SCHOOL", centerX, currentY, { align: 'center' });

    currentY += (isSmall ? 4 : 6);
    doc.setFontSize(isSmall ? 6.5 : 8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(203, 213, 225);
    doc.text(branchInfo?.name || "Campus View", centerX, currentY, { align: 'center' });

    if (!isVerySmall) {
        currentY += (isSmall ? 3 : 5);
        doc.setFontSize(isSmall ? 5.5 : 7.5);
        doc.text(`FEE RECEIPT | Session: ${receipt.sessionId || "N/A"}`, centerX, currentY, { align: 'center' });
    }

    doc.setFillColor(15, 23, 42);
    const badgeW = isSmall ? 15 : 22;
    doc.rect(xOffset + width - margin - badgeW, yOffset + (isSmall ? 2.5 : 4), badgeW, isSmall ? 4 : 5, 'F');
    doc.setFontSize(isSmall ? 5 : 6.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(copyLabel, xOffset + width - margin - (badgeW / 2), yOffset + (isSmall ? 5.5 : 7.5), { align: 'center' });

    currentY = yOffset + margin + headerH + (isSmall ? 1 : 2) - 3;
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(isSmall ? 0.2 : 0.4);
    doc.line(xOffset + margin, currentY, xOffset + width - margin, currentY);

    currentY += isSmall ? 3 : 5;
    doc.setFontSize(isSmall ? 7.5 : 9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text("FEE RECEIPT", centerX, currentY, { align: 'center' });

    currentY += isSmall ? 2 : 3;
    doc.setDrawColor(31, 41, 55);
    doc.setLineWidth(isSmall ? 0.2 : 0.4);
    doc.line(xOffset + margin, currentY, xOffset + width - margin, currentY);

    currentY += isSmall ? 4 : 6;
    doc.setTextColor(0, 0, 0);
    const idLabel = isVerySmall ? "No:" : "Receipt ID:";
    doc.text(`${idLabel} ${receipt.receiptNo}`, xOffset + margin, currentY);
    doc.text(`Date: ${formatDateSlash(receipt.createdAt?.toDate())}`, xOffset + width - margin, currentY, { align: 'right' });

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
    const midValX = midX + (isSmall ? 12 : 18);

    let rowY = currentY + (isSmall ? 4 : 5);
    doc.setFont("helvetica", "normal");
    doc.text("Name:", labelX, rowY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(17, 24, 39);
    doc.text(`${student.name?.substring(0, 20).toUpperCase()}`, valX, rowY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    doc.text("App ID:", midX, rowY);
    doc.setFont("helvetica", "bold");
    doc.text(`${student.appId}`, midValX, rowY);

    if (!isVerySmall) {
        rowY += isSmall ? 3 : 5;
        doc.setFont("helvetica", "normal");
        doc.text("Father:", labelX, rowY);
        doc.setFont("helvetica", "bold");
        doc.text(`${student.fatherName?.substring(0, 15).toUpperCase() || "N/A"}`, valX, rowY);

        doc.setFont("helvetica", "normal");
        doc.text("Class:", midX, rowY);
        doc.setFont("helvetica", "bold");
        doc.text(`${student.className} - ${student.sectionName || "N/A"}`, midValX, rowY);

        if (!isSmall) {
            rowY += 5;
            doc.setFont("helvetica", "normal");
            doc.text("Mode:", labelX, rowY);
            doc.setFont("helvetica", "bold");
            doc.text(`${(receipt.paymentMode || "CASH").toUpperCase()}`, valX, rowY);

            doc.setFont("helvetica", "normal");
            doc.text("Session:", midX, rowY);
            doc.setFont("helvetica", "bold");
            doc.text(`${receipt.sessionId || "N/A"}`, midValX, rowY);
        }
    } else {
        rowY += 4;
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.text(`Class: ${student.className}-${student.sectionName || "N/A"} | Mode: ${(receipt.paymentMode || "CASH").toUpperCase()}`, labelX, rowY);
    }

    currentY += profileH + (isSmall ? 2 : 4);

    let tableData = [];
    let payableTotal = 0;

    if (receipt.items && receipt.items.length > 0) {
        receipt.items.forEach(item => {
            const period = item.period || item.label || "";
            if (item.headsSnapshot && Array.isArray(item.headsSnapshot)) {
                item.headsSnapshot.forEach(head => {
                    tableData.push([
                        head.headName || "Fee Particular",
                        period,
                        `Rs. ${head.amount?.toLocaleString()}`
                    ]);
                    payableTotal += (head.amount || 0);
                });
            } else {
                tableData.push([
                    item.label || item.name || "General Fee",
                    period,
                    `Rs. ${item.amount?.toLocaleString()}`
                ]);
                payableTotal += (item.amount || 0);
            }
        });
    }

    if (isVerySmall && tableData.length > 4) {
        tableData = tableData.slice(0, 3);
        tableData.push(["& others (see full statement)", "", ""]);
    }

    autoTable(doc, {
        startY: currentY,
        margin: { left: xOffset + margin, right: (doc.internal.pageSize.width - (xOffset + width)) + margin },
        head: [['Fee Particulars Description', 'Period', 'Amount']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: isSmall ? 6.5 : 8, cellPadding: isSmall ? 1 : 1.5, lineColor: [243, 244, 246] },
        headStyles: { fillColor: [31, 41, 55], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: isSmall ? 18 : 22, halign: 'left' },
            2: { halign: 'right', fontStyle: 'bold', cellWidth: isSmall ? 25 : 30 }
        },
        didParseCell: (data) => {
            const { cell, column } = data;
            if (column.index === 2) {
                cell.styles.halign = 'right';
            }
        },
    });

    currentY = doc.lastAutoTable.finalY + (isSmall ? 2 : 4);
    const summaryTotalH = isVerySmall ? 14 : (isSmall ? 18 : 24);
    const summaryY = yOffset + height - margin - summaryTotalH - (isSmall ? 4 : 8);
    const finalY = Math.min(currentY, summaryY);
    let sY = finalY;

    const summaryW = isSmall ? 50 : 60;
    const sX = xOffset + width - margin - summaryW;

    doc.setFontSize(isSmall ? 7 : 8);
    doc.setTextColor(107, 114, 128);
    doc.setFont("helvetica", "normal");

    doc.text("Payable Amount:", sX, sY + (isSmall ? 2 : 3));
    doc.setTextColor(17, 24, 39);
    doc.text(`Rs. ${payableTotal.toLocaleString()}`, xOffset + width - margin - 2, sY + (isSmall ? 2 : 3), { align: 'right' });

    sY += isSmall ? 4 : 5;
    doc.setTextColor(107, 114, 128);
    doc.text("Discount:", sX, sY + (isSmall ? 2 : 3));
    doc.setTextColor(220, 38, 38);
    doc.text(`(-) Rs. ${receipt.discount.amount.toLocaleString()}`, xOffset + width - margin - 2, sY + (isSmall ? 2 : 3), { align: 'right' });

    sY += isSmall ? 4 : 6;
    doc.setFillColor(17, 24, 39);
    doc.rect(sX - 1, sY, summaryW + 1, isSmall ? 6 : 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(isSmall ? 8 : 9);
    doc.setFont("helvetica", "bold");
    doc.text("PAID AMOUNT:", sX, sY + (isSmall ? 4 : 4.5));
    const dispAmount = receipt.paidAmount || receipt.amount || 0;
    doc.text(`Rs. ${dispAmount.toLocaleString()}`, xOffset + width - margin - 2, sY + (isSmall ? 4 : 4.5), { align: 'right' });

    let footerY = yOffset + height - margin - (isSmall ? 2 : 4);
    doc.setFontSize(isSmall ? 6 : 7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(156, 163, 175);
    doc.text("Electronically Generated - No signature needed", centerX, footerY, { align: 'center' });

    footerY -= (isSmall ? 4 : 6);
    doc.setFontSize(isSmall ? 6.5 : 8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55, 65, 81);
    const wordsValue = numberToWords(receipt.paidAmount || receipt.amount || 0) + " Only";
    doc.text(`In Words: ${wordsValue.substring(0, 45)}`, xOffset + margin, footerY);

    if (receipt.remark) {
        footerY -= (isSmall ? 3.5 : 4.5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(isSmall ? 6 : 7);
        doc.setTextColor(107, 114, 128);
        doc.text(`Remark: ${receipt.remark.substring(0, 80)}`, xOffset + margin, footerY);
    }

    if (!isSmall) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(55, 65, 81);
        doc.text("AUTHORIZED SIGNATORY", xOffset + width - margin - 25, yOffset + height - margin - 10, { align: 'center' });
        doc.line(xOffset + width - margin - 45, yOffset + height - margin - 14, xOffset + width - margin - 5, yOffset + height - margin - 14);
    }
};

const numberToWords = (num) => {
    if (!num || num === 0) return 'Zero';
    const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const format = (n) => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + format(n % 100) : '');
        if (n < 100000) return format(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + format(n % 1000) : '');
        return n.toString();
    };
    return format(Math.floor(num));
};
