import * as XLSX from "xlsx";

export function exportLedgerToExcel({
  rows = [],
  schoolName = "",
  branchName = "",
  fromLabel = "",
}) {
  if (!rows.length) return;
  const headerTitle = [
    [
      "Fee Ledger",
      "",
      "",
      "",
      "",
      "",
    ],
  ];
  const metaRow = [
    [
      `School: ${schoolName}`,
      `Branch: ${branchName}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "",
      "",
    ],
  ];
  const columns = [
    [
      "Receipt No",
      "Student App ID",
      "Transaction Type",
      "Amount (₹)",
      "Payment Mode",
      "Date",
    ],
  ];
  const dataRows = rows.map(r => [
    r.receiptNo || "-",
    r.appId || "-",
    r.type === "refund" ? "Refund" : "Payment",
    Math.abs(Number(r.amount || 0)),
    r.paymentMode ? r.paymentMode : r.payType ? r.payType : '-' || "-",
    r.createdAt?.toDate
      ? r.createdAt.toDate().toLocaleString()
      : "-",
  ]);
  const sheetData = [
    ...headerTitle,
    ...metaRow,
    [],
    ...columns,
    ...dataRows,
  ];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
  ];
  ws["!cols"] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
    { wch: 25 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ledger");

  XLSX.writeFile(
    wb,
    `Fee_Ledger_${fromLabel || Date.now()}.xlsx`
  );
}
