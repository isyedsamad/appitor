"use client";

import { useEffect, useState } from "react";
import {
  UserPlus,
  User,
  Briefcase,
  Shield,
  Hash,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { useBranch } from "@/context/BranchContext";
import { useSchool } from "@/context/SchoolContext";
import RequirePermission from "@/components/school/RequirePermission";

export default function AdmitEmployeePage() {
  const { branch, branchInfo } = useBranch();
  const { schoolUser, setLoading, roles } = useSchool();
  const [employeeId, setEmployeeId] = useState("");
  const [rolesList, setRolesList] = useState([]);
  function generateTempPassword() {
    return Math.random().toString(36).slice(-8);
  }
  const [form, setForm] = useState({
    name: "",
    mobile: "",
    email: "",
    gender: "",
    roleId: "",
    role: "",
    salary: "",
    password: generateTempPassword(),
  });
  useEffect(() => {
    if (!branchInfo || !schoolUser) return;
    const next = branchInfo.employeeCounter + 1;
    setRolesList(roles);
    setEmployeeId(
      `${schoolUser.schoolCode}-${branchInfo.appitorCode}E${next}`
    );
  }, [branchInfo, schoolUser]);

  const update = (k, v) =>
    setForm(p => ({ ...p, [k]: v }));

  async function handleSubmit() {
    if (!form.name || !form.mobile || !form.roleId || !form.salary) {
      toast.error("Please fill all required fields", {
        theme: 'colored'
      });
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/employees/admit", {
        ...form,
        employeeId,
        branchIds: [branch],
        branchNames: [branchInfo.name]
      });
      toast.success("Employee admitted successfully", {
        theme: 'colored'
      });
      setForm({
        name: "",
        mobile: "",
        email: "",
        gender: "",
        roleId: "",
        role: "",
        salary: "",
        password: generateTempPassword(),
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Failed to admit employee"
      , {
        theme: 'colored'
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="employee.manage">
      <div className="max-w-5xl mx-auto px-2">
        <div className="flex items-center gap-3 mb-6">
          <UserPlus className="text-primary" />
          <div>
            <h1 className="text-xl font-semibold text-text">
              Admit Employee
            </h1>
            <p className="text-sm text-(--text-muted)">
              Register a new employee for this branch
            </p>
          </div>
        </div>
        <div className="space-y-7">
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
              <User size={14} /> Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
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
              <div className="space-y-1">
                <label className="text-sm text-(--text-muted)">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="i.e. 9900119900"
                  value={form.mobile}
                  onChange={e =>
                    update("mobile", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm text-(--text-muted)">
                  Email (optional)
                </label>
                <input
                  className="input"
                  placeholder="i.e. akash@gmail.com"
                  value={form.email}
                  onChange={e =>
                    update("email", e.target.value)
                  }
                />
              </div>

              <div className="space-y-1">
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
            <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
              <Briefcase size={14} /> Employment Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-(--text-muted)">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  className="input"
                  value={form.roleId}
                  onChange={e => {
                    update("roleId", e.target.value)
                    update("role", e.target.options[e.target.selectedIndex].text)
                  }}
                >
                  <option value="">Select role</option>
                  {rolesList.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))
                  }
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-(--text-muted)">
                  Salary <span className="text-red-500">*</span>
                </label>
                <input
                  className="input"
                  type="number"
                  placeholder="i.e. 12000"
                  value={form.salary}
                  onChange={e =>
                    update("salary", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
          <hr className="border-(--border)" />
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted) flex items-center gap-2">
              <Shield size={14} /> System Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-sm text-(--text-muted)">
                  Employee ID
                </label>
                <div className="input flex items-center gap-2 cursor-not-allowed font-medium">
                  <Hash size={14} className="text-(--text-muted)" />
                  <span>
                    {employeeId || "Generating…"}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-(--text-muted)">
                  Temporary Password
                </label>
                <div className="input flex items-center gap-2 cursor-not-allowed font-medium">
                  <ShieldCheck size={14} className="text-(--text-muted)" />
                  <span>
                    {form.password || "Generating…"}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm text-(--text-muted)">
                  Account Status
                </label>
                <div className="input cursor-not-allowed">
                  Pending Activation
                </div>
              </div>
            </div>
            <p className="text-xs text-(--text-muted)">
              Employee will receive activation instructions
              after admission.
            </p>
          </section>
          <div className="pt-6 border-t border-(--border) flex justify-end">
            <button
              onClick={handleSubmit}
              className="btn-primary px-8"
            >
              Admit Employee
            </button>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
