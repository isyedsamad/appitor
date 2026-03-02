"use client";

import { useState } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { useTheme } from "next-themes";

function excelDateToYMD(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

export default function ImportExportAdmissions() {
  const { sessionList, currentSession, classData, setLoading } = useSchool();
  const { branch, branchInfo } = useBranch();
  const { theme } = useTheme();
  const [context, setContext] = useState({
    sessionId: currentSession?.id || "",
    classId: "",
    sectionId: "",
  });

  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      {
        admissionId: "",
        name: "",
        fatherName: "",
        motherName: "",
        gender: "",
        dob: "",
        phone: "",
        address: "",
      },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "admission_template.xlsx");
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (json.length === 0) {
        toast.error("Empty file");
        return;
      }
      setRows(
        json.map((r, idx) => ({
          row: idx + 1,
          ...r,
          admissionId: r.admissionId?.toString().trim(),
          name: r.name?.trim(),
          dob: excelDateToYMD(r.dob),
          _status: r.name ? "valid" : "error",
        }))
      );
    };
    reader.readAsArrayBuffer(file);
  }

  async function importStudents() {
    if (!context.sessionId || !context.classId || !context.sectionId) {
      toast.error("Select session, class and section");
      return;
    }
    if (rows.length === 0) {
      toast.error("No data to import");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/admissions/import", {
        branchCode: branchInfo.appitorCode,
        branch,
        ...context,
        students: rows,
      });
      toast.success("Students imported successfully");
      setRows([]);
      setFileName("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  async function exportStudents() {
    if (!context.sessionId || !context.classId || !context.sectionId) {
      toast.error("Select session, class and section");
      return;
    }
    setLoading(true);
    try {
      const res = await secureAxios.post(
        "/api/school/admissions/export",
        { branch, ...context },
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_export.xlsx";
      a.click();
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="admission.import.view">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-start pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Import / Export</h1>
              <p className="text-sm text-(--text-muted)">
                Bulk student onboarding via Excel
              </p>
            </div>
          </div>
          <button onClick={downloadTemplate} className="btn-primary">
            <Download size={16} /> Download Template
          </button>
        </div>
        <div className="grid md:grid-cols-5 gap-3">
          <select
            className="input"
            value={context.sessionId}
            onChange={(e) =>
              setContext({ ...context, sessionId: e.target.value })
            }
          >
            <option value="">Select Session</option>
            {sessionList?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id}
              </option>
            ))}
          </select>
          <select
            className="input"
            value={context.classId}
            onChange={(e) =>
              setContext({ ...context, classId: e.target.value, sectionId: "" })
            }
          >
            <option value="">Select Class</option>
            {classData && classData?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="input"
            disabled={!context.classId}
            value={context.sectionId}
            onChange={(e) =>
              setContext({ ...context, sectionId: e.target.value })
            }
          >
            <option value="">Select Section</option>
            {(
              classData && classData.find((c) => c.id === context.classId)?.sections || []
            ).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 flex-wrap">
          <label className="btn-primary flex justify-center items-center gap-2 cursor-pointer">
            <Upload size={16} /> Upload Excel
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleFileUpload}
            />
          </label>
          <button onClick={exportStudents} className="btn-outline">
            <Download size={16} /> Export Students
          </button>
        </div>
        {rows.length == 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg 
                  ${theme == "light" ? 'bg-blue-100 text-blue-600' : 'text-blue-600 dark:bg-blue-950'}`}>
                  <Upload size={20} />
                </div>
                <h3 className="font-semibold text-lg">Import Students</h3>
              </div>
              <p className="text-sm text-(--text-muted) pt-2">
                Bulk add students using an Excel file. Ideal for onboarding existing
                students at the start of a session.
              </p>
              <ul className="text-sm space-y-1 text-(--text-muted)">
                <li>• Supports 100+ students at once</li>
                <li>• Auto-generates login & roll numbers</li>
                <li>• Same rules as New Admission</li>
              </ul>
            </div>
            <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-2">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg 
                  ${theme == "light" ? 'bg-green-100 text-green-600' : 'text-green-600 bg-green-950'}`}>
                  <Download size={20} />
                </div>
                <h3 className="font-semibold text-lg">Export Students</h3>
              </div>
              <p className="text-sm text-(--text-muted) pt-2">
                Download the student list of a class and section in Excel format, including key details like roll number, name, admission number.
              </p>
              <ul className="text-sm space-y-1 text-(--text-muted)">
                <li>• Class & section-wise export</li>
                <li>• Useful for backups & offline edits</li>
                <li>• Re-import supported</li>
              </ul>
            </div>
          </div>
        )}
        {rows.length == 0 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-(--border) bg-(--bg)">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-base">Student Import Workflow</h3>
                  <p className="text-xs text-(--text-muted)">
                    Bulk admission process followed by Appitor
                  </p>
                </div>
              </div>
            </div>
            <div className="p-5 grid lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                {[
                  {
                    step: "01",
                    title: "Select Context",
                    desc: "Choose Session, Class and Section for students",
                  },
                  {
                    step: "02",
                    title: "Prepare Excel",
                    desc: "Use Appitor template with admissionId, name & dob",
                  },
                  {
                    step: "03",
                    title: "Validate Data",
                    desc: "System checks duplicates & required fields",
                  },
                  {
                    step: "04",
                    title: "Import Students",
                    desc: "Accounts & roll numbers created automatically",
                  },
                ].map((s) => (
                  <div key={s.step} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center text-xs font-semibold">
                        {s.step}
                      </div>
                      <div className="flex-1 w-px bg-(--border) mt-1" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-(--text)">
                        {s.title}
                      </p>
                      <p className="text-xs text-(--text-muted)">
                        {s.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-(--bg) border border-(--border) rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-(--text)">
                  Required in Excel
                </p>
                <ul className="text-sm space-y-2 text-(--text-muted)">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    admissionId (unique)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Student name
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    DOB (YYYY-MM-DD)
                  </li>
                </ul>

                <div className="text-xs text-(--text-muted) border-t border-(--border) pt-2">
                  Class, Section & Session are selected in Appitor — not in Excel.
                </div>
              </div>
              <div className="bg-(--bg) border border-(--border) rounded-lg p-4 space-y-3">
                <p className="text-sm font-semibold text-(--text)">
                  What Appitor Does
                </p>
                <ul className="text-sm space-y-2 text-(--text-muted)">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Creates student login accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Assigns roll numbers automatically
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Updates class roster & records
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    Ensures all-or-nothing import
                  </li>
                </ul>
                <div className="text-xs text-(--text-muted) border-t border-(--border) pt-2">
                  If any record fails, no student is imported.
                </div>
              </div>
            </div>
          </div>
        )}
        {rows.length > 0 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-lg overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-(--bg)">
                <tr>
                  <th className="px-4 py-3 text-left">Row</th>
                  <th className="px-4 py-3 text-left">Admission ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-(--border)">
                    <td className="px-4 py-3 text-left">{r.row}</td>
                    <td className="px-4 py-3 text-left">{r.admissionId || ''}</td>
                    <td className="px-4 py-3 text-left">{r.name || ''}</td>
                    <td className="px-4 py-3 text-left">
                      {r._status === "valid" ? (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle size={14} /> Valid
                        </span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1">
                          <AlertCircle size={14} /> Error
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-3 border-t border-(--border)">
              <button onClick={importStudents} className="btn-primary w-full">
                Import {rows.length} Students
              </button>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
