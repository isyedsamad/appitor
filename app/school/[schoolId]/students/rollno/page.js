"use client";
import { useState } from "react";
import { Hash, RefreshCcw, Save, Trash2, ArrowDownAZ } from "lucide-react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

export default function AssignRollPage() {
  const { classData, schoolUser, setLoading } = useSchool();
  const { branchInfo, branch } = useBranch();
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [students, setStudents] = useState([]);
  const [saving, setSaving] = useState(false);
  const selectedClass = classData?.find(c => c.name === className);
  async function loadStudents() {
    if (!className || !section) {
      toast.error("Select class & section");
      return;
    }
    setLoading(true);
    const ref = collection(
      db,
      "schools",
      schoolUser.schoolId,
      "branches",
      branch,
      "students"
    );
    const q = query(
      ref,
      where("className", "==", className),
      where("section", "==", section),
    );
    const snap = await getDocs(q);
    setStudents(
      snap.docs.map(d => ({
        uid: d.id,
        ...d.data(),
      }))
    );
    setLoading(false);
  }
  function updateRoll(uid, value) {
    setStudents(prev =>
      prev.map(s =>
        s.uid === uid ? { ...s, rollNo: value ? Number(value) : null } : s
      )
    );
  }
  function autoAssign() {
    setStudents(prev =>
      prev.map((s, i) => ({ ...s, rollNo: i + 1 }))
    );
  }
  function alphabeticalAssign() {
    const sorted = [...students].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    setStudents(sorted.map((s, i) => ({ ...s, rollNo: i + 1 })));
  }
  function clearAll() {
    setStudents(prev => prev.map(s => ({ ...s, rollNo: null })));
  }
  function hasDuplicates() {
    const nums = students.map(s => s.rollNo).filter(Boolean);
    return new Set(nums).size !== nums.length;
  }
  async function saveRolls() {
    if (hasDuplicates()) {
      toast.error("Duplicate roll numbers found");
      return;
    }
    setSaving(true);
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/assign-roll", {
        className,
        section,
        branch,
        updates: students.map(s => ({
          uid: s.uid,
          rollNo: s.rollNo ?? null,
        })),
      });
      toast.success("Roll numbers updated");
      loadStudents();
    } catch (err) {
      toast.error("Failed: " + err.response.data.message);
    } finally {
      setSaving(false);
      setLoading(false);
    }
  }
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Hash className="text-(--primary)" />
        <div>
          <h1 className="text-lg font-semibold text-(--text)">
            Assign Roll Numbers
          </h1>
          <p className="text-sm text-(--text-muted)">
            Manage roll numbers for a class and section
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <select className="input" value={className} onChange={e => {
          setClassName(e.target.value);
          setSection("");
        }}>
          <option value="">Select Class</option>
          {classData && classData.map(c => (
            <option key={c.name}>{c.name}</option>
          ))}
        </select>
        <select
          className="input"
          disabled={!selectedClass}
          value={section}
          onChange={e => setSection(e.target.value)}
        >
          <option value="">Select Section</option>
          {selectedClass?.sections.map(sec => (
            <option key={sec.id} value={sec.name}>
              {sec.name}
            </option>
          ))}
        </select>
        <button onClick={loadStudents} className="btn-primary">
          Load Students
        </button>
      </div>
      {students.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button onClick={autoAssign} className="btn-outline flex gap-2">
            <RefreshCcw size={16} /> Auto Assign
          </button>
          <button onClick={alphabeticalAssign} className="btn-outline flex gap-2">
            <ArrowDownAZ size={16} /> Alphabetical
          </button>
          <button onClick={clearAll} className="btn-outline flex gap-2">
            <Trash2 size={16} /> Clear
          </button>
        </div>
      )}
      <div className="border border-(--border) rounded-xl overflow-x-auto">
        <table className="min-w-[600px] w-full text-sm">
          <thead className="bg-(--bg-soft)">
            <tr>
              <th className="px-4 py-3 text-left">Roll No</th>
              <th className="px-4 py-3 text-left">Admission ID</th>
              <th className="px-4 py-3 text-left">Name</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => (
              <tr key={s.uid} className="border-t border-(--border)">
                <td className="px-4 py-2">
                  <input
                    type="number"
                    className="input w-20"
                    value={s.rollNo ?? ""}
                    onChange={e => updateRoll(s.uid, e.target.value)}
                  />
                </td>
                <td className="px-4 py-3 text-left font-semibold">{s.appId}</td>
                <td className="px-4 py-3 text-left font-semibold">{s.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {students.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={saveRolls}
            disabled={saving}
            className="btn-primary flex gap-2"
          >
            <Save size={16} /> Save Changes
          </button>
        </div>
      )}
    </div>
  );
}
