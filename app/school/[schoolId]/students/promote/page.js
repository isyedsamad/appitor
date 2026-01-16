"use client";

import { useState } from "react";
import {
  Users,
  CheckSquare,
  Square,
  ArrowUp,
  ChevronDown,
  TrainTrack,
  ChartNoAxesColumn,
  ChartNoAxesCombined,
} from "lucide-react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import PromotionPreviewModal from "@/components/school/students/PromotionPreviewModal";

export default function PromoteDemotePage() {
  const { classData, setLoading } = useSchool();
  const { branchInfo } = useBranch();
  const [fromClass, setFromClass] = useState("");
  const [fromSection, setFromSection] = useState("");
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState([]);
  const [toClass, setToClass] = useState("");
  const [toSection, setToSection] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const sourceClass = classData?.find(c => c.id === fromClass);
  const targetClass = classData?.find(c => c.id === toClass);
  async function loadStudents() {
    if (!fromClass || !fromSection) {
      toast.error("Select class and section");
      return;
    }
    setLoading(true);
    try {
      const rosterRef = doc(
        db,
        "schools",
        branchInfo.schoolId,
        "branches",
        branchInfo.id,
        "meta",
        `${fromClass}_${fromSection}`
      );
  
      const snap = await getDoc(rosterRef);
      if (!snap.exists()) {
        setStudents([]);
      } else {
        const data = snap.data();
        const classId = data.classId;
        const sectionId = data.sectionId;
        const students = (data.students || []).map((s) => ({
          ...s,
          classId,
          sectionId,
        }));
        setStudents(students);
      }
      setSelected([]);
    } catch (err) {
      console.error("LOAD STUDENTS META ERROR:", err);
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  }
  function toggle(uid) {
    setSelected(prev =>
      prev.includes(uid)
        ? prev.filter(id => id !== uid)
        : [...prev, uid]
    );
  }
  function toggleAll() {
    if (selected.length === students.length) {
      setSelected([]);
    } else {
      setSelected(students.map(s => s.uid));
    }
  }
  async function promote() {
    if (!selected.length) {
      toast.error("Select students");
      return;
    }
    if (!toClass || !toSection) {
      toast.error("Select target class & section");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.put("/api/school/students/promote", {
        uids: selected,
        toClass,
        toSection,
      });
      toast.success("Students promoted");
      loadStudents();
    } catch(err) {
      toast.error("failed: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  async function handleSessionPromotion(toSession) {
    const sure = confirm('Promote ALL students to next class? Cannot be undone!');
    if(!sure) return;
    setLoading(true);
    try {
      await secureAxios.put(
        "/api/school/students/promote-session", 
        { toSession }
      );
      toast.success("Session promoted successfully");
      setPreviewOpen(false);
    } catch (err) {
      toast.error(
        'Error: ' + err?.response?.data?.message ||
          "Promotion failed"
      );
    } finally {
      setLoading(false);
    }
  }  
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-start md:justify-between items-center">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
          <ChartNoAxesCombined size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-(--text)">
            Promote / Demote Students
          </h1>
          <p className="text-sm text-(--text-muted)">
            Load students, select them, then move to a new class
          </p>
        </div>
      </div>
      <button
        onClick={() => setPreviewOpen(true)}
        className="btn-outline flex items-center gap-2"
      >
        <ArrowUp size={16} />
        Promote Entire Session
      </button>
      </div>
      <div className="flex flex-wrap gap-3 items-end">
        <select
          className="input w-40"
          value={fromClass}
          onChange={e => {
            setFromClass(e.target.value);
            setFromSection("");
          }}
        >
          <option value="">Class</option>
          {classData?.map(c => (
            <option key={c.name} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          className="input w-32"
          value={fromSection}
          disabled={!sourceClass}
          onChange={e => setFromSection(e.target.value)}
        >
          <option value="">Section</option>
          {sourceClass?.sections.map(sec => (
            <option key={sec.id} value={sec.id}>
              {sec.name}
            </option>
          ))}
        </select>
        <button onClick={loadStudents} className="btn-primary">
          Load Students
        </button>
      </div>
      <div className="border border-(--border) rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-(--bg-soft)">
            <tr>
              <th className="px-4 py-3 w-10">
                <button onClick={toggleAll}>
                  {selected.length === students.length &&
                  students.length > 0 ? (
                    <CheckSquare size={16} />
                  ) : (
                    <Square size={16} />
                  )}
                </button>
              </th>
              <th className="px-4 py-3">Admission ID</th>
              <th className="px-4 py-3">Name</th>
            </tr>
          </thead>
          <tbody>
            {students.map(s => {
              const isSelected = selected.includes(s.uid);
              return (
                <tr
                  key={s.uid}
                  onClick={() => toggle(s.uid)}
                  className={`border-t border-(--border) cursor-pointer ${
                    isSelected
                      ? "bg-primary/10"
                      : "hover:bg-(--bg-soft)"
                  }`}
                >
                  <td className="px-4">
                    {isSelected ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-medium">
                    {s.appId}
                  </td>
                  <td className="text-center px-4 py-3 font-semibold capitalize">{s.name}</td>
                </tr>
              );
            })}
            {!students.length && (
              <tr>
                <td
                  colSpan="3"
                  className="py-10 text-center text-(--text-muted)"
                >
                  No students loaded
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {selected.length > 0 && (
        <div className="sticky bottom-4 z-20">
          <div className="max-w-4xl mx-auto bg-(--bg) border border-(--border) rounded-xl p-4 shadow-lg flex flex-wrap gap-3 items-center justify-between">
            <span className="text-sm text-(--text-muted)">
              {selected.length} selected
            </span>
            <div className="flex flex-wrap gap-3 items-center">
              <select
                className="input w-36"
                value={toClass}
                onChange={e => {
                  setToClass(e.target.value);
                  setToSection("");
                }}
              >
                <option value="">Target Class</option>
                {classData?.map(c => (
                  <option key={c.name} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="input w-32"
                disabled={!targetClass}
                value={toSection}
                onChange={e => setToSection(e.target.value)}
              >
                <option value="">Section</option>
                {targetClass?.sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
              <button
                onClick={promote}
                className="btn-primary flex items-center gap-2"
              >
                <ArrowUp size={16} />
                Promote
              </button>
            </div>
          </div>
        </div>
      )}
      {previewOpen && (
        <PromotionPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          onConfirm={handleSessionPromotion}
        />
      )}
    </div>
  );
}
