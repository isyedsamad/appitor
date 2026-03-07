import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDateSlash } from "@/lib/dateUtils";

export const generateLedgerPDF = ({ branchInfo, schoolName, transactions, filters, summary }) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const centerX = pageWidth / 2;
    let currentY = 8;

    // Premium Dark Header (Receipt Style)
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
    doc.setFont("helvetica", "normal");
    doc.text(`FEE LEDGER REPORT | Period: ${filters.startDate} - ${filters.endDate}`, centerX, currentY + 23, { align: 'center' });

    currentY += headerH + 8;

    // Report Title & Period
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("FEE LEDGER TRANSACTION REPORT", margin, currentY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    const dateRange = filters.startDate === filters.endDate
        ? formatDateSlash(new Date(filters.startDate))
        : `${formatDateSlash(new Date(filters.startDate))} - ${formatDateSlash(new Date(filters.endDate))}`;
    doc.text(`Report Period: ${dateRange}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 8;

    // Premium Metric Cards (Rounded & Color Coded)
    const cardW = (pageWidth - (margin * 2) - 6) / 3;
    const cardH = 18;

    // Total Collections Card
    doc.setFillColor(240, 253, 244); // Green Soft
    doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(187, 247, 208); // Green Border
    doc.roundedRect(margin, currentY, cardW, cardH, 2, 2, 'D');

    doc.setFontSize(7);
    doc.setTextColor(21, 128, 61);
    doc.text("TOTAL COLLECTIONS", margin + 5, currentY + 6);
    doc.setFontSize(10);
    doc.text(`Rs. ${summary.totalPaid.toLocaleString()}`, margin + 5, currentY + 13);

    // Total Refunds Card
    doc.setFillColor(254, 242, 242); // Red Soft
    doc.roundedRect(margin + cardW + 3, currentY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin + cardW + 3, currentY, cardW, cardH, 2, 2, 'D');

    doc.setTextColor(185, 28, 28);
    doc.setFontSize(7);
    doc.text("TOTAL REFUNDS", margin + cardW + 8, currentY + 6);
    doc.setFontSize(10);
    doc.text(`Rs. ${summary.totalRefund.toLocaleString()}`, margin + cardW + 8, currentY + 13);

    // Net Balance Card
    doc.setFillColor(249, 250, 251); // gray Soft
    doc.roundedRect(margin + (cardW * 2) + 6, currentY, cardW, cardH, 2, 2, 'F');
    doc.setDrawColor(229, 231, 235); // Gray Border
    doc.roundedRect(margin + (cardW * 2) + 6, currentY, cardW, cardH, 2, 2, 'D');

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7);
    doc.text("NET BALANCE", margin + (cardW * 2) + 11, currentY + 6);
    doc.setFontSize(10);
    doc.text(`Rs. ${summary.netBalance.toLocaleString()}`, margin + (cardW * 2) + 11, currentY + 13);

    currentY += cardH + 10;

    // Transactions Table
    const tableData = transactions.map(t => [
        t.receiptNo || "N/A",
        t.appId || "N/A",
        formatDateSlash(t.createdAt?.toDate()),
        t.paymentMode?.toUpperCase() || "CASH",
        t.type?.toUpperCase() || "PAYMENT",
        `Rs. ${Math.abs(t.amount).toLocaleString()}`
    ]);

    autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [['Receipt No', 'App ID', 'Date', 'Mode', 'Type', 'Amount']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
            5: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
                if (data.cell.raw === 'REFUND') {
                    data.cell.styles.textColor = [185, 28, 28];
                } else {
                    data.cell.styles.textColor = [21, 128, 61];
                }
            }
        }
    });

    // Executive Footer Analysis
    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(8);
    doc.setTextColor(17, 24, 39);
    doc.setFont("helvetica", "bold");
    doc.text("EXECUTIVE ANALYSIS:", margin, finalY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(55, 65, 81);

    const count = transactions.length;
    const refunds = transactions.filter(t => t.type === 'refund').length;
    const paymentModes = [...new Set(transactions.map(t => t.paymentMode || 'cash'))];

    const analysisText = [
        `• Total Transactions Processed: ${count}`,
        `• Total Refund Instances: ${refunds} (${((refunds / (count || 1)) * 100).toFixed(1)}% of total volume)`,
        `• Diversified Payments across: ${paymentModes.join(", ").toUpperCase()}`
    ];

    analysisText.forEach((t, i) => {
        doc.text(t, margin + 2, finalY + 6 + (i * 4.5));
    });

    // Footer Branding
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.setFont("helvetica", "italic");
    doc.text(`Generated on ${new Date().toLocaleString()} | Appitor Finance Module`, margin, pageHeight - 10);
    doc.text("Electronically Generated Document - No Signature Required", pageWidth - margin, pageHeight - 10, { align: 'right' });

    window.open(doc.output('bloburl'), '_blank');
};
