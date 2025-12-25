"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Phone,
  IndianRupee,
  Power,
  Shuffle,
  Save,
  ArrowLeft,
  BadgeCheck,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import { useBranch } from "@/context/BranchContext";

export default function EmployeeProfilePage() {
  const { theme } = useTheme();
  const { employeeId } = useParams();
  const router = useRouter();
  const { schoolUser, branches, setLoading } = useSchool();
  const { branch } = useBranch();
  const [employee, setEmployee] = useState(null);
  const [form, setForm] = useState({});
  const [newBranch, setNewBranch] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (schoolUser && employeeId && branch) fetchEmployee();
  }, [schoolUser, employeeId, branch]);
  async function fetchEmployee() {
    setLoading(true);
    const ref = doc(db, "schools", schoolUser.schoolId, "branches", branch, "employees", employeeId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      toast.error("Employee not found");
      router.back();
      return;
    }
    setEmployee(snap.data());
    setForm(snap.data());
    setLoading(false);
  }
  const update = (k, v) =>
    setForm(prev => ({ ...prev, [k]: v }));
  const isActive = employee?.status === "active" || employee?.status === "pending";
  async function saveProfile() {
    setSaving(true);
    setLoading(true);
    try {
      await secureAxios.put("/api/school/employees/update", {
        branch,
        employeeId,
        updates: {
          name: form.name,
          mobile: form.mobile,
          salary: form.salary,
          roleId: form.roleId,
        },
      });
      toast.success("Profile updated");
      fetchEmployee();
    } catch(err) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }
  async function toggleStatus() {
    setLoading(true);
    try {
      await secureAxios.put("/api/school/employees/status", {
        branch,
        employeeId,
        status: isActive ? "disabled" : "active",
      });
      toast.success(
        `Employee ${isActive ? "disabled" : "activated"}`
      );
      fetchEmployee();
    } catch(err) {
      toast.error("Failed to update status");
    } finally {
      setLoading(false);
    }
  }
  async function transferEmployee() {
    if (!newBranch) {
      toast.error("Please select a branch");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.put("/api/school/employees/transfer", {
        branch,
        employeeId,
        newBranchId: newBranch,
      });
      toast.success("Employee transferred");
      fetchEmployee();
      setNewBranch("");
    } catch(err) {
      toast.error("Transfer failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  if (!employee) return null;
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded hover:bg-(--bg-soft)"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-(--text)">
            {employee.name}
          </h1>
          <p className="text-sm text-(--text-muted)">
            {employee.employeeId}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted)">
              Profile Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-(--text-muted)">
                  Full Name
                </label>
                <input
                  className="input"
                  value={form.name || ""}
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
                  value={form.mobile || ""}
                  onChange={e =>
                    update("mobile", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted)">
              Employment
            </h2>
            <div>
              <label className="text-sm text-(--text-muted)">
                Salary (₹)
              </label>
              <div className="flex items-center gap-2">
                <IndianRupee size={14} />
                <input
                  className="input"
                  value={form.salary || ""}
                  onChange={e =>
                    update("salary", e.target.value)
                  }
                />
              </div>
            </div>
          </section>
        </div>
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted)">
              System Info
            </h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-(--text-muted)">Status</span>
                <span
                  className={`flex items-center gap-1 ${
                    isActive
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  <BadgeCheck size={14} />
                  {employee.status == 'pending' ? 'active' : employee.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">
                  Username
                </span>
                <span className="font-semibold">{employee.employeeId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">
                  Password
                </span>
                <span>{employee.password}</span>
              </div>
            </div>
          </section>
          <section className="space-y-4 border-t border-(--border) pt-4">
            <h2 className="text-sm font-semibold uppercase text-danger">
              Actions
            </h2>
            <button
              onClick={toggleStatus}
              className={`w-full flex items-center gap-2 justify-center px-4 py-2 rounded ${
                !isActive ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`
              }`}
            >
              <Power size={16} />
              {isActive
                ? "Disable Employee Login"
                : "Activate Employee Login"}
            </button>
            <div className="space-y-2">
              <label className="text-sm text-(--text-muted)">
                Transfer to Branch
              </label>
              <select
                className="input"
                value={newBranch}
                onChange={e =>
                  setNewBranch(e.target.value)
                }
              >
                <option value="">Select branch</option>
                {branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                onClick={transferEmployee}
                className="btn-outline w-full flex items-center justify-center gap-2"
              >
                <Shuffle size={16} />
                Transfer Employee
              </button>
            </div>
          </section>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4 border-t border-(--border)">
        <button
          onClick={() => router.back()}
          className="btn-outline"
        >
          Cancel
        </button>
        <button
          onClick={saveProfile}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={16} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
