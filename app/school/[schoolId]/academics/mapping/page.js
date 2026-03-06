"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Save, Trash2, Search, AlertTriangle, Info, Copy, Users, BookMarked, LayoutGrid, Zap } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { canManage } from "@/lib/school/permissionUtils";

// Simple ID generator for client-side keys
const generateId = () => Math.random().toString(36).substring(2, 11);

export default function SubjectTeacherMappingPage() {
  const { setLoading, schoolUser, classData, employeeData, subjectData } = useSchool();
  const { branch, branchInfo } = useBranch();

  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [bulkMappings, setBulkMappings] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");

  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Metrics
  const validMappings = bulkMappings.filter(m => m.subjectId && m.teacherId);
  const uniqueSubjects = new Set(validMappings.map(m => m.subjectId)).size;
  const uniqueTeachers = new Set(validMappings.map(m => m.teacherId)).size;

  const filteredMappings = bulkMappings.filter(m => {
    if (!searchQuery) return true;
    const sName = subjects.find(s => s.id === m.subjectId)?.name?.toLowerCase() || "";
    const tName = teachers.find(t => t.uid === m.teacherId)?.name?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return sName.includes(query) || tName.includes(query);
  });

  useEffect(() => {
    if (subjectData) setSubjects(subjectData);
    if (employeeData) setTeachers(employeeData);
  }, [subjectData, employeeData]);

  const selectedClass = classData?.find(c => c.id === selectedClassId);
  const sections = selectedClass?.sections || [];

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "timetable.mapping.manage", currentPlan);

  const fetchMapping = async () => {
    if (!selectedClassId || !selectedSectionId) {
      toast.error("Please select a Class and Section first");
      return;
    }
    try {
      setLoading(true);
      const baseRef = collection(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "timetable",
        "items",
        "subjectTeacherMapping"
      );

      const q = query(
        baseRef,
        where("classId", "==", selectedClassId),
        where("sectionId", "==", selectedSectionId)
      );

      const snap = await getDocs(q);
      const docs = snap.docs.map(d => d.data());

      setBulkMappings(docs.map(d => ({
        id: generateId(),
        subjectId: d.subjectId || "",
        teacherId: d.teacherId || "",
      })));
      setIsLoaded(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load mappings");
    } finally {
      setLoading(false);
    }
  };
  const addRow = () => {
    setBulkMappings([
      ...bulkMappings,
      { id: generateId(), subjectId: "", teacherId: "" }
    ]);
  };

  const duplicateRow = (row) => {
    setBulkMappings([
      ...bulkMappings,
      { id: generateId(), subjectId: row.subjectId, teacherId: row.teacherId }
    ]);
  };

  const removeRow = (id) => {
    setBulkMappings(bulkMappings.filter(m => m.id !== id));
  };

  const updateRow = (id, field, value) => {
    setBulkMappings(bulkMappings.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const saveAllMappings = async () => {
    if (!editable) return;

    const invalid = bulkMappings.some(m => !m.subjectId || !m.teacherId);
    if (invalid) {
      toast.error("Please ensure all rows have a subject and teacher");
      return;
    }

    // Check for duplicates
    const seen = new Set();
    let hasDuplicates = false;
    for (const m of bulkMappings) {
      const key = `${m.subjectId}-${m.teacherId}`;
      if (seen.has(key)) hasDuplicates = true;
      seen.add(key);
    }
    if (hasDuplicates) {
      toast.error("A teacher is mapped multiple times to the same subject in this list. Please combine their periods.");
      return;
    }

    try {
      setLoading(true);
      await secureAxios.post("/api/school/academics/subject-mapping", {
        branch,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        mappings: bulkMappings
      });
      toast.success("All mappings saved successfully");
    } catch (err) {
      toast.error("Failed to save mappings: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RequirePermission permission="timetable.mapping.view">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
              <Zap size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Subject–Teacher Mapping
              </h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Optimized bulk assignment
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-(--text-muted)">Class</label>
              <select
                className="input"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId("");
                  setIsLoaded(false);
                }}
              >
                <option value="">Select Class</option>
                {classData && classData.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-(--text-muted)">Section</label>
              <select
                className="input"
                value={selectedSectionId}
                disabled={!selectedClassId}
                onChange={(e) => {
                  setSelectedSectionId(e.target.value);
                  setIsLoaded(false);
                }}
              >
                <option value="">Select Section</option>
                {sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={fetchMapping}
              disabled={!selectedClassId || !selectedSectionId}
              className="btn-primary"
            >
              <Search size={16} /> Load Data
            </button>
          </div>
        </div>

        {!isLoaded && (
          <div className="bg-(--status-m-bg) border border-(--status-m-border) rounded-2xl p-5 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4 items-start">
              <div className="bg-(--status-m-text)/10 p-3 rounded-full text-(--status-m-text) shrink-0">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-(--status-m-text) font-semibold text-base mb-1">
                  How does Subject-Teacher Mapping work?
                </h3>
                <p className="text-(--status-m-text) text-sm leading-relaxed mb-3">
                  This page allows you to define exactly which teacher is responsible for teaching a specific subject to a particular Class and Section. These mappings operate as the foundational rules for generating your timetable.
                </p>
                <ul className="text-sm text-(--status-m-text) space-y-2 list-none p-0">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-(--status-m-text)" />
                    First, select a <strong>Class</strong> and <strong>Section</strong> below to load existing mappings or start fresh.
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-(--status-m-text)" />
                    Then, add rows linking a Subject to a Teacher. You can copy rows if multiple teachers share a subject.
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-(--status-m-text)" />
                    Once saved, these linked teachers will be available to schedule in the Timetable Manager.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {isLoaded && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {bulkMappings.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-(--bg-card) border border-(--border) py-4 px-5 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-(--primary-soft) text-(--primary) rounded-lg">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-(--text-muted) font-medium">Total Mappings</p>
                    <p className="text-2xl font-bold text-(--text)">{bulkMappings.length}</p>
                  </div>
                </div>
                <div className="bg-(--bg-card) border border-(--border) py-4 px-5 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-(--status-i-bg) text-(--status-i-text) rounded-lg">
                    <BookMarked size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-(--text-muted) font-medium">Unique Subjects</p>
                    <p className="text-2xl font-bold text-(--text)">{uniqueSubjects}</p>
                  </div>
                </div>
                <div className="bg-(--bg-card) border border-(--border) py-4 px-5 rounded-xl flex items-center gap-4">
                  <div className="p-3 bg-(--status-m-bg) text-(--status-m-text) rounded-lg">
                    <Users size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-(--text-muted) font-medium">Unique Teachers</p>
                    <p className="text-2xl font-bold text-(--text)">{uniqueTeachers}</p>
                  </div>
                </div>
              </div>
            )}

            {bulkMappings.length > 0 && (
              <div className="flex items-center justify-between hidden">
                <div className="relative max-w-sm w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Search by subject or teacher..."
                    className="input pl-9 w-full bg-(--bg-card) border-(--border)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {filteredMappings.length > 0 ? (
                <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-(--bg) border-b border-(--border)">
                      <tr className="text-left text-(--text-muted)">
                        <th className="px-4 py-3 text-left w-1/3">Subject</th>
                        <th className="px-4 py-3 text-left w-1/2">Teacher</th>
                        {editable && <th className="px-4 py-3 text-right">Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMappings.map((row) => (
                        <tr key={row.id} className="border-b border-(--border) hover:bg-(--bg)/50 transition-colors">
                          <td className="px-4 py-3">
                            <select
                              className="input"
                              value={row.subjectId}
                              disabled={!editable}
                              onChange={(e) => updateRow(row.id, "subjectId", e.target.value)}
                            >
                              <option value="">Select Subject</option>
                              {subjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="input"
                              value={row.teacherId}
                              disabled={!editable}
                              onChange={(e) => updateRow(row.id, "teacherId", e.target.value)}
                            >
                              <option value="">Select Teacher</option>
                              {teachers.map(t => (
                                <option key={t.uid} value={t.uid}>{t.name}</option>
                              ))}
                            </select>
                          </td>
                          {editable && (
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => duplicateRow(row)}
                                  className="p-2 text-(--text-muted) hover:text-(--primary) hover:bg-(--primary-soft) rounded-lg transition-colors"
                                  title="Duplicate mapping"
                                >
                                  <Copy size={16} />
                                </button>
                                <button
                                  onClick={() => removeRow(row.id)}
                                  className="p-2 text-(--text-muted) hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remove mapping"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : bulkMappings.length > 0 ? (
                <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-12 text-center flex flex-col items-center justify-center">
                  <div className="h-16 w-16 bg-(--bg) rounded-full flex items-center justify-center mb-4 text-(--text-muted)">
                    <Search size={24} />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">No mappings found</h3>
                  <p className="text-(--text-muted) text-sm max-w-md mx-auto">
                    We couldn't find any mapped subjects or teachers matching "{searchQuery}".
                  </p>
                  <button onClick={() => setSearchQuery("")} className="mt-4 text-(--primary) text-sm font-medium hover:underline">
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="bg-(--bg-card) border border-dashed border-(--border) rounded-2xl p-12 text-center flex flex-col items-center justify-center group overflow-hidden relative">
                  <div className="absolute inset-0 bg-linear-to-b from-transparent to-(--bg)/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative z-10 w-full flex flex-col items-center">
                    <div className="h-20 w-20 bg-(--primary-soft) rounded-full flex items-center justify-center mb-5 text-(--primary) shadow-inner">
                      <LayoutGrid size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Build Your Mapping</h3>
                    <p className="text-(--text-muted) text-sm max-w-md mx-auto mb-8 leading-relaxed">
                      Link subjects to the teachers responsible for teaching them in this class section. This data is the foundation of your timetable generation.
                    </p>
                    {editable && (
                      <button
                        onClick={addRow}
                        className="btn-primary px-6 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5"
                      >
                        <Plus size={18} className="mr-2" /> Quick Start
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {editable && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={addRow}
                  className="btn-outline flex items-center gap-2 border-dashed border-2 hover:bg-(--bg) w-full sm:w-auto"
                >
                  <Plus size={16} /> Add Subject / Teacher
                </button>

                {bulkMappings.length > 0 && (
                  <button
                    onClick={saveAllMappings}
                    className="btn-primary w-full sm:w-auto px-8"
                  >
                    <Save size={18} /> Save All Mappings
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
