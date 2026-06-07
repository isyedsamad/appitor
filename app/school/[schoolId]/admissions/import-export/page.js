"use client";

import { useState, useEffect } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { canManage } from "@/lib/school/permissionUtils";

function excelDateToYMD(value) {
  if (!value) return "";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const [d, m, y] = value.split("/");
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return value;
  };
  if (typeof value === "number") {
    try {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (isNaN(date.getTime())) return "";
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    } catch {
      return "";
    }
  }
  return "";
}

export default function ImportExportAdmissions() {
  const { schoolUser, sessionList, currentSession, classData, setLoading } = useSchool();
  const { branch, branchInfo } = useBranch();

  const [context, setContext] = useState({
    sessionId: "",
    classId: "",
    sectionId: "",
  });

  const [classTransportFee, setClassTransportFee] = useState(0);
  const [templates, setTemplates] = useState([]);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    if (currentSession) {
      setContext(prev => ({ ...prev, sessionId: currentSession.id }));
    }
  }, [currentSession]);

  useEffect(() => {
    if (!context.classId || !schoolUser) {
      setClassTransportFee(0);
      setTemplates([]);
      return;
    }
    const fetchTransportFee = async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "templates", "items"),
            where("className", "==", context.classId),
            where("status", "==", "active")
          )
        );
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTemplates(list);
        let tFee = 0;
        const transportTpl = list.find(t =>
          t.items?.some(item => item.headName?.toLowerCase().includes("transport") || item.category === "transport")
        );
        if (transportTpl) {
          const tItem = transportTpl.items.find(item => item.headName?.toLowerCase().includes("transport") || item.category === "transport");
          if (tItem) {
            tFee = Number(tItem.amount || 0);
          }
        }
        setClassTransportFee(tFee);
        setRows(prev => prev.map(r => {
          let selected = null;
          if (r.transport === "yes") {
            selected = list.find(t =>
              t.name?.toLowerCase().includes("transport") ||
              t.items?.some(item => item.headName?.toLowerCase().includes("transport") || item.category === "transport")
            );
          }
          if (!selected) {
            selected = list.find(t => t.name?.toLowerCase().includes("default")) || list[0];
          }
          return {
            ...r,
            transportFee: r.transport === "yes" ? tFee : 0,
            templateId: selected?.id || "",
            templateName: selected?.name || "",
          };
        }));
      } catch {
        setClassTransportFee(0);
        setTemplates([]);
      }
    };
    fetchTransportFee();
  }, [context.classId, schoolUser, branch]);

  function downloadTemplate() {
    const ws = XLSX.utils.json_to_sheet([
      {
        admissionId: "1001",
        name: "John Doe",
        fatherName: "Mr. Doe",
        motherName: "Mrs. Doe",
        gender: "Male",
        dob: "2015-05-15",
        phone: "9876543210",
        address: "New Delhi, India",
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

      const idSet = new Set();
      setRows(
        json.map((r, idx) => {
          const admId = r.admissionId?.toString().trim();
          const name = r.name?.toString().trim();
          const dob = excelDateToYMD(r.dob);

          let status = "valid";
          if (!admId || !name || !dob) status = "error";
          if (idSet.has(admId)) status = "duplicate";
          if (admId) idSet.add(admId);

          return {
            row: idx + 1,
            ...r,
            admissionId: admId,
            name: name,
            dob: dob,
            transport: "no",
            transportFee: 0,
            _status: status,
          };
        })
      );
    };
    reader.readAsArrayBuffer(file);
  }

  function toggleStudentTransport(rowNum, val) {
    setRows(prev =>
      prev.map(r => {
        if (r.row === rowNum) {
          let selected = null;
          if (val === "yes") {
            selected = templates.find(t =>
              t.name?.toLowerCase().includes("transport") ||
              t.items?.some(item => item.headName?.toLowerCase().includes("transport") || item.category === "transport")
            );
          }
          if (!selected) {
            selected = templates.find(t => t.name?.toLowerCase().includes("default")) || templates[0];
          }
          return {
            ...r,
            transport: val,
            transportFee: val === "yes" ? classTransportFee : 0,
            templateId: selected?.id || "",
            templateName: selected?.name || ""
          };
        }
        return r;
      })
    );
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
    const hasError = rows.some(r => r._status !== "valid");
    if (hasError) {
      toast.error("Please fix errors or duplicates in the table first");
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

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "admission.import.manage", currentPlan);

  return (
    <RequirePermission permission="admission.import.view">
      <div className="space-y-4 pb-20 text-sm">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start pb-2">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Import Students</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Bulk student onboarding via Excel spreadsheet
              </p>
            </div>
          </div>
          <button onClick={downloadTemplate} className="btn-outline flex items-center gap-2">
            <Download size={16} className="text-(--primary)" /> Download Template
          </button>
        </div>

        {editable && !fileName && (
          <label className="border-2 border-dashed border-(--border) hover:border-(--primary)/50 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all bg-(--bg-card) group relative overflow-hidden shadow-sm">
            <Upload size={40} className="text-(--primary) animate-bounce group-hover:text-(--primary) transition-colors mb-3" />
            <span className="text-sm font-semibold text-(--text) group-hover:text-(--primary) transition-colors">Upload Excel Spreadsheet</span>
            <span className="text-xs text-(--text-muted) mt-1">Drag & drop your student list (.xlsx or .xls), or click to browse</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              hidden
              onChange={handleFileUpload}
            />
          </label>
        )}

        {fileName && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl px-5 py-4 flex items-center justify-between shadow-none animate-in fade-in duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-(--text) truncate max-w-md">{fileName}</p>
                <p className="text-xs text-(--text-muted)">{rows.length} records parsed successfully</p>
              </div>
            </div>
            <button
              onClick={() => { setRows([]); setFileName(""); }}
              className="btn-outline px-3 py-2 text-xs border-red-500/20 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Clear & Reset
            </button>
          </div>
        )}

        {!fileName && (
          <div className="grid md:grid-cols-2 gap-5 animate-in fade-in duration-300">
            <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-(--border) pb-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                  <FileSpreadsheet size={18} />
                </div>
                <h3 className="font-semibold text-sm">Required Excel Format</h3>
              </div>
              <ul className="text-xs space-y-3 text-(--text-muted)">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <span><strong>admissionId</strong>: A unique identification number for each candidate</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <span><strong>name</strong>: Full name of the student</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-600 shrink-0" />
                  <span><strong>dob</strong>: Date of birth in YYYY-MM-DD or standard Excel date format</span>
                </li>
              </ul>
              <p className="text-[11px] text-(--text-muted) bg-(--bg-soft) p-3 rounded-lg border border-(--border)">
                * All additional metadata (Session, Class, Section) and student transport facilities will be configured directly in Step 2.
              </p>
            </div>

            <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-3 border-b border-(--border) pb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <CheckCircle size={18} />
                </div>
                <h3 className="font-semibold text-sm">System Operations</h3>
              </div>
              <ul className="text-xs space-y-3 text-(--text-muted)">
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <span>Registers active student logs in the current roster database</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <span>Assigns roll numbers automatically based on current roster count</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <span>Generates unique credential login accounts (ID & DOB password)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                  <span>Supports safe execution (reverts all imports if any row contains issues)</span>
                </li>
              </ul>
            </div>
          </div>
        )}

        {fileName && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-(--bg-card) border border-(--border) rounded-xl px-5 py-4 shadow-none space-y-3">
              <h3 className="font-bold text-sm text-(--primary) uppercase border-b border-(--border) pb-2">Step 2: Select Context</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-muted)">Session</label>
                  <select
                    className="input bg-(--bg-soft)"
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
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-muted)">Class</label>
                  <select
                    className="input bg-(--bg-soft)"
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
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-muted)">Section</label>
                  <select
                    className="input bg-(--bg-soft)"
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
              </div>
            </div>

            <div className="bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden shadow-none">
              <div className="px-5 py-4 border-b border-(--border) bg-(--bg-card) flex items-center justify-between">
                <h3 className="font-bold text-(--primary) uppercase text-sm">Preview & Adjust Transport</h3>
                <span className="text-xs font-semibold text-(--text-muted)">Set transport status individually per student</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-(--bg) border-b border-(--border)">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted)">Row</th>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted)">Admission ID</th>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted)">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted)">Gender</th>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted)">DOB</th>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted)">Phone</th>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted) w-32">Transport</th>
                      <th className="px-4 py-3 text-left font-semibold text-(--text-muted)">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {rows.map((r, i) => (
                      <tr key={i} className={r._status !== 'valid' ? 'bg-red-500/5' : ''}>
                        <td className="px-4 py-3 font-bold text-(--text-muted)">{r.row}</td>
                        <td className="px-4 py-3 font-semibold text-(--primary)">{r.admissionId || ''}</td>
                        <td className="px-4 py-3 font-semibold">{r.name || ''}</td>
                        <td className="px-4 py-3 uppercase font-semibold text-[10px]">{r.gender || ''}</td>
                        <td className="px-4 py-3">{r.dob || ''}</td>
                        <td className="px-4 py-3">{r.phone || ''}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleStudentTransport(r.row, r.transport === "yes" ? "no" : "yes")}
                              className={`relative w-9 h-5 rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${r.transport === "yes" ? "bg-(--primary)" : "bg-gray-200 dark:bg-gray-700"
                                }`}
                            >
                              <div
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ease-in-out ${r.transport === "yes" ? "left-[18px]" : "left-0.5"
                                  }`}
                              />
                            </button>
                            <span className={`font-semibold text-[11px] uppercase ${r.transport === "yes" ? "text-(--primary)" : "text-(--text-muted)"}`}>
                              {r.transport === "yes" ? "Yes" : "No"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {r._status === "valid" ? (
                            <span className="text-green-600 flex items-center gap-1 font-bold text-[10px] uppercase">
                              <CheckCircle size={14} /> Valid
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1 font-bold text-[10px] uppercase">
                              <AlertCircle size={14} /> {r._status === 'duplicate' ? 'Duplicate' : 'Error'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-(--bg) border-t border-(--border)">
                <button onClick={importStudents} className="btn-primary w-full py-3 shadow-lg shadow-orange-500/10 font-semibold">
                  Import {rows.length} Students
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
