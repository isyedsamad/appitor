import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateSlash } from "@/lib/dateUtils";

export const generateDayBookPDF = ({ branchInfo, dayData, selectedDate }) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const centerX = pageWidth / 2;
    let currentY = 8;

    // Premium Dark Header (Receipt Style)
    const headerH = 22;
    doc.setFillColor(17, 24, 39);
    doc.rect(margin, currentY, pageWidth - (margin * 2), headerH, 'F');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(branchInfo?.name?.toUpperCase() || "SCHOOL NAME", centerX, currentY + 8, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(209, 213, 219);
    doc.text(`${branchInfo?.address || "Branch Address"}`, centerX, currentY + 14, { align: 'center' });
    doc.text(`Code: ${branchInfo?.branchCode || "N/A"}`, centerX, currentY + 18, { align: 'center' });

    currentY += headerH + 8;

    // Report Title & Period
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text("DAILY FINANCIAL SUMMARY (DAY BOOK)", margin, currentY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Transaction Date: ${selectedDate.toDateString()}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 8;

    // Premium Metric Cards
    const cardW = (pageWidth - (margin * 2) - 9) / 4;
    const cardH = 20;

    const stats = [
        { label: "COLLECTIONS", value: dayData.collections?.total || 0, color: [21, 128, 61], bg: [240, 253, 244], border: [187, 247, 208] },
        { label: "REFUNDS", value: dayData.refunds?.total || 0, color: [185, 28, 28], bg: [254, 242, 242], border: [254, 202, 202] },
        { label: "NET BALANCE", value: dayData.net || 0, color: [17, 24, 39], bg: [249, 250, 251], border: [229, 231, 235] },
        { label: "TRANSACTIONS", value: dayData.transactions || 0, color: [37, 99, 235], bg: [239, 246, 255], border: [191, 219, 254], isCount: true }
    ];

    let statX = margin;
    stats.forEach(s => {
        doc.setFillColor(...s.bg);
        doc.roundedRect(statX, currentY, cardW, cardH, 2, 2, 'F');
        doc.setDrawColor(...s.border);
        doc.roundedRect(statX, currentY, cardW, cardH, 2, 2, 'D');

        doc.setFontSize(6.5);
        doc.setTextColor(107, 114, 128);
        doc.text(s.label, statX + 4, currentY + 6);

        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...s.color);
        doc.text(`${s.isCount ? '' : 'Rs. '}${s.value.toLocaleString()}`, statX + 4, currentY + 14);
        statX += cardW + 3;
    });

    currentY += cardH + 10;

    // Mode Distribution Tables
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("PAYMENT MODE ANALYSIS", margin, currentY);

    const modes = ['cash', 'upi', 'card', 'netbanking', 'wallet', 'cheque'];
    const breakdownData = modes.map(m => [
        m.toUpperCase(),
        `Rs. ${(dayData.collections?.[m] || 0).toLocaleString()}`,
        `Rs. ${(dayData.refunds?.[m] || 0).toLocaleString()}`,
        `Rs. ${((dayData.collections?.[m] || 0) - (dayData.refunds?.[m] || 0)).toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: currentY + 4,
        margin: { left: margin, right: margin },
        head: [['Mode', 'Collections', 'Refunds', 'Revenue']],
        body: breakdownData,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [55, 65, 81], textColor: [255, 255, 255] },
        columnStyles: {
            1: { halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] },
            2: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
            3: { halign: 'right', fontStyle: 'bold' }
        }
    });

    // Insights Section
    let finalY = doc.lastAutoTable.finalY + 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("EXECUTIVE INSIGHTS", margin, finalY);

    finalY += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(55, 65, 81);

    const dominantMode = modes.reduce((a, b) => (dayData.collections?.[b] || 0) > (dayData.collections?.[a] || 0) ? b : a);
    const refundRate = dayData.collections?.total ? ((dayData.refunds?.total / dayData.collections?.total) * 100).toFixed(1) : 0;

    const insights = [
        `• Dominant Revenue Channel: ${dominantMode.toUpperCase()} recorded the highest collections today.`,
        `• Operational fund retention rate is ${(100 - refundRate).toFixed(1)}% (Total Refunds: ${refundRate}% of total).`,
        `• Net Liquidity Impact: A total movement of Rs. ${dayData.net.toLocaleString()} was finalized.`
    ];

    insights.forEach(text => {
        doc.text(text, margin + 2, finalY);
        finalY += 5;
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on ${new Date().toLocaleString()} | Appitor ERP`, margin, pageHeight - 10);
    doc.text("Official Financial Log - Electronically Generated", pageWidth - margin, pageHeight - 10, { align: 'right' });

    window.open(doc.output('bloburl'), '_blank');
};
