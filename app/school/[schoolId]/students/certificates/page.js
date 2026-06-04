"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Award,
  Search,
  Printer,
  ArrowLeft,
  ChevronRight,
  RefreshCw,
  Users,
  Check,
  Square,
  ArrowRight,
  Palette,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
import { canManage } from "@/lib/school/permissionUtils";

export default function CertificatesPage() {
  const { classData, schoolUser, setLoading, loading, currentSession, sessionList } = useSchool();
  const { branchInfo, branch } = useBranch();

  const [step, setStep] = useState(1);
  const [session, setSession] = useState(currentSession || "");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [certType, setCertType] = useState("transfer");
  const [templateStyle, setTemplateStyle] = useState("classic");
  const [themeColor, setThemeColor] = useState("#1e3a8a");
  const [fontFamily, setFontFamily] = useState("serif");

  const [formValues, setFormValues] = useState({
    studentName: "",
    dob: "",
    rollNo: "",
    serialNo: "TC-2026-0001",
    admissionNo: "",
    admissionDate: "2024-04-01",
    leavingDate: "2026-05-31",
    admissionClass: "Class 9",
    leavingClass: "Class 10",
    boardResult: "Passed Class 10 Board Exam",
    failedOnce: "No",
    subjects: "English, Mathematics, Science, Social Science, Hindi",
    promotedStatus: "Yes, promoted to Class 11",
    duesPaidUpto: "May 2026",
    feeConcession: "No",
    workingDays: "220",
    presentDays: "198",
    nccCadet: "No",
    gamesPlayed: "N/A",
    generalConduct: "Exemplary",
    leavingReason: "Completed High School Course",
    remarks: "Diligent and well-behaved student.",
    applicationDate: "2026-06-01",
    issueDate: "2026-06-04",
    motherName: "Mrs. Sarah Jenkins",
    fatherName: "Mr. Arthur Jenkins",
    signatory: "Principal",
    schoolName: "",
    schoolAddress: "",
    schoolPhone: "",
    affiliationNo: "CBSE/AFF/390214",
    schoolCode: "81024",
  });

  const selectedClass = classData?.find((c) => c.id === className);
  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "student.certificates.manage", currentPlan);
  const isBulk = selectedIds.size > 1;

  async function loadStudents() {
    if (!session || !className || !section) {
      toast.error("Select session, class & section");
      return;
    }
    setLoading(true);
    try {
      const rosterId = `${className}_${section}_${session}`;
      const snap = await getDoc(
        doc(db, "schools", schoolUser.schoolId, "branches", branch, "meta", rosterId)
      );

      if (!snap.exists()) {
        setStudents([]);
        toast.info("No roster found for this section");
        return;
      }

      const results = (snap.data().students || []).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setStudents(results);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.appId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [students, searchTerm]);

  const toggleSelect = (uid) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) {
        next.delete(uid);
      } else {
        next.add(uid);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.uid)));
    }
  };

  const getStudentByUid = (uid) => {
    return students.find((s) => s.uid === uid);
  };

  const selectStudentValues = (student) => {
    if (!student) return;
    const dateFormatted = new Date().toISOString().slice(0, 10);
    const classVal = classData?.find((c) => c.id === className)?.name || "";
    const secVal = selectedClass?.sections.find((s) => s.id === section)?.name || "";

    setFormValues((prev) => ({
      ...prev,
      studentName: student.name || "",
      dob: student.dob || "",
      rollNo: student.rollNo || "",
      admissionNo: student.appId || "",
      serialNo: `${certType === "transfer" ? "TC" : "CC"}-2026-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`,
      fatherName: student.fatherName || "",
      motherName: student.motherName || prev.motherName,
      leavingClass: `${classVal} - ${secVal}`,
      schoolName: schoolUser?.schoolName || prev.schoolName,
      schoolAddress:
        branchInfo?.address && branchInfo?.city
          ? `${branchInfo.address}, ${branchInfo.city}`
          : prev.schoolAddress,
      schoolPhone: branchInfo?.phone || prev.schoolPhone,
      issueDate: dateFormatted,
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const updateFormValue = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleCertTypeChange = (type) => {
    setCertType(type);
    setFormValues((prev) => ({
      ...prev,
      serialNo: `${type === "transfer" ? "TC" : "CC"}-2026-${String(
        Math.floor(Math.random() * 9000) + 1000
      )}`,
    }));
  };

  const firstSelectedStudent = useMemo(() => {
    const arr = Array.from(selectedIds);
    if (arr.length === 0) return null;
    return getStudentByUid(arr[0]);
  }, [selectedIds, students]);

  return (
    <RequirePermission permission="student.certificates.view">
      <div className="space-y-6 pb-20 text-sm">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media print {
                body {
                  background: white !important;
                  color: black !important;
                }
                body * {
                  visibility: hidden;
                }
                #certificate-print-sheet, #certificate-print-sheet * {
                  visibility: visible;
                }
                #certificate-print-sheet {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 210mm !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                }
                .certificate-page-break {
                  page-break-after: always;
                  break-after: page;
                  width: 210mm;
                  height: 297mm;
                  box-sizing: border-box;
                  padding: 15mm !important;
                  background: white !important;
                }
                .certificate-page-break:last-child {
                  page-break-after: avoid;
                  break-after: avoid;
                }
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
              }
            `,
          }}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <Award size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Certificate Portal</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Generate and print Transfer and Character Certificates
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all ${step === 1
              ? "bg-(--primary-soft) border-(--primary) text-(--primary) shadow-sm"
              : "bg-transparent border-transparent text-(--text-muted) hover:text-(--text)"
              }`}
          >
            <Users size={16} /> 1. Select Student
          </button>
          <ChevronRight size={14} className="text-(--text-muted)" />
          <button
            onClick={() => {
              if (selectedIds.size === 0) {
                toast.warning("Select at least one student");
                return;
              }
              setStep(2);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border transition-all ${step === 2
              ? "bg-(--primary-soft) border-(--primary) text-(--primary) shadow-sm"
              : "bg-transparent border-transparent text-(--text-muted) hover:text-(--text)"
              }`}
          >
            <Palette size={16} /> 2. Customize & Print
          </button>
        </div>

        {step === 1 ? (
          <div className="space-y-6 no-print">
            <div className="">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">
                    Session
                  </label>
                  <select
                    className="input w-full bg-(--bg-card)"
                    value={session}
                    onChange={(e) => setSession(e.target.value)}
                  >
                    <option value="">Select</option>
                    {sessionList?.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">
                    Class
                  </label>
                  <select
                    className="input w-full bg-(--bg-card)"
                    value={className}
                    onChange={(e) => {
                      setClassName(e.target.value);
                      setSection("");
                    }}
                  >
                    <option value="">Select Class</option>
                    {classData?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">
                    Section
                  </label>
                  <select
                    className="input w-full bg-(--bg-card)"
                    value={section}
                    disabled={!selectedClass}
                    onChange={(e) => setSection(e.target.value)}
                  >
                    <option value="">Select Section</option>
                    {selectedClass?.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <label className="text-[10px] uppercase font-semibold text-(--text-muted) tracking-wider ml-1">
                    Search Name or ID
                  </label>
                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)"
                    />
                    <input
                      placeholder="Name, App ID..."
                      className="input pl-10 w-full bg-(--bg-card)"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      disabled={students.length === 0}
                    />
                  </div>
                </div>
                <button
                  onClick={loadStudents}
                  disabled={loading || !session || !className || !section}
                  className="btn-primary h-[42px] flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                  Load Roster
                </button>
              </div>
            </div>

            <div className="bg-(--bg-card) border border-(--border) rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-(--bg) border-b border-(--border)">
                      <th className="px-5 py-3 w-16 text-center">
                        <button
                          onClick={selectAll}
                          disabled={filteredStudents.length === 0}
                          className="w-5 h-5 rounded border border-(--border) flex items-center justify-center bg-(--bg) mx-auto"
                        >
                          {selectedIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                            <Check size={14} className="text-(--primary)" />
                          ) : (
                            <Square size={14} className="text-(--text-muted)" />
                          )}
                        </button>
                      </th>
                      <th className="px-5 py-3 font-semibold text-(--text-muted)">Student ID</th>
                      <th className="px-5 py-3 font-semibold text-(--text-muted)">Roll No</th>
                      <th className="px-5 py-3 font-semibold text-(--text-muted)">Name</th>
                      <th className="px-5 py-3 font-semibold text-(--text-muted)">Father Name</th>
                      <th className="px-5 py-3 font-semibold text-(--text-muted) text-right">
                        DOB
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td colSpan="6" className="px-5 py-6">
                            <div className="h-4 bg-(--bg) rounded-full w-3/4 mx-auto"></div>
                          </td>
                        </tr>
                      ))
                    ) : filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-5 py-10 text-center">
                          <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-(--bg) flex items-center justify-center text-(--text-muted)">
                              <Users size={32} />
                            </div>
                            <h3 className="text-base mt-4 font-semibold text-(--text)">
                              No students loaded
                            </h3>
                            <p className="text-xs text-(--text-muted)">
                              Select filters above to find students
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((student) => {
                        const isSelected = selectedIds.has(student.uid);
                        return (
                          <tr
                            key={student.uid}
                            onClick={() => toggleSelect(student.uid)}
                            className={`group cursor-pointer transition-colors ${isSelected ? "bg-(--primary-soft)/20" : "hover:bg-(--bg-soft)/30"
                              }`}
                          >
                            <td className="px-5 py-3 text-center">
                              <div
                                className={`mx-auto w-5 h-5 rounded border-2 flex items-center justify-center bg-(--bg) ${isSelected ? "border-(--primary)" : "border-(--text-muted)"
                                  }`}
                              >
                                {isSelected ? (
                                  <Check size={14} className="text-(--primary)" />
                                ) : null}
                              </div>
                            </td>
                            <td className="px-5 py-3 uppercase font-semibold">{student.appId}</td>
                            <td className="px-5 py-3 font-semibold text-xs text-(--text-muted)">
                              {student.rollNo
                                ? student.rollNo.toString().padStart(2, "0")
                                : "--"}
                            </td>
                            <td className="px-5 py-3 font-semibold text-(--text) capitalize">
                              {student.name}
                            </td>
                            <td className="px-5 py-3 text-(--text-muted)">
                              {student.fatherName || "--"}
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-[11px] text-(--text-muted)">
                              {student.dob || "--"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 animate-in slide-in-from-bottom-8 duration-300">
                <div className="bg-(--bg) border border-(--border) rounded-2xl p-4 shadow-2xl flex items-center justify-between ring-4 ring-black/5 dark:ring-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-(--primary) text-white flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <span className="font-semibold text-lg">{selectedIds.size}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--text)">
                        Students Selected
                      </p>
                      <p className="text-[10px] font-semibold text-(--text-muted) uppercase tracking-wider">
                        Ready for certificate configuration
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      selectStudentValues(firstSelectedStudent);
                      setStep(2);
                    }}
                    className="btn-primary px-8 h-[44px] flex items-center gap-2 shadow-xl shadow-orange-500/10"
                  >
                    Configure Certificates <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
            <div className="lg:col-span-5 space-y-5 overflow-y-auto pr-1">
              <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                    <Palette size={14} className="text-(--primary)" /> Template configuration
                  </h3>
                  <button
                    onClick={() => setStep(1)}
                    className="text-[10px] font-semibold text-(--primary) hover:underline flex items-center gap-1"
                  >
                    <ArrowLeft size={10} /> Back to Selection
                  </button>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-(--text-muted) ml-1">
                    Certificate Type
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleCertTypeChange("transfer")}
                      className={`py-2 rounded-lg border-2 text-xs font-semibold transition-all ${certType === "transfer"
                        ? "border-(--primary) bg-(--primary-soft) text-(--primary)"
                        : "border-(--border) text-(--text-muted)"
                        }`}
                    >
                      Transfer Certificate
                    </button>
                    <button
                      onClick={() => handleCertTypeChange("character")}
                      className={`py-2 rounded-lg border-2 text-xs font-semibold transition-all ${certType === "character"
                        ? "border-(--primary) bg-(--primary-soft) text-(--primary)"
                        : "border-(--border) text-(--text-muted)"
                        }`}
                    >
                      Character Certificate
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-(--text-muted) ml-1">
                      Theme Layout
                    </label>
                    <select
                      className="input w-full bg-(--bg-card)"
                      value={templateStyle}
                      onChange={(e) => setTemplateStyle(e.target.value)}
                    >
                      <option value="classic">Classic Heritage</option>
                      <option value="modern">Modern Border</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase text-(--text-muted) ml-1">
                      Typography
                    </label>
                    <select
                      className="input w-full bg-(--bg-card)"
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                    >
                      <option value="serif">Formal Serif</option>
                      <option value="sans">Clean Sans-Serif</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase text-(--text-muted) ml-1">
                    Accent Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["#1e3a8a", "#7f1d1d", "#064e3b", "#701a75", "#0f172a"].map((c) => (
                      <button
                        key={c}
                        onClick={() => setThemeColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-7 h-7 rounded-full border-2 ${themeColor === c ? "ring-2 ring-(--primary) border-white" : "border-transparent"
                          }`}
                      />
                    ))}
                    <input
                      type="color"
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-7 h-7 rounded-full border-none p-0 cursor-pointer overflow-hidden"
                    />
                  </div>
                </div>
              </section>

              <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                  School Information
                </h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                      School name
                    </label>
                    <input
                      type="text"
                      className="input w-full bg-(--bg-soft)"
                      value={formValues.schoolName}
                      onChange={(e) => updateFormValue("schoolName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                      Address
                    </label>
                    <input
                      type="text"
                      className="input w-full bg-(--bg-soft)"
                      value={formValues.schoolAddress}
                      onChange={(e) => updateFormValue("schoolAddress", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                        Affiliation No.
                      </label>
                      <input
                        type="text"
                        className="input w-full bg-(--bg-soft)"
                        value={formValues.affiliationNo}
                        onChange={(e) => updateFormValue("affiliationNo", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                        School Code
                      </label>
                      <input
                        type="text"
                        className="input w-full bg-(--bg-soft)"
                        value={formValues.schoolCode}
                        onChange={(e) => updateFormValue("schoolCode", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 space-y-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
                  Certificate Details
                </h3>
                <div className="space-y-3">
                  {!isBulk ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Student Name
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.studentName}
                            onChange={(e) => updateFormValue("studentName", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Date of Birth
                          </label>
                          <input
                            type="text"
                            placeholder="DD-MM-YYYY"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.dob}
                            onChange={(e) => updateFormValue("dob", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Father's Name
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.fatherName}
                            onChange={(e) => updateFormValue("fatherName", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Mother's Name
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.motherName}
                            onChange={(e) => updateFormValue("motherName", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Admission / Reg ID
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.admissionNo}
                            onChange={(e) => updateFormValue("admissionNo", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Base Serial No
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.serialNo}
                            onChange={(e) => updateFormValue("serialNo", e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-(--primary-soft) border border-(--primary)/20 rounded-xl space-y-3">
                      <p className="text-[11px] text-(--primary) font-medium leading-relaxed">
                        Individual student details (Name, DOB, ID, Parents) are loaded dynamically from each student's profile for bulk printing.
                      </p>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                          Base Serial No
                        </label>
                        <input
                          type="text"
                          className="input w-full bg-(--bg-card)"
                          value={formValues.serialNo}
                          onChange={(e) => updateFormValue("serialNo", e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  {certType === "transfer" ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Date of Admission
                          </label>
                          <input
                            type="date"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.admissionDate}
                            onChange={(e) => updateFormValue("admissionDate", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Date of Leaving
                          </label>
                          <input
                            type="date"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.leavingDate}
                            onChange={(e) => updateFormValue("leavingDate", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Admitted Class
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.admissionClass}
                            onChange={(e) => updateFormValue("admissionClass", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Last Class Studied
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.leavingClass}
                            onChange={(e) => updateFormValue("leavingClass", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                          Subjects Studied
                        </label>
                        <input
                          type="text"
                          className="input w-full bg-(--bg-soft)"
                          value={formValues.subjects}
                          onChange={(e) => updateFormValue("subjects", e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Promotion Status
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.promotedStatus}
                            onChange={(e) => updateFormValue("promotedStatus", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            School Dues Paid Upto
                          </label>
                          <input
                            type="text"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.duesPaidUpto}
                            onChange={(e) => updateFormValue("duesPaidUpto", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Working Days
                          </label>
                          <input
                            type="number"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.workingDays}
                            onChange={(e) => updateFormValue("workingDays", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Days Present
                          </label>
                          <input
                            type="number"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.presentDays}
                            onChange={(e) => updateFormValue("presentDays", e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                          Reason for Leaving
                        </label>
                        <input
                          type="text"
                          className="input w-full bg-(--bg-soft)"
                          value={formValues.leavingReason}
                          onChange={(e) => updateFormValue("leavingReason", e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Date of Joining
                          </label>
                          <input
                            type="date"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.admissionDate}
                            onChange={(e) => updateFormValue("admissionDate", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                            Date of Leaving
                          </label>
                          <input
                            type="date"
                            className="input w-full bg-(--bg-soft)"
                            value={formValues.leavingDate}
                            onChange={(e) => updateFormValue("leavingDate", e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                        General Conduct
                      </label>
                      <input
                        type="text"
                        className="input w-full bg-(--bg-soft)"
                        value={formValues.generalConduct}
                        onChange={(e) => updateFormValue("generalConduct", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                        Issue Date
                      </label>
                      <input
                        type="date"
                        className="input w-full bg-(--bg-soft)"
                        value={formValues.issueDate}
                        onChange={(e) => updateFormValue("issueDate", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                        Signatory Designation
                      </label>
                      <input
                        type="text"
                        className="input w-full bg-(--bg-soft)"
                        value={formValues.signatory}
                        onChange={(e) => updateFormValue("signatory", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-(--text-muted) uppercase">
                        Remarks / Other
                      </label>
                      <input
                        type="text"
                        className="input w-full bg-(--bg-soft)"
                        value={formValues.remarks}
                        onChange={(e) => updateFormValue("remarks", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <button
                onClick={handlePrint}
                className="btn-primary w-full h-[50px] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3"
              >
                <Printer size={20} /> <span className="text-base">Print {selectedIds.size} Certificates</span>
              </button>
            </div>

            <div className="lg:col-span-7 flex flex-col items-center w-full min-w-0">
              <div className="text-xs text-gray-500 font-semibold mb-2 flex items-center gap-2">
                <span>Previewing first selected student: <strong className="text-gray-900">{firstSelectedStudent?.name}</strong> (Total: {selectedIds.size})</span>
              </div>
              <div className="bg-gray-200 dark:bg-zinc-800 p-8 rounded-3xl w-full flex justify-center overflow-hidden">
                <div
                  id="certificate-preview-container"
                  style={{
                    width: "210mm",
                    height: "297mm",
                    transform: "scale(0.7)",
                    transformOrigin: "top center",
                    marginBottom: "-90mm",
                  }}
                  className="bg-white text-black p-12 shadow-2xl relative flex flex-col justify-between select-none"
                >
                  <CertificateContent
                    student={firstSelectedStudent}
                    certType={certType}
                    templateStyle={templateStyle}
                    themeColor={themeColor}
                    fontFamily={fontFamily}
                    formValues={formValues}
                    branchInfo={branchInfo}
                    serialNo={
                      selectedIds.size > 1 && firstSelectedStudent
                        ? `${formValues.serialNo}-${firstSelectedStudent.appId}`
                        : formValues.serialNo
                    }
                    isBulk={isBulk}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div id="certificate-print-sheet" className="hidden">
          {Array.from(selectedIds).map((uid) => {
            const currentStudent = getStudentByUid(uid);
            if (!currentStudent) return null;
            const computedSerial = selectedIds.size > 1
              ? `${formValues.serialNo}-${currentStudent.appId}`
              : formValues.serialNo;
            return (
              <div key={uid} className="certificate-page-break">
                <CertificateContent
                  student={currentStudent}
                  certType={certType}
                  templateStyle={templateStyle}
                  themeColor={themeColor}
                  fontFamily={fontFamily}
                  formValues={formValues}
                  branchInfo={branchInfo}
                  serialNo={computedSerial}
                  isBulk={isBulk}
                />
              </div>
            );
          })}
        </div>
      </div>
    </RequirePermission>
  );
}

function CertificateContent({
  student,
  certType,
  templateStyle,
  themeColor,
  fontFamily,
  formValues,
  branchInfo,
  serialNo,
  isBulk,
}) {
  const isSerif = fontFamily === "serif";
  const fontClass = isSerif ? "font-serif" : "font-sans";
  const currentSerialNo = serialNo || formValues.serialNo;

  const studentNameVal = isBulk ? student?.name : (formValues.studentName || student?.name);
  const fatherNameVal = isBulk ? (student?.fatherName || formValues.fatherName) : (formValues.fatherName || student?.fatherName);
  const motherNameVal = isBulk ? (student?.motherName || formValues.motherName) : (formValues.motherName || student?.motherName);
  const dobVal = isBulk ? (student?.dob || "--") : (formValues.dob || student?.dob || "--");
  const admissionNoVal = isBulk ? (student?.appId || formValues.admissionNo) : (formValues.admissionNo || student?.appId);

  return (
    <div
      className={`h-full w-full relative flex flex-col justify-between bg-white text-gray-900 ${fontClass}`}
      style={{
        border:
          templateStyle === "classic"
            ? `8px double ${themeColor}`
            : `4px solid ${themeColor}`,
        padding: "24px",
      }}
    >
      {templateStyle === "modern" && (
        <>
          <div
            className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4"
            style={{ borderColor: themeColor }}
          />
          <div
            className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4"
            style={{ borderColor: themeColor }}
          />
          <div
            className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4"
            style={{ borderColor: themeColor }}
          />
          <div
            className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4"
            style={{ borderColor: themeColor }}
          />
        </>
      )}

      <div
        className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none"
        style={{ color: themeColor }}
      >
        <Award size={260} strokeWidth={1} />
      </div>

      <div className="space-y-6 z-10">
        <div className="flex justify-between items-start border-b pb-4" style={{ borderColor: `${themeColor}33` }}>
          <div className="text-left">
            <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
              Affiliation No: {formValues.affiliationNo}
            </p>
          </div>
          <div className="text-center flex-1 px-4">
            <h2
              className="text-xl font-bold uppercase tracking-tight"
              style={{ color: themeColor }}
            >
              {formValues.schoolName || "Appitor International School"}
            </h2>
            <p className="text-xs text-gray-600 mt-1 font-semibold">
              {formValues.schoolAddress || "Green Valley Campus, Sector 4"}
            </p>
            {formValues.schoolPhone && (
              <p className="text-[10px] text-gray-500 font-medium">Ph: {formValues.schoolPhone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase">
              School Code: {formValues.schoolCode}
            </p>
          </div>
        </div>

        <div className="text-center space-y-2">
          <h1
            className="text-lg font-extrabold tracking-widest uppercase py-1 px-4 inline-block border-y"
            style={{ borderColor: themeColor, color: themeColor }}
          >
            {certType === "transfer" ? "Transfer Certificate" : "Character Certificate"}
          </h1>
          <div className="flex justify-between text-xs font-semibold px-4 pt-2">
            <span>Certificate No: <span className="font-mono">{currentSerialNo}</span></span>
            <span>Admission ID: <span className="font-mono">{admissionNoVal}</span></span>
          </div>
        </div>

        {certType === "transfer" ? (
          <div className="space-y-3.5 text-xs px-2 leading-relaxed">
            <div className="grid grid-cols-12 gap-y-3">
              <RowField label="1. Name of the Pupil" value={studentNameVal} />
              <RowField label="2. Father's / Guardian's Name" value={fatherNameVal} />
              <RowField label="3. Mother's Name" value={motherNameVal} />
              <RowField label="4. Nationality" value="Indian" />
              <RowField label="5. Whether Student belongs to SC/ST/OBC" value="General" />
              <RowField label="6. Date of First Admission in School" value={`${formValues.admissionDate} (in ${formValues.admissionClass})`} />
              <RowField label="7. Date of Birth (according to Admission Register)" value={dobVal} />
              <RowField label="8. Class in which pupil last studied" value={formValues.leavingClass} />
              <RowField label="9. School / Board Annual Examination last taken" value={formValues.boardResult} />
              <RowField label="10. Whether failed, if so once/twice in same class" value={formValues.failedOnce} />
              <RowField label="11. Subjects Studied" value={formValues.subjects} />
              <RowField label="12. Whether qualified for promotion to higher class" value={formValues.promotedStatus} />
              <RowField label="13. Month up to which school dues paid" value={formValues.duesPaidUpto} />
              <RowField label="14. Any fee concession availed of, if so nature" value={formValues.feeConcession} />
              <RowField label="15. Total No. of school working days" value={formValues.workingDays} />
              <RowField label="16. Total No. of school days student present" value={formValues.presentDays} />
              <RowField label="17. General Conduct of pupil" value={formValues.generalConduct} />
              <RowField label="18. Reason for leaving school" value={formValues.leavingReason} />
              <RowField label="19. Any other remarks" value={formValues.remarks} />
            </div>
          </div>
        ) : (
          <div className="space-y-8 text-sm px-6 py-8 leading-loose text-justify">
            <p>
              This is to certify that{" "}
              <strong className="underline text-base uppercase px-1">
                {studentNameVal || "____________________"}
              </strong>{" "}
              Son / Daughter of{" "}
              <strong className="underline text-base uppercase px-1">
                {fatherNameVal || "____________________"}
              </strong>{" "}
              and{" "}
              <strong className="underline text-base uppercase px-1">
                {motherNameVal || "____________________"}
              </strong>{" "}
              was a regular student of this institution.
            </p>
            <p>
              He / She entered the institution on{" "}
              <strong className="underline px-1">{formValues.admissionDate}</strong> and left the
              institution on <strong className="underline px-1">{formValues.leavingDate}</strong> having
              completed the course of study for the class{" "}
              <strong className="underline px-1">{formValues.leavingClass}</strong>.
            </p>
            <p>
              During his/her stay in the school, his/her character and conduct have been observed to
              be <strong className="underline uppercase px-1">{formValues.generalConduct}</strong>.
            </p>
            <p>
              To the best of our knowledge, he/she bears a good moral character. We wish him/her
              every success in all future academic and personal endeavors.
            </p>
            {formValues.remarks && (
              <p>
                <strong>Remarks:</strong> {formValues.remarks}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="z-10 pt-10">
        <div className="flex justify-between items-end text-xs font-semibold px-4">
          <div className="text-center w-36">
            <p className="border-t pt-1 border-gray-400">Class Teacher</p>
          </div>
          <div className="text-center w-36">
            <p className="border-t pt-1 border-gray-400">Checked By</p>
          </div>
          <div className="text-center w-36">
            <div className="h-12 flex items-center justify-center">
              <span className="text-[10px] text-gray-400 italic font-normal uppercase">
                [Stamp Seal]
              </span>
            </div>
            <p className="border-t pt-1 border-gray-400 mt-2 uppercase">{formValues.signatory}</p>
          </div>
        </div>
        <div className="flex justify-between text-[10px] text-gray-500 font-semibold px-4 mt-6">
          <span>Date of Issue: {formValues.issueDate}</span>
          <span>Place: {branchInfo?.city || "School Campus"}</span>
        </div>
      </div>
    </div>
  );
}

function RowField({ label, value }) {
  return (
    <div className="col-span-12 flex items-end gap-2 pr-4 w-full">
      <span className="text-gray-600 font-semibold shrink-0">{label}:</span>
      <span className="border-b border-dashed border-gray-400 flex-1 pb-0.5 font-bold text-gray-900 px-1 truncate">
        {value || "N/A"}
      </span>
    </div>
  );
}
