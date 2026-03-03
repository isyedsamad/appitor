import * as XLSX from "xlsx";

export function exportFinanceReportToExcel({
    summary,
    trend,
    mode,
    label,
    branchInfo
}) {
    const headerContent = [
        ["Appitor Finance - Analytical Report"],
        ["School", branchInfo?.name || "N/A"],
        ["Branch", branchInfo?.address || "N/A"],
        ["Report Period", label],
        ["View Mode", mode.toUpperCase()],
        ["Generated At", new Date().toLocaleString()],
        [],
        ["SUMMARY METRICS"],
        ["Total Collections", mode === 'month' ? summary.collections.total : summary.collections],
        ["Total Refunds", mode === 'month' ? summary.refunds.total : summary.refunds],
        ["Net Revenue", summary.net],
        [],
        ["PERIODIC TREND DATA"],
        ["Period/Month", "Collections", "Refunds", "Net Revenue"]
    ];

    const trendRows = trend.map(t => [
        t.label,
        t.collections?.total || 0,
        t.refunds?.total || 0,
        t.net || 0
    ]);

    const finalRows = [...headerContent, ...trendRows];

    const ws = XLSX.utils.aoa_to_sheet(finalRows);

    ws["!cols"] = [
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "FinanceTrend");

    const fileName = `Finance_Report_${label.replace(/ /g, '_')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
