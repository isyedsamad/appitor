"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Users,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Info,
  TrendingUp,
  Loader2,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Layers,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

export default function SessionUpgradeWizard() {
  const { schoolUser, classData, sessionList, currentSession, setLoading, loading } = useSchool();
  const { branch, branchInfo } = useBranch();

  const [step, setStep] = useState(1);
  const [targetSession, setTargetSession] = useState("");
  const [previewData, setPreviewData] = useState(null);
  const [sectionOverrides, setSectionOverrides] = useState({});
  const [otpVal, setOtpVal] = useState(Array(7).fill(""));
  const [isExecuting, setIsExecuting] = useState(false);

  const confirmText = useMemo(() => otpVal.join("").toUpperCase(), [otpVal]);

  const handleOtpChange = (index, value) => {
    if (!/^[a-zA-Z]?$/.test(value)) return;
    const newOtp = [...otpVal];
    newOtp[index] = value.toUpperCase();
    setOtpVal(newOtp);

    if (value && index < 6) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otpVal[index] && index > 0) {
        const prevInput = document.getElementById(`otp-input-${index - 1}`);
        if (prevInput) {
          prevInput.focus();
          const newOtp = [...otpVal];
          newOtp[index - 1] = "";
          setOtpVal(newOtp);
        }
      } else {
        const newOtp = [...otpVal];
        newOtp[index] = "";
        setOtpVal(newOtp);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").trim().substring(0, 7).toUpperCase();
    if (/^[A-Z]{1,7}$/.test(pastedText)) {
      const newOtp = Array(7).fill("");
      for (let i = 0; i < pastedText.length; i++) {
        newOtp[i] = pastedText[i];
      }
      setOtpVal(newOtp);
      const targetIndex = Math.min(pastedText.length, 6);
      const targetInput = document.getElementById(`otp-input-${targetIndex}`);
      if (targetInput) targetInput.focus();
    }
  };

  const availableTargetSessions = useMemo(() => {
    return (sessionList || []).filter(s => s.id !== currentSession);
  }, [sessionList, currentSession]);

  const loadPreview = async () => {
    if (!targetSession) {
      toast.warning("Please select a target session first.");
      return;
    }
    setLoading(true);
    try {
      const res = await secureAxios.get("/api/school/students/promote-session/preview", {
        params: { toSession: targetSession }
      });
      setPreviewData(res.data);

      const defaults = {};
      res.data.mappings.forEach(clsMap => {
        clsMap.sections.forEach(secMap => {
          defaults[`${clsMap.fromClassId}_${secMap.fromSectionId}`] = secMap.toSectionId;
        });
      });
      setSectionOverrides(defaults);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load promotion preview.");
    } finally {
      setLoading(false);
    }
  };

  const executeSessionUpgrade = async () => {
    if (confirmText !== "UPGRADE") {
      toast.error("Please type UPGRADE to confirm.");
      return;
    }

    setIsExecuting(true);
    setLoading(true);

    try {
      const sectionMappings = [];
      previewData.mappings.forEach(clsMap => {
        clsMap.sections.forEach(secMap => {
          const key = `${clsMap.fromClassId}_${secMap.fromSectionId}`;
          const finalTgtSecId = sectionOverrides[key];
          sectionMappings.push({
            fromClassId: clsMap.fromClassId,
            fromSectionId: secMap.fromSectionId,
            toClassId: clsMap.toClassId,
            toSectionId: finalTgtSecId || "",
            toSectionName: (!finalTgtSecId && clsMap.toClassId !== "passed_out") ? secMap.fromSectionName : undefined
          });
        });
      });

      const res = await secureAxios.post("/api/school/students/promote-session", {
        fromSession: currentSession,
        toSession: targetSession,
        sectionMappings
      });

      if (res.data.success) {
        toast.success(`Academic Session successfully upgraded to ${targetSession}! Promoted ${res.data.processedCount} students.`);
        setStep(4);
      } else {
        toast.warning("Upgrade completed with some warnings.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Rollover failed.");
    } finally {
      setIsExecuting(false);
      setLoading(false);
    }
  };

  const getClassName = id => classData?.find(c => c.id === id)?.name || id;

  const unmappedCount = useMemo(() => {
    if (!previewData) return 0;
    let count = 0;
    previewData.mappings.forEach(clsMap => {
      clsMap.sections.forEach(secMap => {
        const key = `${clsMap.fromClassId}_${secMap.fromSectionId}`;
        const isOrphaned = secMap.status === "orphaned_source";
        if (clsMap.toClassId !== "passed_out" && !sectionOverrides[key] && !isOrphaned) {
          count++;
        }
      });
    });
    return count;
  }, [previewData, sectionOverrides]);

  return (
    <RequirePermission permission="student.promote.manage">
      <div className="space-y-5 pb-20 text-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <TrendingUp size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">Academic Session Upgrade</h1>
              <p className="text-xs text-(--text-muted) font-medium">
                Bulk promote all students across sessions in a guided sequence
              </p>
            </div>
          </div>
          {step > 1 && step < 4 && (
            <button
              onClick={() => {
                setStep(step - 1);
                setConfirmText("");
              }}
              className="btn-outline flex items-center gap-1.5"
            >
              Back
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2 bg-(--bg-card) border border-(--border) p-1 rounded-lg">
          {[
            { num: 1, label: "Select Target" },
            { num: 2, label: "Roster Map" },
            { num: 3, label: "Safety Review" },
            { num: 4, label: "Success" }
          ].map(s => (
            <div
              key={s.num}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all duration-300 ${step === s.num
                ? "bg-(--primary-soft) text-(--primary) font-bold"
                : step > s.num
                  ? "text-emerald-500 font-semibold"
                  : "text-(--text-muted) opacity-60 font-normal"
                }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s.num
                  ? "bg-(--primary) text-white"
                  : step > s.num
                    ? "bg-emerald-500 text-white"
                    : "bg-(--bg) border border-(--border)"
                  }`}
              >
                {step > s.num ? <Check size={14} /> : s.num}
              </div>
              <span className="hidden sm:inline text-xs">{s.label}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="grid md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-8 bg-(--bg-card) border border-(--border) px-5 py-4 rounded-lg">
              <h3 className="text-base font-bold text-(--primary) uppercase">Initiate Session Rollover</h3>
              <p className="text-xs text-(--text-muted) leading-relaxed">
                This tool handles the promotions of all classes simultaneously.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 pt-4">
                <div className="py-3 px-4 rounded-lg border border-(--border) bg-(--bg)/40 space-y-2">
                  <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider block">Active Current Session</span>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-(--primary-soft) text-(--primary) flex items-center justify-center font-bold text-sm">
                      {currentSession?.charAt(0)}
                    </div>
                    <span className="text-lg font-bold text-(--text)">{currentSession}</span>
                  </div>
                </div>

                <div className="py-3 px-4 rounded-lg border border-(--primary)/20 bg-(--primary-soft)/10 space-y-1">
                  <span className="text-[10px] font-bold text-(--primary) uppercase tracking-wider block">Target Upgrade Session</span>
                  <select
                    className="input w-full bg-(--bg-card) font-bold text-md border-(--primary)/30"
                    value={targetSession}
                    onChange={e => setTargetSession(e.target.value)}
                  >
                    <option value="">Choose Target Session</option>
                    {availableTargetSessions.map(s => (
                      <option key={s.id} value={s.id}>{s.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-(--border)/50 flex justify-end">
                <button
                  onClick={loadPreview}
                  disabled={!targetSession || loading}
                  className="btn-primary px-8 flex items-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Configure Mappings
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="md:col-span-4 bg-(--bg-card) border border-(--border) p-5 rounded-lg space-y-4">
              <div className="flex gap-2 text-yellow-500">
                <ShieldAlert size={20} className="shrink-0" />
                <h4 className="font-bold text-sm text-(--text)">Important Safety Check</h4>
              </div>
              <ul className="text-xs space-y-3 text-(--text-muted) list-disc pl-4 leading-relaxed">
                <li>Students who have already graduated (highest grade) will be moved to the <strong>Alumni / Passed Out</strong> database table.</li>
                <li>Verify that all academic sessions are configured before initiating a rollover.</li>
                <li>Active classes and sections must be created in academics before running the session promotion.</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && previewData && (
          <div className="space-y-6">
            <div className="bg-(--bg-card) border border-(--border) px-5 py-2 rounded-lg flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-(--primary) uppercase text-base">Class Section Roster Mapping</h3>
                <p className="text-xs text-(--text-muted) font-medium mt-0.5">
                  Green sections are mapped automatically. Yellow entries require manual target setup.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="text-center px-4 py-2 border-r border-(--border)">
                  <span className="text-[10px] font-bold text-(--text-muted) uppercase">Students</span>
                  <p className="text-lg font-bold text-(--text)">{previewData.totalActiveStudents.toString().padStart(2, "0")}</p>
                </div>
                <div className="text-center px-4 py-2">
                  <span className="text-[10px] font-bold text-(--text-muted) uppercase">Graduating</span>
                  <p className="text-lg font-bold text-(--text)">{previewData.totalPassedOutStudents == 0 ? '-' : previewData.totalPassedOutStudents.toString().padStart(2, "0")}</p>
                </div>
              </div>
            </div>

            {previewData.mappings.length === 0 ? (
              <div className="bg-(--bg-card) border border-(--border) rounded-lg p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-(--bg-soft) flex items-center justify-center text-(--text-muted)">
                  <Users size={32} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-(--text)">No Active Student Rosters Found</h3>
                  <p className="text-xs text-(--text-muted) max-w-md mx-auto leading-relaxed mt-1">
                    We couldn't find any active students in the current session (<strong>{previewData.fromSession}</strong>) that require promotion. Please add students or assign them to class sections first.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-5">
                {previewData.mappings.map(clsMap => {
                  const isPassedOut = clsMap.toClassId === "passed_out";
                  const targetClass = classData?.find(c => c.id === clsMap.toClassId);

                  return (
                    <div
                      key={clsMap.fromClassId}
                      className="bg-(--bg-card) border border-(--border) rounded-lg p-5 space-y-4 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
                    >
                      <div className="flex items-center justify-between border-b border-(--border) pb-3">
                        <div>
                          <span className="text-[10px] font-bold text-(--primary) uppercase tracking-wider bg-(--primary-soft) px-2.5 py-0.5 rounded-md border border-(--primary)/20">
                            Class promotion
                          </span>
                          <h4 className="font-bold text-(--text) text-base mt-1.5 flex items-center gap-2">
                            {clsMap.fromClassName}
                            <ArrowRight size={14} className="text-(--text-muted)" />
                            <span className={isPassedOut ? "text-emerald-500" : "text-(--text)"}>
                              {clsMap.toClassName}
                            </span>
                          </h4>
                        </div>
                      </div>

                      <div className="space-y-3.5">
                        {clsMap.sections.map(secMap => {
                          const key = `${clsMap.fromClassId}_${secMap.fromSectionId}`;
                          const currentVal = sectionOverrides[key] || "";
                          const isOrphaned = secMap.status === "orphaned_source" && !currentVal;

                          return (
                            <div
                              key={secMap.fromSectionId}
                              className={`p-3.5 rounded-lg border transition-all flex flex-col gap-3 ${isOrphaned
                                ? "bg-amber-500/5 border-amber-500/30"
                                : "bg-(--bg)/40 border-(--border)"
                                }`}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-md bg-(--bg-card) border border-(--border) flex items-center justify-center font-bold text-sm">
                                    {secMap.fromSectionName}
                                  </div>
                                  <div className="space-y-0">
                                    <p className="font-bold text-[10px] text-(--primary) uppercase">Source Section</p>
                                    <span className="text-sm flex gap-0 justify-start items-center gap-2 font-bold text-(--text)">
                                      <span>{clsMap.fromClassName} - {secMap.fromSectionName}</span>
                                      <ArrowRight size={14} className="text-(--text-muted)" />
                                      <span>{clsMap.toClassName}</span>
                                    </span>
                                  </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-(--primary-soft) text-(--primary) border border-(--primary)/20">
                                  {secMap.studentCount} Students
                                </span>
                              </div>

                              <div className="flex items-center gap-3">
                                <ArrowRight size={14} className="text-(--text-muted) rotate-90 md:rotate-0" />
                                <div className="flex-1">
                                  {isPassedOut ? (
                                    <div className="input py-2 text-xs bg-(--bg) text-(--text-muted) font-semibold flex items-center gap-1.5 border-dashed">
                                      <CheckCircle2 size={12} className="text-emerald-500" />
                                      Alumni Database (Auto)
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {secMap.status === "orphaned_source" ? (
                                        <div className="input py-2 px-3 text-xs bg-amber-500/5 text-amber-600 font-semibold flex items-center justify-between border-dashed border-amber-500/30 rounded-md">
                                          <div className="flex items-center font-bold gap-1.5">
                                            <Sparkles size={12} className="text-amber-500 animate-pulse" />
                                            <span>Section {secMap.fromSectionName}</span>
                                          </div>
                                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 px-2 py-0.5 rounded text-amber-700">
                                            Will be created automatically
                                          </span>
                                        </div>
                                      ) : (
                                        <select
                                          className="input py-2 text-xs bg-(--bg-card) font-semibold rounded-md"
                                          value={currentVal}
                                          onChange={e =>
                                            setSectionOverrides(prev => ({
                                              ...prev,
                                              [key]: e.target.value
                                            }))
                                          }
                                        >
                                          <option value="">Select Target Section</option>
                                          {targetClass?.sections?.map(s => (
                                            <option key={s.id} value={s.id}>
                                              Section {s.name}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {!isPassedOut && clsMap.nonFunctioningSections.length > 0 && (
                          <div className="pt-2 border-t border-(--border)/50 space-y-2">
                            <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider block">
                              Unmapped Target Sections (Incoming: 0)
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {clsMap.nonFunctioningSections.map(ns => (
                                <span
                                  key={ns.toSectionId}
                                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-(--bg) border border-(--border) text-(--text-muted)"
                                >
                                  Section {ns.toSectionName} (Empty)
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-6 border-t border-(--border)/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (unmappedCount > 0) {
                    toast.error("Please map all source sections before proceeding.");
                    return;
                  }
                  setStep(3);
                }}
                className="btn-primary px-8 flex items-center gap-2 shadow-lg shadow-orange-500/20"
              >
                Review Upgrade
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && previewData && (
          <div className="grid md:grid-cols-12 gap-6 items-start animate-in fade-in duration-300">
            <div className="md:col-span-8 bg-(--bg-card) border border-(--border) p-6 rounded-lg space-y-4">
              <div className="flex justify-start items-center gap-3 text-red-500">
                <ShieldAlert size={20} className="shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-(--text)">Final Validation & Safety Review</h3>
                  <p className="text-xs text-(--text-muted)">Please review the summary metrics before executing the upgrade transaction.</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="px-4 py-2 rounded-lg border border-(--border) bg-(--bg)/30">
                  <span className="text-[10px] font-bold text-(--text-muted) uppercase">Rollover Target</span>
                  <p className="text-lg font-bold text-(--primary)">{targetSession}</p>
                </div>
                <div className="px-4 py-2 rounded-lg border border-(--border) bg-(--bg)/30">
                  <span className="text-[10px] font-bold text-(--text-muted) uppercase">Students Promoted</span>
                  <p className="text-lg font-bold text-emerald-500">
                    {previewData.totalActiveStudents - previewData.totalPassedOutStudents}
                  </p>
                </div>
                <div className="px-4 py-2 rounded-lg border border-(--border) bg-(--bg)/30">
                  <span className="text-[10px] font-bold text-(--text-muted) uppercase">Graduating Alumni</span>
                  <p className="text-lg font-bold text-(--primary)">{previewData.totalPassedOutStudents}</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                  <Info size={16} />
                  <span>Important Database Information</span>
                </div>
                <ul className="text-xs space-y-1.5 text-(--text) font-medium list-disc pl-4 leading-relaxed">
                  <li>This action cannot be undone. All student user records will be modified in a series of atomic database transactions.</li>
                  <li>Student roll numbers will be reset to <code>null</code>. The school administrator must re-assign them in the new session.</li>
                  <li>Notice board announcements, attendance indexes, and timetables are session-locked and will start fresh in the target session.</li>
                </ul>
              </div>

              <div className="space-y-1 px-2 pt-2">
                <label className="text-xs font-bold text-(--text) uppercase tracking-wider block text-center md:text-left">
                  To confirm, please type <span className="text-red-500 font-mono">UPGRADE</span> below:
                </label>
                <div className="flex gap-2 justify-center md:justify-start py-1">
                  {Array(7).fill(0).map((_, i) => (
                    <input
                      key={i}
                      id={`otp-input-${i}`}
                      type="text"
                      maxLength={1}
                      value={otpVal[i]}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className={`w-10 h-12 text-center text-lg font-bold uppercase border rounded-md bg-(--bg-card) transition-all duration-200 outline-none focus:ring-2 focus:ring-(--primary) focus:border-(--primary) ${confirmText === "UPGRADE"
                        ? "border-emerald-500 text-emerald-500 focus:ring-emerald-500 focus:border-emerald-500"
                        : otpVal[i]
                          ? "border-(--primary) text-(--text)"
                          : "border-(--border) text-(--text-muted)"
                        }`}
                      placeholder={"UPGRADE"[i]}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-(--border)/50 flex justify-end">
                <button
                  onClick={executeSessionUpgrade}
                  disabled={confirmText !== "UPGRADE" || isExecuting}
                  className="btn-primary bg-red-500 border-red-500 hover:bg-red-600 hover:border-red-600 px-8 flex items-center gap-2 shadow-lg shadow-red-500/20"
                >
                  {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  Upgrade Session Now
                </button>
              </div>
            </div>

            <div className="md:col-span-4 bg-(--bg-card) border border-(--border) p-5 rounded-lg space-y-4">
              <h4 className="font-bold text-sm text-(--text) flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Roster Mapping Status
              </h4>
              <div className="space-y-3.5 max-h-72 overflow-y-auto pr-2 scrollbar-hide">
                {previewData.mappings.map(m => (
                  <div key={m.fromClassId} className="flex justify-between items-center text-xs border-b border-(--border)/40 pb-2">
                    <span className="font-semibold text-(--text)">{m.fromClassName}</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-(--text-muted)">{m.sections.length} sections</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                        Mapped
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-lg p-12 text-center flex flex-col items-center justify-center max-w-2xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
              <CheckCircle2 size={40} className="stroke-2" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-(--text)">Academic Rollover Successful!</h3>
              <p className="text-sm text-(--text-muted) max-w-md mx-auto leading-relaxed">
                The institution has successfully upgraded to the <strong>{targetSession}</strong> session. Students have been promoted to their target grade rosters.
              </p>
            </div>

            <div className="w-full bg-(--bg) p-5 rounded-lg border border-(--border) text-left space-y-3.5">
              <h4 className="text-xs font-bold text-(--text-muted) uppercase tracking-wider">Next Recommended Administrative Steps:</h4>
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center text-[10px] font-bold mt-0.5">1</div>
                  <div>
                    <p className="font-semibold text-(--text)">Verify Roster Roll Numbers</p>
                    <p className="text-[11px] text-(--text-muted)">Go to Assign Roll Numbers to organize student roll indexes alphabetically or by App ID.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center text-[10px] font-bold mt-0.5">2</div>
                  <div>
                    <p className="font-semibold text-(--text)">Map Academic Subjects</p>
                    <p className="text-[11px] text-(--text-muted)">Set up Subject-Teacher maps for the new classes to prepare the active timetable grid.</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 text-xs">
                  <div className="w-5 h-5 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center text-[10px] font-bold mt-0.5">3</div>
                  <div>
                    <p className="font-semibold text-(--text)">Assign Fee Structure</p>
                    <p className="text-[11px] text-(--text-muted)">Link student fee profiles to fee templates for the {targetSession} billing terms.</p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setOtpVal(Array(7).fill(""));
                setTargetSession("");
                setPreviewData(null);
                window.location.reload();
              }}
              className="btn-primary px-8"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
