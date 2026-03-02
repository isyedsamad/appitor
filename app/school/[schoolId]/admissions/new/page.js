"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  User,
  Calendar,
  BookOpen,
  Hash,
  Save,
  ChevronLeft,
  Phone,
  ShieldCheck,
  CreditCard,
  History
} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { useBranch } from "@/context/BranchContext";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import RequirePermission from "@/components/school/RequirePermission";

export default function NewAdmissionPage() {
  const router = useRouter();
  const { schoolUser, classData, setLoading, currentSession, sessionList } = useSchool();
  const { branch, branchInfo } = useBranch();

  const [admittedData, setAdmittedData] = useState(null);
  const [autoRoll, setAutoRoll] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");

  const [form, setForm] = useState({
    admissionId: "",
    name: "",
    mobile: "",
    dob: "",
    gender: "",
    className: "",
    section: "",
  });

  const selectedClass = classData?.find(c => c.id === form.className);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    if (!form.admissionId || !form.name || !form.dob || !form.className || !form.section) {
      toast.error("Please fill all required fields");
      return;
    }

    if (form.mobile && !/^\d{10}$/.test(form.mobile)) {
      toast.error("Mobile number must be 10 digits");
      return;
    }

    setLoading(true);
    try {
      const resp = await secureAxios.post("/api/school/admissions/new", {
        ...form,
        branch,
        branchNames: [branchInfo.name],
        autoRoll,
        currentSession,
        templateId: selectedTemplateId || null,
        templateName: selectedTemplateName || null
      });

      toast.success("Admission completed successfully");
      setAdmittedData(resp.data);
      // await loadStudent(branch); // Students are loaded on-demand in the list page

      setForm({
        admissionId: "",
        name: "",
        mobile: "",
        dob: "",
        gender: "",
        className: "",
        section: "",
      });
      setSelectedTemplateId("");
      setSelectedTemplateName("");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Admission failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!form.className || !schoolUser) {
      setTemplates([]);
      setSelectedTemplateId("");
      return;
    }

    const fetchTemplates = async () => {
      const snap = await getDocs(
        query(
          collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "templates", "items"),
          where("className", "==", form.className),
          where("status", "==", "active")
        )
      );
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTemplates();
  }, [form.className, schoolUser, branch]);

  return (
    <RequirePermission permission="admission.new.view">
      <div className="space-y-5 pb-20 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-(--primary-soft) text-(--primary) flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                New Admission
              </h1>
              <p className="text-xs text-(--text-muted)">
                Register a new student for {branchInfo?.name}
              </p>
            </div>
          </div>
        </div>

        {admittedData && (
          <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-green-600 font-semibold">
              <ShieldCheck size={18} /> Admission Successful!
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-(--bg-card) border border-green-500/20 rounded-lg flex justify-between">
                <span className="text-(--text-muted)">Student App ID</span>
                <span className="font-mono font-semibold uppercase">{admittedData.appId}</span>
              </div>
              <div className="p-3 bg-(--bg-card) border border-green-500/20 rounded-lg flex justify-between">
                <span className="text-(--text-muted)">Login Password</span>
                <span className="font-mono font-semibold">{admittedData.password}</span>
              </div>
            </div>
            <button
              onClick={() => setAdmittedData(null)}
              className="text-[10px] font-semibold text-green-600 hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-5">
            <section className="bg-(--bg-card) p-5 rounded-xl border border-(--border) shadow-sm space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                <User size={14} className="text-(--primary)" /> Student Details
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Admission ID" value={form.admissionId} onChange={v => update("admissionId", v.toUpperCase())} icon={Hash} placeholder="e.g. 2025001" required />
                  <Field label="Full Name" value={form.name} onChange={v => update("name", v)} icon={User} placeholder="e.g. Akash Kumar" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mobile Number" value={form.mobile} onChange={v => update("mobile", v)} icon={Phone} type="number" placeholder="Optional" />
                  <Field label="Gender" value={form.gender} onChange={v => update("gender", v)} options={["Male", "Female", "Other"]} icon={User} />
                </div>
                <Field
                  label="Date of Birth"
                  value={toInputDate(form.dob)}
                  onChange={v => update("dob", formatInputDate(v))}
                  type="date"
                  icon={Calendar}
                  required
                />
              </div>
            </section>

            <section className="bg-(--bg-card) p-5 rounded-xl border border-(--border) shadow-sm space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                <BookOpen size={14} className="text-(--primary)" /> Academic Details
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                      <Hash size={12} /> Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input text-sm"
                      value={form.className}
                      onChange={e => {
                        update("className", e.target.value);
                        update("section", "");
                      }}
                    >
                      <option value="">Select class</option>
                      {classData?.map(cls => (
                        <option key={cls.id} value={cls.id}>{cls.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                      <Hash size={12} /> Section <span className="text-red-500">*</span>
                    </label>
                    <select
                      className="input text-sm"
                      value={form.section}
                      disabled={!selectedClass}
                      onChange={e => update("section", e.target.value)}
                    >
                      <option value="">Select section</option>
                      {selectedClass?.sections.map(sec => (
                        <option key={sec.id} value={sec.id}>{sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                    <History size={12} /> Session
                  </label>
                  <input readOnly className="input text-sm bg-(--bg-soft) cursor-not-allowed font-semibold" value={currentSession || "Current Session"} />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="bg-(--bg-card) p-5 rounded-xl border border-(--border) shadow-sm space-y-4 h-fit sticky top-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                <CreditCard size={14} className="text-(--primary)" /> Fees & System
              </h2>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                    Fee Template (Optional)
                  </label>
                  <select
                    className="input text-sm"
                    value={selectedTemplateId}
                    onChange={e => {
                      setSelectedTemplateName(e.target.options[e.target.selectedIndex].text);
                      setSelectedTemplateId(e.target.value);
                    }}
                  >
                    <option value="">Assign Later</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-(--text-muted)">
                    Fees can also be assigned later from the Fees section.
                  </p>
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2 mb-2">
                    Roll Number Settings
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        checked={autoRoll}
                        onChange={() => setAutoRoll(true)}
                        className="w-4 h-4 accent-(--primary) cursor-pointer"
                      />
                      <span className="text-xs font-semibold group-hover:text-(--text) transition-colors">Auto Assign</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="radio"
                        checked={!autoRoll}
                        onChange={() => setAutoRoll(false)}
                        className="w-4 h-4 accent-(--primary) cursor-pointer"
                      />
                      <span className="text-xs font-semibold group-hover:text-(--text) transition-colors">Manual</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-(--bg-soft) rounded-xl border border-(--border) space-y-3 mt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Hash size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-(--text-muted)">Student App ID</p>
                      <p className="text-xs font-semibold">{form.admissionId ? `${branchInfo?.appitorCode}${form.admissionId}` : 'Credentials preview'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-(--text-muted)">Login Credentials</p>
                      <p className="text-xs font-semibold">DOB format (DDMMYYYY)</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full text-sm flex items-center justify-center gap-2 py-3 bg-(--primary) text-white rounded-xl font-semibold hover:bg-(--primary-hover) shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] mt-2"
                >
                  <Save size={16} /> Create Admission
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}

function Field({ label, value, onChange, placeholder, type = "text", options = [], icon: Icon, required }) {
  return (
    <div className="space-y-1.5 group">
      <label className="text-xs font-semibold text-(--text-muted) group-focus-within:text-(--primary) transition-colors flex items-center gap-2">
        {Icon && <Icon size={12} />} {label} {required && <span className="text-red-500">*</span>}
      </label>
      {options.length > 0 ? (
        <select
          className="input text-sm"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Select {label}</option>
          {options.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          onWheel={type === "number" ? (e) => e.target.blur() : null}
          className="input text-sm"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
      )}
    </div>
  );
}
