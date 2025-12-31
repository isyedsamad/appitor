"use client";

import { useEffect, useState } from "react";
import {UserPlus, User, Calendar, BookOpen, Hash, Save} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { useBranch } from "@/context/BranchContext";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NewAdmissionPage() {
  const { schoolUser, classData, setLoading, currentSession } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [branchCode, setBranchCode] = useState('');
  const [autoRoll, setAutoRoll] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTemplateName, setSelectedTemplateName] = useState("");
  const [form, setForm] = useState({
    admissionId: "",
    name: "",
    dob: "",
    gender: "",
    className: "",
    section: "",
    mobile: "",
  });
  const selectedClass = classData?.find(
    c => c.id === form.className
  );
  const studentEmail =
    form.admissionId && schoolUser
      ? `${form.admissionId}@${schoolUser.schoolCode.toLowerCase()}.appitor`
      : "";
  const password = form.dob
    ? (() => {
      const split = form.dob.split("-");
      return `${split[0]}${split[1]}${split[2]}`;
    })()
    : "";    
  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }
  useEffect(() => {
    if(branchInfo) setBranchCode(branchInfo.appitorCode);
  }, [branchInfo])
  
  async function handleSubmit() {
    if (
      !form.admissionId ||
      !form.name ||
      !form.dob ||
      !form.className ||
      !form.section
    ) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/admissions/new", {
        ...form,
        branch,
        branchCode,
        autoRoll,
        currentSession,
        templateId: selectedTemplateId || null,
        templateName: selectedTemplateName || null
      });
      toast.success("Admission completed successfully");
      setSelectedTemplateId('');
      setSelectedTemplateName('');
      setForm({
        admissionId: "",
        name: "",
        mobile: "",
        dob: "",
        gender: "",
        className: "",
        section: "",
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Admission failed"
      );
    } finally {
      setLoading(false);
    }
  }
  if(!classData && !schoolUser) return null;
  useEffect(() => {
    if (!form.className) {
      setTemplates([]);
      setSelectedTemplateId("");
      return;
    }
    const fetchTemplates = async () => {
      const snap = await getDocs(
        query(
          collection(
            db,
            "schools",
            schoolUser.schoolId,
            "branches",
            branch,
            "fees",
            "templates",
            "items"
          ),
          where("className", "==", form.className),
          where("status", "==", "active")
        )
      );
      setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchTemplates();
  }, [form.className]);  
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
          <UserPlus size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-(--text)">
            New Admission
          </h1>
          <p className="text-sm text-(--text-muted)">
            Register a new student with fees
          </p>
        </div>
      </div>
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase text-(--text-muted) flex items-center gap-2">
          <User size={14} /> Student Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-(--text-muted)">
              Admission ID <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              value={form.admissionId}
              onChange={e =>
                update("admissionId", e.target.value.toUpperCase())
              }
              placeholder="e.g. ABCS-2025-001"
            />
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              className="input"
              placeholder="i.e. Akash Kumar"
              value={form.name}
              onChange={e =>
                update("name", e.target.value)
              }
            />
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Mobile Number
            </label>
            <input
              className="input"
              placeholder="i.e. 9801233009"
              value={form.mobile}
              onChange={e =>
                update("mobile", e.target.value)
              }
            />
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Gender
            </label>
            <select
              className="input"
              value={form.gender}
              onChange={e =>
                update("gender", e.target.value)
              }
            >
              <option value="">Select</option>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>
        </div>
      </section>
      <hr className="border-(--border)" />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase text-(--text-muted) flex items-center gap-2">
          <BookOpen size={14} /> Academic Details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-(--text-muted)">
              Class <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              value={form.className}
              onChange={e => {
                update("className", e.target.value);
                update("section", "");
              }}
            >
              <option value="">Select class</option>
              {classData?.map(cls => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Section <span className="text-red-500">*</span>
            </label>
            <select
              className="input"
              value={form.section}
              disabled={!selectedClass}
              onChange={e =>
                update("section", e.target.value)
              }
            >
              <option value="">Select section</option>
              {selectedClass?.sections.map(sec => (
                <option key={sec.id} value={sec.id}>
                  {sec.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              className="input"
              value={toInputDate(form.dob)}
              onChange={e => {
                if(e.target.value == '') update("dob", '');
                else update("dob", formatInputDate(e.target.value));
                console.log(formatInputDate(e.target.value));
                
              }}
            />
          </div>
          <div>
            <label className="text-sm  text-(--text-muted)">
              Fee Template (Optional)
            </label>
            <select
              className="input"
              value={selectedTemplateId}
              onChange={e => {
                setSelectedTemplateName(e.target.options[e.target.selectedIndex].text);
                setSelectedTemplateId(e.target.value)
              }}
            >
              <option value="">Assign Later</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.className}
                </option>
              ))}
            </select>
            <p className="text-xs text-(--text-muted)">
              If skipped, fee can be assigned later from Fee Assignment
            </p>
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Auto Assign Roll No.
            </label>
            <select
              className="input"
              value={autoRoll}
              onChange={e =>
                setAutoRoll(e.target.value)
              }
            >
              <option value={true}>Yes</option>
              <option value={false}>No</option>
            </select>
          </div>
        </div>
      </section>
      <hr className="border-(--border)" />
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase text-(--text-muted) flex items-center gap-2">
          <Hash size={14} /> System Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-(--text-muted)">
              Student App ID
            </label>
            <div className="input font-semibold">
              {form.admissionId ? branchCode + '' + form.admissionId : '-'}
            </div>
          </div>
          <div>
            <label className="text-sm text-(--text-muted)">
              Login Password
            </label>
            <div className="input font-semibold">
              {password || "DOB (numbers only)"}
            </div>
          </div>
        </div>
        <p className="text-xs text-(--text-muted)">
          Password will be DOB in numeric format (DDMMYYYY).
        </p>
      </section>
      <div className="flex justify-end gap-2 pt-6 border-t border-(--border)">
        <button className="btn-outline">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          Create Admission
        </button>
      </div>
    </div>
  );
}
