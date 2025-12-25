"use client";

import { useEffect, useState } from "react";
import {UserPlus, User, Calendar, BookOpen, Hash, Save} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { useBranch } from "@/context/BranchContext";

export default function NewAdmissionPage() {
  const { schoolUser, classData, setLoading } = useSchool();
  const { branch } = useBranch();
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
    c => c.name === form.className
  );
  const studentEmail =
    form.admissionId && schoolUser
      ? `${form.admissionId}@${schoolUser.schoolCode.toLowerCase()}.appitor`
      : "";
  const password = form.dob
    ? (() => {
      const [year, month, day] = form.dob.split("-");
      return `${day}${month}${year}`;
    })()
    : "";    
  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }
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
        branch
      });
      toast.success("Admission completed successfully");
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
  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <UserPlus className="text-(--primary)" />
        <div>
          <h1 className="text-xl font-semibold text-(--text)">
            New Admission
          </h1>
          <p className="text-sm text-(--text-muted)">
            Register a new student
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
                update("admissionId", e.target.value)
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
                <option key={cls.name} value={cls.name}>
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
              value={form.dob}
              onChange={e =>
                update("dob", e.target.value)
              }
            />
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
              Student ID
            </label>
            <div className="input font-semibold">
              {form.admissionId || "—"}
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
