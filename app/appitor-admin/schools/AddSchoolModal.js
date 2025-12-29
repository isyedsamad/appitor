"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

const modulesList = [
  { key: "students", label: "Students" },
  { key: "attendance", label: "Attendance" },
  { key: "fees", label: "Fees" },
  { key: "timetable", label: "Timetable" },
  { key: "exams", label: "Exams" },
  { key: "homework", label: "Homework" },
  { key: "messaging", label: "Messaging" },
  { key: "accounts", label: "Accounts" },
];

export default function AddSchoolModal({ open, onClose, orgList }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    school: {
      name: "",
      code: "",
      city: "",
      state: "",
      phone: "",
      email: "",
      orgId: "",
      orgName: "",
      plan: "trial",
      expiryDate: null,
      studentLimit: 500,
      modules: {},
    }
  });
  if (!open) return null;
  const updateSchool = (key, value) =>
    setForm((p) => ({
      ...p,
      school: { ...p.school, [key]: value },
    }));
  
  async function handleSubmit() {
    try {
      if (!form.school.orgId || !form.school.name || !form.school.code) {
        toast.error('please enter all the required fields', {
          theme: 'colored'
        })
        return;
      }
      setLoading(true);
      await secureAxios.post("/api/admin/create-school", form);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Error: ' + err, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="card w-full max-w-xl p-0 overflow-hidden">
        
        <div className="flex items-center justify-between bg-(--bg) px-6 py-4 border-b border-(--border)">
          <div>
            <h2 className="font-semibold">Add New School</h2>
            <p className="text-xs text-muted">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="hover:text-red-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          
          {step === 1 && (
            <>
              <SectionTitle title="School Information" />
              <Select
                label="Organization"
                required
                onChange={(e) => {
                  updateSchool("orgId", e.target.value)
                  updateSchool("orgName", e.target.options[e.target.selectedIndex].text)
                }}
              >
                <option value="">Select Organization</option>
                {orgList.map((o) => 
                  o.status == 'active' && (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="School Name" className="flex-1" onChange={(e) => updateSchool("name", e.target.value)} />
                <Input label="School Code" onChange={(e) => updateSchool("code", e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="City" onChange={(e) => updateSchool("city", e.target.value)} />
                <Input label="State" onChange={(e) => updateSchool("state", e.target.value)} />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Phone" onChange={(e) => updateSchool("phone", e.target.value)} />
                <Input label="Email" onChange={(e) => updateSchool("email", e.target.value)} />
              </div>
            </>
          )}

          {/* {step === 2 && (
            <>
              <SectionTitle title="Admin Setup" />
              <Input label="Admin Name" onChange={(e) => updateAdmin("name", e.target.value)} />
              <Input label="Admin Username" onChange={(e) => updateAdmin("username", e.target.value)} />
              <Input label="Admin Phone" onChange={(e) => updateAdmin("phone", e.target.value)} />
              <Input label="Temporary Password" value={form.admin.tempPassword} />
            </>
          )} */}

          {step === 2 && (
            <>
              <SectionTitle title="Module Access" />
              <div className="grid sm:grid-cols-2 gap-3">
                {modulesList.map((m) => (
                  <label
                    key={m.key}
                    className="flex items-center gap-4 p-4 border border-(--border) rounded-lg cursor-pointer hover:bg-(--primary-soft) transition"
                    >
                    <input
                        type="checkbox"
                        className="h-4 w-4 accent-(--primary)"
                        onChange={(e) =>
                        updateSchool("modules", {
                            ...form.school.modules,
                            [m.key]: e.target.checked,
                        })
                        }
                    />
                    <span className="text-sm font-medium">{m.label}</span>
                    </label>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <SectionTitle title="Plan & Limits" />
              <Select
                label="Plan"
                value={form.school.plan}
                onChange={(e) => updateSchool("plan", e.target.value)}
              >
                <option value="trial">Trial</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </Select>

              <Input
                label="Student Limit"
                type="number" onWheel={(e) => e.preventDefault()}
                value={form.school.studentLimit}
                onChange={(e) => updateSchool("studentLimit", e.target.value)}
              />
            </>
          )}
        </div>

        <div className="flex justify-between items-center px-6 mt-2 py-4 border-t border-(--border)">
          <button
            className="btn-outline"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
          >
            Back
          </button>

          {step < 3 ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)}>
              Next
            </button>
          ) : (
            <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
              {loading ? "Creating..." : "Create School"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


function SectionTitle({ title }) {
  return <h3 className="font-medium text-sm">{title}</h3>;
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <input {...props} />
    </div>
  );
}

function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <select {...props}>{children}</select>
    </div>
  );
}
