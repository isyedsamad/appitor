"use client";

import { useState, useRef } from "react";
import {
  FileUp,
  Users,
  CheckCircle2,
  AlertCircle,
  Download,
  Trash2,
  UserPlus,
  ChevronLeft,
  Briefcase,
  Smartphone,
  CircleDollarSign,
  ShieldAlert
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { useRouter } from "next/navigation";

export default function BulkEmployeeImportPage() {
  const router = useRouter();
  const { schoolUser, setLoading, roles, loadEmployee } = useSchool();
  const { branch, branchInfo } = useBranch();
  const fileInputRef = useRef(null);
  const [excelData, setExcelData] = useState([]);
  const [importResults, setImportResults] = useState(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        if (data.length === 0) {
          toast.error("The selected file is empty.");
          return;
        }

        const mapped = data.map((row, index) => ({
          tempId: index,
          name: row.Name || row.name || "",
          mobile: row.Mobile || row.mobile || "",
          salary: row.Salary || row.salary || "",
          roleId: "",
          role: "",
          error: ""
        }));

        setExcelData(mapped);
        toast.info(`Loaded ${mapped.length} rows from Excel.`);
      } catch (err) {
        toast.error("Failed to parse Excel file. Ensure it's a valid .xlsx or .xls file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const updateRow = (tempId, key, value) => {
    setExcelData(prev => prev.map(row => {
      if (row.tempId === tempId) {
        if (key === "roleId") {
          const roleObj = roles.find(r => r.id === value);
          return { ...row, roleId: value, role: roleObj ? roleObj.name : "" };
        }
        return { ...row, [key]: value };
      }
      return row;
    }));
  };

  const removeRow = (tempId) => {
    setExcelData(prev => prev.filter(row => row.tempId !== tempId));
  };

  const downloadTemplate = () => {
    const template = [
      { Name: "John Doe", Mobile: "9876543210", Salary: "25000" },
      { Name: "Jane Smith", Mobile: "8877665544", Salary: "30000" }
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");
    XLSX.writeFile(wb, "Employee_Import_Template.xlsx");
  };

  const handleImport = async () => {
    const invalid = excelData.find(r => !r.name || !r.mobile || !r.roleId || !r.salary);
    if (invalid) {
      toast.error("Please ensure all rows have a Name, Mobile, Role, and Salary.");
      return;
    }

    if (!confirm(`Are you sure you want to import ${excelData.length} employees?`)) return;
    setLoading(true);
    try {
      const resp = await secureAxios.post("/api/school/employees/import", {
        employees: excelData,
        branch,
        branchName: branchInfo.name
      });

      setImportResults(resp.data);
      setExcelData([]);
      await loadEmployee(branch);
      toast.success("Bulk import completed successfully!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Import failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequirePermission permission="employee.admit.view">
      <div className="space-y-6 pb-20">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <UserPlus size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Bulk Employee Import</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Admit multiple staff members via Excel sheet
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="btn-outline flex items-center gap-2 text-sm font-semibold"
            >
              <Download size={14} /> Download Template
            </button>
            {/* <button
              onClick={() => router.back()}
              className="btn-outline flex items-center gap-2 text-xs font-semibold"
            >
              <ChevronLeft size={14} /> Back
            </button> */}
          </div>
        </div>

        {importResults ? (
          <div className="bg-(--bg-card) border border-green-500/20 rounded-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-green-600 font-bold text-lg">
              <CheckCircle2 size={24} />
              Import Successful: {importResults.count} Employees Admitted
            </div>
            <p className="text-sm text-(--text-muted)">
              Individual credentials have been generated based on the Employee ID and Mobile number pattern.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
              {importResults.employees.map((emp, i) => (
                <div key={i} className="p-4 bg-(--bg) border border-(--border) rounded-xl space-y-2">
                  <p className="font-bold text-sm truncate">{emp.name}</p>
                  <div className="flex justify-between text-[11px] font-mono bg-(--bg-soft) p-2 rounded">
                    <span className="text-(--text-muted)">ID:</span>
                    <span className="font-bold text-(--primary)">{emp.employeeId}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-mono bg-(--bg-soft) p-2 rounded">
                    <span className="text-(--text-muted)">Pass:</span>
                    <span className="font-bold">{emp.password}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setImportResults(null)}
              className="btn-primary w-fit px-8"
            >
              Done
            </button>
          </div>
        ) : excelData.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group cursor-pointer border-2 border-dashed border-(--border) hover:border-(--primary)/50 rounded-2xl p-16 flex flex-col items-center justify-center space-y-4 transition-all bg-(--bg-card)/30 hover:bg-(--primary-soft)/10"
          >
            <input
              type="file"
              ref={fileInputRef}
              hidden
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
            <div className="w-16 h-16 rounded-2xl bg-(--bg-soft) text-(--text-muted) group-hover:bg-(--primary-soft) group-hover:text-(--primary) flex items-center justify-center transition-colors shadow-inner">
              <FileUp size={32} />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-lg">Click to Upload Excel</h3>
              <p className="text-sm text-(--text-muted)">Support .xlsx and .xls files</p>
            </div>
            <div className="flex items-center gap-6 pt-4 text-xs font-semibold text-(--text-muted)">
              <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /> Sequential ID Gen</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /> Atomic Commit</span>
              <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /> Auth Rollback</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-(--bg-soft) px-6 py-4 flex items-center justify-between border-b border-(--border)">
                <div className="flex items-center gap-2 font-bold">
                  <Users size={18} className="text-(--primary)" />
                  Import Preview ({excelData.length} Rows)
                </div>
                <button
                  onClick={() => setExcelData([])}
                  className="text-xs font-bold text-(--danger) hover:underline flex items-center gap-1"
                >
                  <Trash2 size={14} /> Clear All
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead>
                    <tr className="bg-(--bg-soft) text-(--text-muted) border-b border-(--border)">
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Name</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Mobile</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Salary</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px]">Assign Role</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-[10px] w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {excelData.map((row) => (
                      <tr key={row.tempId} className="hover:bg-(--bg-soft)/50 transition-colors">
                        <td className="px-6 py-3 font-bold">{row.name}</td>
                        <td className="px-6 py-3">{row.mobile}</td>
                        <td className="px-6 py-3">₹{row.salary}</td>
                        <td className="px-6 py-3">
                          <select
                            className="input bg-(--bg) text-sm w-full max-w-[200px]"
                            value={row.roleId}
                            onChange={(e) => updateRow(row.tempId, "roleId", e.target.value)}
                          >
                            <option value="">Select Role</option>
                            {roles?.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => removeRow(row.tempId)}
                            className="p-2 text-(--danger) hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-2xl p-5 flex items-start gap-4">
              <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-xl">
                <ShieldAlert size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm">Review Before Importing</h4>
                <p className="text-xs text-(--text-muted) leading-relaxed">
                  Clicking "Finalize Import" will create Firebase Auth accounts and sequential school IDs for all {excelData.length} employees.
                  In case of any error, the system will automatically rollback created accounts.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setExcelData([])}
                className="btn-outline px-8"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                className="btn-primary px-12 flex items-center gap-2"
              >
                <CheckCircle2 size={16} /> Finalize Import
              </button>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
