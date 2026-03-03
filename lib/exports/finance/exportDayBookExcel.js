import * as XLSX from "xlsx";

export function exportDayBookToExcel({
    dayData,
    branchInfo,
    selectedDate,
}) {
    const dateStr = selectedDate.toDateString();

    const headerContent = [
        ["Appitor Finance - Day Book Report"],
        ["School", branchInfo?.name || "N/A"],
        ["Branch", branchInfo?.address || "N/A"],
        ["Report Date", dateStr],
        ["Generated At", new Date().toLocaleString()],
        [],
        ["SUMMARY METRICS"],
        ["Total Collections", dayData.collections?.total || 0],
        ["Total Refunds", dayData.refunds?.total || 0],
        ["Net Balance", dayData.net || 0],
        ["Total Transactions", dayData.transactions || 0],
        [],
        ["PAYMENT MODE BREAKDOWN"],
        ["Mode", "Collections", "Refunds"]
    ];

    const modes = [
        { key: 'cash', label: 'CASH' },
        { key: 'upi', label: 'UPI' },
        { key: 'card', label: 'CARD' },
        { key: 'netbanking', label: 'NET BANKING' },
        { key: 'wallet', label: 'WALLET' },
        { key: 'cheque', label: 'CHEQUE' },
    ];

    const modeRows = modes.map(m => [
        m.label,
        dayData.collections?.[m.key] || 0,
        dayData.refunds?.[m.key] || 0
    ]);

    const finalRows = [...headerContent, ...modeRows];

    const ws = XLSX.utils.aoa_to_sheet(finalRows);

    // Basic Styling/Sizing
    ws["!cols"] = [
        { wch: 25 },
        { wch: 20 },
        { wch: 20 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DayBook Summary");

    XLSX.writeFile(
        wb,
        `DayBook_Report_${dateStr.replace(/ /g, '_')}.xlsx`
    );
}
