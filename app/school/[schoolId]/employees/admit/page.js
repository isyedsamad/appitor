"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  User,
  Briefcase,
  Shield,
  Hash,
  ShieldCheck,
  ChevronLeft,
  Mail,
  Phone,
  CircleDollarSign,
  Fingerprint
} from "lucide-react";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { useBranch } from "@/context/BranchContext";
import { useSchool } from "@/context/SchoolContext";
import RequirePermission from "@/components/school/RequirePermission";
import { useRouter } from "next/navigation";

export default function AdmitEmployeePage() {
  const router = useRouter();
  const { branch, branchInfo, loadBranch } = useBranch();
  const { schoolUser, setLoading, roles, loadEmployee } = useSchool();
  const [admittedData, setAdmittedData] = useState(null);

  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    gender: "",
    roleId: "",
    role: "",
    salary: "",
  });

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.name || !form.mobile || !form.roleId || !form.salary) {
      toast.error("Please fill all required fields");
      return;
    }
    if (!/^\d{10}$/.test(form.mobile)) {
      toast.error("Mobile number must be 10 digits");
      return;
    }
    setLoading(true);
    try {
      const resp = await secureAxios.post("/api/school/employees/admit", {
        ...form,
        branchIds: [branch],
        branchNames: [branchInfo.name]
      });

      await loadBranch(branch);
      await loadEmployee(branch);
      toast.success("Employee admitted successfully");
      setAdmittedData(resp.data);

      setForm({
        name: "",
        mobile: "",
        email: "",
        gender: "",
        roleId: "",
        role: "",
        salary: "",
      });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to admit employee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="employee.admit.view">
      <div className="space-y-4 pb-20 text-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <UserPlus size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold flex items-center gap-2">
                Admit Employee
              </h1>
              <p className="text-xs text-(--text-muted)">
                Register new staff member for {branchInfo?.name}
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
                <span className="text-(--text-muted)">Employee ID</span>
                <span className="font-mono font-semibold">{admittedData.employeeId}</span>
              </div>
              <div className="p-3 bg-(--bg-card) border border-green-500/20 rounded-lg flex justify-between">
                <span className="text-(--text-muted)">Temporary Password</span>
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
                <User size={14} className="text-(--primary)" /> Personal Details
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <Field label="Full Name" value={form.name} onChange={v => update("name", v)} icon={User} placeholder="e.g. Akash Kumar" required />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Mobile Number" value={form.mobile} onChange={v => update("mobile", v)} icon={Phone} type="number" placeholder="10 digits" required />
                  <Field label="Gender" value={form.gender} onChange={v => update("gender", v)} options={["Male", "Female", "Other"]} icon={User} />
                </div>
                <Field label="Email Address" value={form.email} onChange={v => update("email", v)} icon={Mail} placeholder="e.g. akash@example.com" />
              </div>
            </section>

            <section className="bg-(--bg-card) p-5 rounded-xl border border-(--border) shadow-sm space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                <Briefcase size={14} className="text-(--primary)" /> Employment Info
              </h2>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-(--text-muted) flex items-center gap-2">
                    <Fingerprint size={12} /> Role <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input text-sm"
                    value={form.roleId}
                    onChange={e => {
                      update("roleId", e.target.value);
                      update("role", e.target.options[e.target.selectedIndex].text);
                    }}
                  >
                    <option value="">Select role</option>
                    {roles?.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <Field label="Monthly Salary (₹)" value={form.salary} onChange={v => update("salary", v)} icon={CircleDollarSign} type="number" placeholder="e.g. 25000" required />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            <section className="bg-(--bg-card) p-5 rounded-xl border border-(--border) shadow-sm space-y-4 h-fit sticky top-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
                <Shield size={14} className="text-(--primary)" /> System & Security
              </h2>
              <div className="space-y-4">
                <div className="p-4 bg-(--bg-soft) rounded-xl border border-(--border) space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                      <Hash size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-(--text-muted)">Employee ID</p>
                      <p className="text-xs font-semibold">Generated on admission</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-(--text-muted)">Temporary Password</p>
                      <p className="text-xs font-semibold">Standardized Pattern</p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-(--text-muted) leading-relaxed">
                  <p>• IDs follow the <span className="font-semibold text-(--text)">SCHOOL-BRANCH-E</span> pattern.</p>
                  <p>• Credentials will be available immediately after admission.</p>
                  <p>• Mobile number will be used for two-factor authentication.</p>
                </div>

                <button
                  onClick={handleSubmit}
                  className="w-full text-sm flex items-center justify-center gap-2 py-3 bg-(--primary) text-white rounded-xl font-semibold hover:bg-(--primary-hover) shadow-md shadow-orange-500/20 transition-all active:scale-[0.98] mt-4"
                >
                  <UserPlus size={15} /> Admit Employee
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
