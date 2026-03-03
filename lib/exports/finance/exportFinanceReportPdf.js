import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const generateFinanceReportPDF = ({ branchInfo, summary, trend, mode, label }) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const margin = 10;
    const centerX = pageWidth / 2;
    let currentY = 8;

    // Premium Dark Header
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
    doc.text(`${mode.toUpperCase()} FINANCIAL ANALYTICS REPORT`, margin, currentY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(107, 114, 128);
    doc.text(`Analysis Period: ${label}`, pageWidth - margin, currentY, { align: 'right' });

    currentY += 8;

    // Premium Metric Cards
    const collectionsVal = mode === 'month' ? summary.collections.total : summary.collections;
    const refundsVal = mode === 'month' ? summary.refunds.total : summary.refunds;
    const ratio = ((refundsVal / (collectionsVal || 1)) * 100).toFixed(1);

    const cardW = (pageWidth - (margin * 2) - 9) / 4;
    const cardH = 20;

    const stats = [
        { label: "COLLECTIONS", value: collectionsVal, color: [21, 128, 61], bg: [240, 253, 244], border: [187, 247, 208] },
        { label: "REFUNDS", value: refundsVal, color: [185, 28, 28], bg: [254, 242, 242], border: [254, 202, 202] },
        { label: "NET REVENUE", value: summary.net, color: [17, 24, 39], bg: [249, 250, 251], border: [229, 231, 235] },
        { label: "REFUND RATIO", value: `${ratio}%`, color: [234, 88, 12], bg: [255, 247, 237], border: [254, 215, 170], raw: true }
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
        doc.text(s.raw ? s.value : `Rs. ${s.value.toLocaleString()}`, statX + 4, currentY + 14);
        statX += cardW + 3;
    });

    currentY += cardH + 12;

    // Trend Table
    if (trend && trend.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(17, 24, 39);
        doc.text("PERIODIC TREND ANALYSIS", margin, currentY);

        const tableData = trend.map(t => [
            t.label,
            `Rs. ${(t.collections?.total || 0).toLocaleString()}`,
            `Rs. ${(t.refunds?.total || 0).toLocaleString()}`,
            `Rs. ${(t.net || 0).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: currentY + 4,
            margin: { left: margin, right: margin },
            head: [['Period/Month', 'Collections', 'Refunds', 'Net Revenue']],
            body: tableData,
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 2.5 },
            headStyles: { fillColor: [55, 65, 81] },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 12;
    }

    // Executive summary
    const bestMonth = trend.reduce((a, b) => (b.net > a.net ? b : a), trend[0] || {});

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(17, 24, 39);
    doc.text("EXECUTIVE SUMMARY & INSIGHTS", margin, currentY);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(55, 65, 81);
    const insights = [
        `• Performance Peak: Highest net growth observed in ${bestMonth.label} with Rs. ${bestMonth.net?.toLocaleString()}.`,
        `• Expenditure Analysis: Total refund outflow reached Rs. ${refundsVal.toLocaleString()} during this period.`,
        `• Health Indicator: The current refund-to-collection ratio is ${ratio}%, suggesting a ${Number(ratio) < 10 ? 'healthy' : 'cautionary'} financial flow.`
    ];

    insights.forEach((t, i) => {
        doc.text(t, margin + 2, currentY + 6 + (i * 5));
    });

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(6.5);
    doc.setTextColor(156, 163, 175);
    doc.text(`Automated Analytics Report | Generated: ${new Date().toLocaleString()}`, margin, pageHeight - 10);
    doc.text("Appitor Intelligence Unit - Finance Module", pageWidth - margin, pageHeight - 10, { align: 'right' });

    window.open(doc.output('bloburl'), '_blank');
};
