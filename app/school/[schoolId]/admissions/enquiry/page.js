"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Plus,
  Phone,
  User,
  Clock,
  MessageSquare,
  CheckCircle,
  XCircle,
  CalendarClock,
  AlertTriangle,
  Save,
  ArrowRight,
  X,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { useTheme } from "next-themes";

const STATUS_META = {
  NEW: "bg-(--status-m-bg) text-(--status-m-text) border-(--status-m-border)",
  FOLLOW_UP: "bg-(--status-l-bg) text-(--status-l-text) border-(--status-l-border)",
  CONVERTED: "bg-(--status-p-bg) text-(--status-p-text) border-(--status-p-border)",
  CLOSED: "bg-(--status-a-bg) text-(--status-a-text) border-(--status-a-border)",
};

export default function EnquiryManagementPage() {
  const router = useRouter();
  const { schoolUser, sessionList, currentSession, classData, setLoading } = useSchool();
  const { branch } = useBranch();
  const { theme } = useTheme();
  const [sessionId, setSessionId] = useState(currentSession?.id || "");
  const [enquiries, setEnquiries] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [selected, setSelected] = useState(null);
  const [summary, setSummary] = useState(null);

  const [form, setForm] = useState({
    studentName: "",
    parentName: "",
    mobile: "",
    classInterested: "",
    source: "",
    notes: "",
  });

  const [followUp, setFollowUp] = useState({
    remark: "",
    nextFollowUpDate: "",
  });

  async function fetchSummary() {
    const ref = doc(
      db,
      "schools",
      schoolUser.schoolId,
      "branches",
      branch,
      "admissions",
      "items",
      "enquirySummary",
      sessionId
    );
    const snap = await getDoc(ref);
    setSummary(snap.exists() ? snap.data() : null);
  }

  async function fetchEnquiries(loadMore = false) {
    if (!sessionId) return;
    setLoading(true);
    const q = query(
      collection(db, "schools", schoolUser.schoolId, "branches", branch, "admissions", "items", "enquiries"),
      where("sessionId", "==", sessionId),
      orderBy("createdAt", "desc"),
      ...(loadMore && lastDoc ? [startAfter(lastDoc)] : []),
      limit(5)
    );
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    setEnquiries(prev => loadMore ? [...prev, ...docs] : docs);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setLoading(false);
  }

  async function createEnquiry() {
    if (!form.studentName || !form.mobile || !form.classInterested) {
      toast.error("Fill required fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/admissions/enquiry/create", {
        branch,
        sessionId: schoolUser.currentSession,
        ...form,
      });
      setOpenAdd(false);
      setForm({
        studentName: "",
        parentName: "",
        mobile: "",
        classInterested: "",
        source: "",
        notes: "",
      });
      fetchEnquiries(false);
      fetchSummary();
      toast.success("Enquiry added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }  

  async function addFollowUp() {
    if (!followUp.remark || !followUp.nextFollowUpDate) {
      toast.error("Follow-up remark & date required");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/admissions/enquiry/followup", {
        branch,
        enquiryId: selected.id,
        remark: followUp.remark,
        nextFollowUpDate: followUp.nextFollowUpDate,
      });
      setSelected(null);
      setFollowUp({ remark: "", nextFollowUpDate: "" });
      fetchEnquiries(false);
      fetchSummary();
      toast.success("Follow-up added");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function convertToAdmission() {
    try {
      await secureAxios.post("/api/school/admissions/enquiry/convert", {
        branch,
        enquiryId: selected.id,
      });
  
      sessionStorage.setItem(
        "fromEnquiry",
        JSON.stringify({
          studentName: selected.studentName,
          mobile: selected.mobile,
          classInterested: selected.classInterested,
        })
      );
  
      router.push(`/school/${schoolUser.schoolId}/admissions/new`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    }
  }  

  function isOverdue(e) {
    if (e.status !== "FOLLOW_UP") return false;
    const last = e.followUps?.[e.followUps.length - 1];
    if (!last?.nextFollowUpDate) return false;
    return new Date(last.nextFollowUpDate) < new Date();
  }

  useEffect(() => {
    if (sessionId) {
      fetchSummary();
      fetchEnquiries(false);
    }
  }, [sessionId]);

  return (
    <RequirePermission permission="admission.manage">
      <div className="space-y-6">

        <div className="flex flex-col gap-3 md:flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <Users size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Enquiry Management</h1>
              <p className="text-sm text-(--text-muted)">Session-wise admission enquiries</p>
            </div>
          </div>
          <button onClick={() => setOpenAdd(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> New Enquiry
          </button>
        </div>

        <div className="max-w-xs">
          <p className="text-sm font-medium text-(--text-muted)">Session</p>
          <select className="input" value={sessionId} onChange={e => setSessionId(e.target.value)}>
            <option value="">Select Session</option>
            {sessionList?.map(s => (
              <option key={s.id} value={s.id}>{s.id}</option>
            ))}
          </select>
        </div>

        {summary && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              {
                key: "total",
                label: "Enquiries",
                icon: Users,
                bg: `${theme == "light" ? "bg-indigo-100 text-indigo-600" : "text-indigo-600 bg-indigo-950"}`,
              },
              {
                key: "NEW",
                label: "New",
                icon: Clock,
                bg: `${theme == "light" ? "bg-blue-100 text-blue-600" : "text-blue-600 bg-blue-950"}`,
              },
              {
                key: "FOLLOW_UP",
                label: "Follow-ups",
                icon: MessageSquare,
                bg: `${theme == "light" ? "bg-amber-100 text-amber-600" : "text-amber-600 bg-amber-950"}`,
              },
              {
                key: "CONVERTED",
                label: "Converted",
                icon: CheckCircle,
                bg: `${theme == "light" ? "bg-green-100 text-green-600" : "text-green-600 bg-green-950"}`,
              },
              {
                key: "CLOSED",
                label: "Closed",
                icon: XCircle,
                bg: `${theme == "light" ? "bg-gray-100 text-gray-600" : "text-gray-600 bg-gray-900"}`,
              },
            ].map(({ key, label, icon: Icon, bg }) => (
              <div
                key={key}
                className="bg-(--bg-card) border border-(--border) rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-(--text-muted)">
                    {label}
                  </p>
                  <p className="text-2xl font-semibold leading-none">
                    {summary[key] == 0 ? summary[key] : summary[key].toString().padStart(2, '0') || 0}
                  </p>
                </div>

                <div className={`p-3 rounded-lg ${bg}`}>
                  <Icon size={20} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden">
          <div className="px-6 py-4 bg-(--bg) border-b border-(--border)">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Recent Enquiries</h3>
                <p className="text-xs text-(--text-muted)">
                  Latest enquiries for the selected session
                </p>
              </div>
            </div>
          </div>
          {enquiries.length === 0 ? (
            <div className="py-16 text-center text-sm text-(--text-muted)">
              No enquiries found
            </div>
          ) : (
            <div className="divide-y divide-(--border)">
              {enquiries.map(e => {
                const isLate = isOverdue(e);
                const className =
                  classData.find(c => c.id === e.classInterested)?.name ||
                  e.classInterested;
                return (
                  <div
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={`
                      group px-6 py-4 cursor-pointer transition
                      hover:bg-(--bg)
                      ${isLate ? theme == 'light' ? "bg-red-50/60" : "bg-red-950/20" : ""}
                    `}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-(--primary-soft) text-(--primary)
                                        flex items-center justify-center font-semibold">
                          {e.studentName?.[0] || "S"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">
                              {e.studentName}
                            </p>
                            {isLate && (
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full
                              ${theme == 'light' ? 'bg-red-100 text-red-600' :  'text-red-600 bg-red-950'}`}>
                                <AlertTriangle size={12} />
                                Overdue
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-(--text-muted) truncate">
                            Class: {className} · Mobile: {e.mobile}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-medium px-2.5 py-1 rounded-full border
                            ${STATUS_META[e.status]}
                          `}
                        >
                          {e.status.replace("_", " ")}
                        </span>
                        <ChevronRight
                          size={16}
                          className="text-(--text-muted) group-hover:text-(--text)"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {lastDoc && (
            <div className="px-4 py-3 bg-(--bg) border-t border-(--border) text-center">
              <button
                onClick={() => fetchEnquiries(true)}
                className="btn-outline text-sm"
              >
                Load more enquiries
              </button>
            </div>
          )}
        </div>

        {openAdd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-(--bg-card) border border-(--border) w-full max-w-md rounded-lg overflow-hidden">
              <div className="flex justify-between px-5 py-4 bg-(--bg) border-b border-(--border)">
                <h2 className="font-semibold">New Enquiry</h2>
                <button onClick={() => setOpenAdd(false)}><X /></button>
              </div>
              <div className="p-5 space-y-3 max-h-[80dvh] overflow-y-auto">
                <Field label="Student Name" placeholder='i.e. Abhay Singh' value={form.studentName} onChange={v => setForm({ ...form, studentName: v })} />
                <Field label="Parent Name" placeholder='i.e. Akash Singh' value={form.parentName} onChange={v => setForm({ ...form, parentName: v })} />
                <Field label="Mobile Number" placeholder='i.e. 9900110000' value={form.mobile} onChange={v => setForm({ ...form, mobile: v })} />
                <div className="flex flex-col">
                  <p className="text-sm font-medium text-(--text-muted)">Class Interested</p>
                  <select
                    className="input"
                    value={form.classInterested}
                    onChange={e => setForm({ ...form, classInterested: e.target.value })}
                  >
                    <option value="">Select Class</option>
                    {classData.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <Field label="Source" placeholder='i.e. Call, Website, Visited, Mail' value={form.source} onChange={v => setForm({ ...form, source: v })} />
                <Textarea label="Notes (if any)" placeholder='enter additional notes here...' value={form.notes} onChange={v => setForm({ ...form, notes: v })} />
                <button onClick={createEnquiry} className="btn-primary w-full flex items-center gap-2 justify-center">
                  <Save size={16} /> Save Enquiry
                </button>
              </div>
            </div>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
            <div
              className="w-full max-w-[460px] h-full bg-(--bg-card) border-l-2 border-(--border) flex flex-col">
              <div className="px-5 py-4 border-b border-(--border) bg-(--bg)">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full bg-(--primary-soft) text-(--primary) flex items-center justify-center text-sm font-semibold shrink-0">
                      {selected.studentName?.[0] || "S"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">
                          {selected.studentName}
                        </p>
                        <span
                          className={`
                            text-[11px] px-2 py-0.5 rounded-full border font-medium
                            ${STATUS_META[selected.status]}
                          `}
                        >
                          {selected.status.replace("_", " ")}
                        </span>
                        {isOverdue(selected) && (
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-full 
                              ${theme == 'light' ? 'bg-red-100 text-red-600' : 'text-red-600 bg-red-950'} flex items-center gap-1`}>
                            <AlertTriangle size={12} />
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-(--text-muted) truncate">
                        {selected.mobile} ·{" "}
                        {classData.find(c => c.id === selected.classInterested)?.name}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-(--text-muted) hover:text-(--text)"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Info label="Parent" value={selected.parentName || "-"} />
                  <Info label="Source" value={selected.source || "-"} />
                </div>
                {selected.notes && (
                  <div className="bg-(--bg) border border-(--border) rounded-lg p-3">
                    <p className="text-xs text-(--text-muted) mb-1">
                      Notes
                    </p>
                    <p className="text-sm leading-relaxed">
                      {selected.notes}
                    </p>
                  </div>
                )}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-semibold">Follow-ups</p>
                    <p className="text-xs font-medium w-6 h-6 bg-(--bg) flex justify-center items-center rounded-full">
                      {selected.followUps?.length || 0}
                    </p>
                  </div>
                  <div className="space-y-4 max-h-56 overflow-y-auto pr-1">
                    {(selected.followUps || []).length === 0 ? (
                      <p className="text-sm text-(--text-muted)">
                        No follow-ups added yet
                      </p>
                    ) : (
                      selected.followUps.map((f, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span className="w-2 h-2 rounded-full bg-(--primary)" />
                            <span className="flex-1 w-px bg-(--border)" />
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium">
                              {f.remark}
                            </p>
                            <p className="text-xs text-(--text-muted)">
                              Next follow-up: {f.nextFollowUpDate}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="bg-(--bg) border border-(--border) rounded-lg px-5 py-4 space-y-3">
                  <p className="text-sm font-semibold">
                    Add Follow-up
                  </p>
                  <Field
                    label="Remark"
                    value={followUp.remark}
                    onChange={v =>
                      setFollowUp({ ...followUp, remark: v })
                    }
                  />
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-(--text-muted)">
                      Next follow-up date
                    </p>
                    <input
                      type="date"
                      className="input"
                      value={followUp.nextFollowUpDate}
                      onChange={e =>
                        setFollowUp({
                          ...followUp,
                          nextFollowUpDate: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    onClick={addFollowUp}
                    className="btn-outline w-full"
                  >
                    Add follow-up
                  </button>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-(--border) bg-(--bg)">
                <button
                  onClick={convertToAdmission}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Convert to Admission
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}

function Field({ label, value, placeholder = '', onChange }) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-(--text-muted)">{label}</p>
      <input className="input" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function Textarea({ label, value, placeholder = '', onChange }) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-(--text-muted)">{label}</p>
      <textarea className="input h-20" placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-(--text-muted)">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  );
}
