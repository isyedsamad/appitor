"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {User, GraduationCap, Calendar, Save, Power, Shuffle, Lock, BadgeCheck, Info} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";
import { useBranch } from "@/context/BranchContext";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";

export default function StudentProfilePage() {
  const { uid } = useParams();
  const { theme } = useTheme();
  const { branch } = useBranch();
  const { classData, branches, schoolUser, setLoading } = useSchool();
  const [student, setStudent] = useState(null);
  const [form, setForm] = useState({});
  const [newBranch, setNewBranch] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if(schoolUser && branch) fetchStudent();
  }, [schoolUser, branch]);
  async function fetchStudent() {
    setLoading(true);
    const snap = await getDoc(doc(db, "schools", schoolUser.schoolId, 'branches', branch, 'students', uid));
    if (!snap.exists()) return;
    setStudent(snap.data());
    setForm(snap.data());
    setLoading(false);
  }
  const update = (k, v) =>
    setForm(p => ({ ...p, [k]: v }));
  const selectedClass = classData && classData.find(
    c => c.name === form.className
  );
  const password = form.dob
    ? (() => {
      const [year, month, day] = form.dob.split("-");
      return `${day}${month}${year}`;
    })()
    : "";
  const isActive = student?.status === "active";
  async function saveProfile() {
    setSaving(true);
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/update", {
        uid,
        branch,
        updates: {
          name: form.name,
          className: form.className,
          section: form.section,
          gender: form.gender,
          dob: form.dob,
        },
      });
      toast.success("Profile updated");
      fetchStudent();
    } catch(err) {
      toast.error("Update failed: " + err);
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }
  async function updatePassword() {
    const [y, m, d] = form.dob.split("-");
    const password = `${d}${m}${y}`;
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/password", {
        uid,
        branch,
        password,
      });
      toast.success("Password reset successfully");
    } catch(err) {
      toast.error("Password update failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  async function toggleStatus() {
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/status", {
        uid,
        branch,
        status: isActive ? "disabled" : "active",
      });
      fetchStudent();
    } catch(err) {
      toast.error('Error: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  async function transferStudent() {
    if (!newBranch) {
      toast.error("Select a branch");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/transfer", {
        uid,
        branch,
        newBranchId: newBranch,
      });
      toast.success("Student transferred");
      setNewBranch("");
      fetchStudent();
    } catch(err) {
      toast.error('Error: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  if (!student || !schoolUser || !branches) return null;
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-(--border) pb-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded bg-(--primary-soft) text-(--primary)">
            <User size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              {student.name}
            </h1>
            <p className="text-sm text-(--text-muted) font-medium">
              Admission ID: {student.admissionId}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-md uppercase font-semibold 
            ${student.status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}
          `}
        >
          <BadgeCheck size={14} />
          {student.status}
        </span>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="border border-(--border) rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted) flex items-center gap-2">
              <User size={14} /> Student Details
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
                  Gender
                </label>
                <select
                  className="input"
                  value={form.gender || ""}
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
              <div>
                <label className="text-sm text-(--text-muted)">
                  Date of Birth
                </label>
                <input
                  type="date"
                  className="input"
                  value={toInputDate(form.dob) || ""}
                  onChange={e => {
                    if(e.target.value == '') update("dob", '');
                    else update("dob", formatInputDate(e.target.value))
                  }}
                />
              </div>
            </div>
          </section>
          <section className="border border-(--border) rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted) flex items-center gap-2">
              <GraduationCap size={14} /> Academic Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-(--text-muted)">Session</label>
                <div className="input bg-(--bg-soft) cursor-not-allowed">
                  {student.currentSession}
                </div>
              </div>

              <div>
                <label className="text-sm text-(--text-muted)">Class</label>
                <div className="input bg-(--bg-soft) cursor-not-allowed">
                  {classData.filter(c => c.id == student.className).map(c => c.name)}
                </div>
              </div>

              <div>
                <label className="text-sm text-(--text-muted)">Section</label>
                <div className="input bg-(--bg-soft) cursor-not-allowed">
                  {classData.filter(c => c.id == student.className).map(c => 
                    c.sections.filter(sec => sec.id == student.section).map(sec => sec.name)
                  )}
                </div>
              </div>
            </div>
          </section>
          <section className="border border-(--border) rounded-lg p-5 space-y-4">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted) flex items-center gap-2">
              <Calendar size={14} /> Academic History
            </h2>
            {student.academicHistory?.length ? (
              <div className="space-y-4">
                {student.academicHistory
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <div
                      key={i}
                      className="flex gap-4 items-start"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-(--primary) mt-2" />
                        <div className="w-px h-6 bg-(--border)" />
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <span className="font-semibold text-(--text)">
                            {h.session}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded border-2 border-(--border) text-(--text)">
                            {h.action}
                          </span>
                        </div>
                        <p className="text-sm text-(--text-muted)">
                          {classData.filter(c => c.id == h.className).map(c => c.name)}
                          – Section {classData.filter(c => c.id == h.className).map(c => 
                              c.sections.filter(sec => sec.id == h.section).map(sec => sec.name)
                            )}
                        </p>
                        {h.at && (
                          <p className="text-xs text-(--text-muted) mt-1">
                            {new Date(
                              h.at.seconds * 1000
                            ).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-sm text-(--text-muted)">
                No academic history available
              </p>
            )}
          </section>
        </div>
        <div className="space-y-6">
          <section className="border border-(--border) rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted) flex items-center gap-2">
              <Info size={14} /> System Info
            </h2>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-(--text-muted)">
                  App ID
                </span>
                <span className="font-semibold">{student.appId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-(--text-muted)">
                  Password
                </span>
                <span className="font-semibold">{password}</span>
              </div>
            </div>
          </section>
          <section className="border border-(--border) rounded-lg p-5 space-y-3">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted)">
              Actions
            </h2>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Save Changes
            </button>
            <button
              onClick={updatePassword}
              className="btn-outline w-full flex items-center justify-center gap-2"
            >
              <Lock size={16} />
              Reset Password
            </button>
            <button
              onClick={toggleStatus}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded ${
                !isActive ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`
              }`}
            >
              <Power size={16} />
              {isActive ? "Disable Student" : "Activate Student"}
            </button>
          </section>
        </div>
      </div>
      <section className="border border-(--border) rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase text-danger flex items-center gap-2">
          <Shuffle size={14} /> Transfer Student
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="input"
            value={newBranch}
            onChange={e => setNewBranch(e.target.value)}
          >
            <option value="">Select new branch</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            onClick={transferStudent}
            className="btn-outline flex items-center gap-2 justify-center"
          >
            <Shuffle size={16} />
            Transfer Branch
          </button>
        </div>
      </section>
    </div>
  );
}
