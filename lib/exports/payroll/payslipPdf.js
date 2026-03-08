import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatMonthYear } from "@/lib/dateUtils";

export function exportPayslipPDF({ schoolUser = {}, schoolName, branchName, payrollItems, monthYear, format = 'full', includeOfficeCopy = false }) {
    const isLandscape = format === '1/2';
    const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    const slipWidth = isLandscape ? pageWidth / 2 : pageWidth;
    const slipHeight = isLandscape ? pageHeight : pageHeight;

    const items = Array.isArray(payrollItems) ? payrollItems : [payrollItems];

    const drawPayslip = (item, xOffset, yOffset, typeLabel, isSmall = false) => {
        const margin = isSmall ? 8 : 10;
        let currentY = yOffset + margin;
        const contentWidth = slipWidth - (margin * 2);
        const centerX = xOffset + (slipWidth / 2);

        const headerH = isSmall ? 18 : 22;
        doc.setFillColor(15, 23, 42);
        doc.rect(xOffset + margin, currentY - 2, contentWidth, headerH, 'F');

        currentY += (isSmall ? 5 : 6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(isSmall ? 10 : 16);
        doc.setTextColor(255, 255, 255);
        doc.text(schoolUser?.schoolName?.toUpperCase() || schoolName?.toUpperCase() || "APPITOR SCHOOL", centerX, currentY, { align: 'center' });

        currentY += (isSmall ? 4 : 7);
        doc.setFontSize(isSmall ? 7 : 9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225);
        doc.text(`Branch: ${branchName || "Main Campus"}`, centerX, currentY, { align: 'center' });

        currentY += (isSmall ? 3 : 5);
        doc.setFontSize(isSmall ? 7 : 9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(203, 213, 225);
        doc.text(`Pay Slip for Period: ${formatMonthYear(monthYear)}`, centerX, currentY, { align: 'center' });

        if (typeLabel) {
            doc.setFillColor(30, 41, 59);
            const badgeW = isSmall ? 22 : 28;
            const badgeH = isSmall ? 4 : 5;
            doc.rect(xOffset + slipWidth - margin - badgeW - 1, yOffset + margin + 1, badgeW, badgeH, 'F');
            doc.setFontSize(isSmall ? 5 : 6);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            doc.text(typeLabel, xOffset + slipWidth - margin - (badgeW / 2) - 1, yOffset + margin + 1 + (isSmall ? 3 : 3.8), { align: 'center' });
        }

        currentY = yOffset + margin + headerH + (isSmall ? 2 : 4);
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(isSmall ? 9 : 11);
        doc.setFont("helvetica", "bold");
        doc.text(`MONTHLY SALARY PAYSLIP`, centerX, currentY, { align: 'center' });

        currentY += (isSmall ? 2 : 3);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(xOffset + margin, currentY, xOffset + slipWidth - margin, currentY);

        currentY += (isSmall ? 4 : 6);
        doc.setFontSize(isSmall ? 7.5 : 9);

        const col1 = xOffset + margin + 1;
        const val1 = col1 + (isSmall ? 22 : 28);
        const col2 = centerX + 2;
        const val2 = col2 + (isSmall ? 22 : 28);

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
            currentY += (isSmall ? 4.5 : 6);
        };

        drawRow("Employee:", item.name?.toUpperCase(), "Period:", formatMonthYear(monthYear));
        drawRow("Employee ID:", item.employeeId, "Designation:", (item.role || "").toUpperCase());

        const tableData = [
            ["Payments", "Amount (Rs.)", "Deductions", "Amount (Rs.)"],
        ];

        const earnings = [
            ["Base Salary", item.fixedSalary.toLocaleString()],
            ...(item.earnings?.map(e => [e.name, e.amount.toLocaleString()]) || [])
        ];
        if (item.adjustments > 0) earnings.push(["Bonus / Adjustment", item.adjustments.toLocaleString()]);

        const deductions = [
            ...(item.deductions?.map(d => [d.name, d.amount.toLocaleString()]) || [])
        ];
        if (item.lopAmount > 0) deductions.push([`LOP (${item.lopDays} Days)`, item.lopAmount.toLocaleString()]);
        if (item.adjustments < 0) deductions.push(["Penalty / Adj", Math.abs(item.adjustments).toLocaleString()]);

        const maxLen = Math.max(earnings.length, deductions.length);
        for (let i = 0; i < maxLen; i++) {
            const row = [
                earnings[i]?.[0] || "--", earnings[i]?.[1] || "--",
                deductions[i]?.[0] || "--", deductions[i]?.[1] || "--"
            ];
            if (!earnings[i]?.[0]) row[1] = "--";
            if (!deductions[i]?.[0]) row[3] = "--";
            tableData.push(row);
        }

        autoTable(doc, {
            startY: currentY,
            head: [tableData[0]],
            body: tableData.slice(1),
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
                halign: 'left'
            },
            columnStyles: {
                1: { halign: 'right', fontStyle: 'bold' },
                3: { halign: 'right', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                const { cell, column } = data;
                if (column.index === 1 || column.index === 2 || column.index === 3) {
                    cell.styles.halign = 'right';
                }
            },
            margin: { left: xOffset + margin, right: (doc.internal.pageSize.width - (xOffset + slipWidth)) + margin }
        });

        currentY = doc.lastAutoTable.finalY + (isSmall ? 4 : 6);
        doc.setFillColor(248, 250, 252);
        const boxH = isSmall ? 12 : 16;
        doc.rect(xOffset + margin, currentY, contentWidth, boxH, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.rect(xOffset + margin, currentY, contentWidth, boxH, 'S');

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(isSmall ? 7.5 : 9);
        doc.setFont("helvetica", "bold");
        doc.text("NET SALARY PAYABLE", xOffset + margin + 5, currentY + (isSmall ? 6 : 7));

        doc.setFontSize(isSmall ? 10 : 12);
        doc.setTextColor(16, 185, 129);
        doc.text(`Rs. ${item.netPayable.toLocaleString()} /-`, xOffset + slipWidth - margin - 5, currentY + (isSmall ? 7 : 10), { align: 'right' });

        const totalEarnings = item.fixedSalary + (item.earnings?.reduce((s, e) => s + e.amount, 0) || 0) + (item.adjustments > 0 ? item.adjustments : 0);
        const totalDeductions = (item.deductions?.reduce((s, d) => s + d.amount, 0) || 0) + (item.lopAmount || 0) + (item.adjustments < 0 ? Math.abs(item.adjustments) : 0);

        doc.setFontSize(isSmall ? 6 : 8);
        doc.setTextColor(107, 114, 128);
        doc.text(`Total Earnings: Rs.${totalEarnings.toLocaleString()}  |  Total Deductions: Rs.${totalDeductions.toLocaleString()}`, xOffset + margin + 5, currentY + (isSmall ? 9 : 11));

        currentY += boxH + (isSmall ? 12 : 18);
        const sigY = currentY;
        const sigW = isSmall ? 25 : 35;

        doc.setDrawColor(71, 85, 105);
        doc.setLineWidth(0.15);
        doc.line(xOffset + margin + 5, sigY, xOffset + margin + 5 + sigW, sigY);
        doc.setFontSize(isSmall ? 6 : 7.5);
        doc.setTextColor(71, 85, 105);
        doc.text("EMPLOYEE", xOffset + margin + 5 + (sigW / 2), sigY + 3, { align: 'center' });
        doc.line(xOffset + slipWidth - margin - 5 - sigW, sigY, xOffset + slipWidth - margin - 5, sigY);
        doc.text("AUTHORIZED", xOffset + slipWidth - margin - 5 - (sigW / 2), sigY + 3, { align: 'center' });
        currentY += (isSmall ? 4 : 6);
        doc.setFontSize(4);
        doc.setTextColor(200, 200, 200);
        doc.text("POWERED BY APPITOR", centerX, currentY + 1, { align: 'center' });

        return currentY + 5;
    };

    if (isLandscape) {
        if (includeOfficeCopy) {
            for (let i = 0; i < items.length; i++) {
                if (i > 0) doc.addPage();
                drawPayslip(items[i], 0, 0, "ORIGINAL COPY", true);
                doc.setDrawColor(200, 200, 200);
                doc.setLineDashPattern([2, 5], 0);
                doc.line(pageWidth / 2, 0, pageWidth / 2, pageHeight);
                doc.setLineDashPattern([], 0);
                drawPayslip(items[i], pageWidth / 2, 0, "OFFICE COPY", true);
            }
        } else {
            for (let i = 0; i < items.length; i += 2) {
                if (i > 0) doc.addPage();
                drawPayslip(items[i], 0, 0, null, true);
                if (items[i + 1]) {
                    doc.setDrawColor(200, 200, 200);
                    doc.setLineDashPattern([2, 5], 0);
                    doc.line(pageWidth / 2, 0, pageWidth / 2, pageHeight);
                    doc.setLineDashPattern([], 0);

                    drawPayslip(items[i + 1], pageWidth / 2, 0, null, true);
                }
            }
        }
    } else {
        for (let i = 0; i < items.length; i++) {
            if (i > 0) doc.addPage();
            drawPayslip(items[i], 0, 0, null, false);
        }
    }

    const filename = items.length === 1 ? `Payslip_${items[0].name.replace(/\s+/g, "_")}_${formatMonthYear(monthYear)}.pdf` : `Payslip_Bulk_${formatMonthYear(monthYear)}.pdf`;
    // doc.save(filename);
    window.open(doc.output('bloburl'), '_blank');
}
