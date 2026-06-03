"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Info,
  CheckCircle2,
  LayoutTemplate,
  Users,
  Search,
  X,
  UserCheck
} from "lucide-react";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";

export default function FeeTemplatesPage() {
  const { schoolUser, setLoading, classData, currentSession } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [heads, setHeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [gridData, setGridData] = useState({});
  const [autoAssign, setAutoAssign] = useState(true);
  const [selectiveAssignments, setSelectiveAssignments] = useState({});
  const [classStudentsList, setClassStudentsList] = useState({});

  const [savingStatus, setSavingStatus] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successStats, setSuccessStats] = useState({ templatesSaved: 0, studentsAssigned: 0 });

  const [columnFillValue, setColumnFillValue] = useState({});

  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState(null);
  const [tempSelection, setTempSelection] = useState([]);
  const [selectorSearch, setSelectorSearch] = useState("");

  const fetchHeads = async () => {
    if (!schoolUser || !branch) return;
    const ref = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "heads", "items");
    const snap = await getDocs(query(ref, orderBy("createdAt", "desc")));
    const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const orderKey = `fee_heads_order_${schoolUser.uid}_${branch}`;
    const savedOrder = localStorage.getItem(orderKey);
    if (savedOrder) {
      const orderedIds = JSON.parse(savedOrder);
      fetched.sort((a, b) => {
        const indexA = orderedIds.indexOf(a.id);
        const indexB = orderedIds.indexOf(b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
    }
    setHeads(fetched);
  };

  const fetchTemplates = async () => {
    if (!schoolUser || !branch) return;
    const ref = collection(db, "schools", schoolUser.schoolId, "branches", branch, "fees", "templates", "items");
    const snap = await getDocs(ref);
    setTemplates(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const fetchStudentsRoster = async () => {
    if (!classData || !schoolUser || !branch) return;
    setLoading(true);
    const studentsMap = {};
    for (const cls of classData) {
      let clsStds = [];
      if (cls.sections && cls.sections.length > 0) {
        const promises = cls.sections.map(sec =>
          getDoc(doc(db, "schools", schoolUser.schoolId, "branches", branch, "meta", `${cls.id}_${sec.id}_${currentSession}`))
        );
        try {
          const snaps = await Promise.all(promises);
          snaps.forEach((snap, idx) => {
            const sec = cls.sections[idx];
            if (snap.exists() && snap.data().students) {
              const mapped = snap.data().students.map(s => ({
                id: s.uid,
                name: s.name,
                appId: s.appId,
                rollNo: s.rollNo,
                sectionName: sec.name,
                sectionId: sec.id,
                className: cls.id,
                section: sec.id
              }));
              clsStds = [...clsStds, ...mapped];
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
      studentsMap[cls.id] = clsStds;
    }
    setClassStudentsList(studentsMap);
    setLoading(false);
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([fetchHeads(), fetchTemplates()]);
    setLoading(false);
  };

  useEffect(() => {
    if (branch && schoolUser) {
      loadData();
    }
  }, [branch, schoolUser]);

  useEffect(() => {
    if (branch && schoolUser && classData && classData.length > 0 && currentSession) {
      fetchStudentsRoster();
    }
  }, [branch, schoolUser, classData, currentSession]);

  const activeFixedHeads = useMemo(() => {
    return heads.filter(h => h.status === "active" && h.type === "fixed");
  }, [heads]);

  useEffect(() => {
    if (classData && activeFixedHeads.length > 0) {
      const data = {};
      classData.forEach(c => {
        data[c.id] = {};
        activeFixedHeads.forEach(h => {
          const match = templates.find(t => t.className === c.id && t.status === "active" && !t.section);
          const val = match?.items.find(item => item.headId === h.id)?.amount;
          data[c.id][h.id] = val !== undefined ? String(val) : "";
        });
      });
      setGridData(data);
    }
  }, [classData, activeFixedHeads, templates]);

  const handleCellChange = (classId, headId, value) => {
    if (value !== "" && (isNaN(Number(value)) || Number(value) < 0)) return;
    setGridData(prev => ({
      ...prev,
      [classId]: {
        ...(prev[classId] || {}),
        [headId]: value
      }
    }));
  };

  const fillColumn = (headId) => {
    const fillVal = columnFillValue[headId] || "";
    if (fillVal !== "" && (isNaN(Number(fillVal)) || Number(fillVal) < 0)) return;
    setGridData(prev => {
      const copy = { ...prev };
      classData.forEach(c => {
        if (!copy[c.id]) copy[c.id] = {};
        copy[c.id][headId] = fillVal;
      });
      return copy;
    });
    toast.success("Column values filled");
  };

  const openStudentSelector = (classId, headId, headName, className) => {
    setSelectedCell({ classId, headId, headName, className });
    const students = classStudentsList[classId] || [];
    const existingSelection = selectiveAssignments[classId]?.[headId];
    if (existingSelection) {
      setTempSelection(existingSelection);
    } else {
      setTempSelection(students.map(s => s.id));
    }
    setSelectorSearch("");
    setSelectorOpen(true);
  };

  const toggleStudentSelection = (studentId) => {
    setTempSelection(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllStudents = () => {
    const students = classStudentsList[selectedCell.classId] || [];
    setTempSelection(students.map(s => s.id));
  };

  const deselectAllStudents = () => {
    setTempSelection([]);
  };

  const saveSelectorSelection = () => {
    setSelectiveAssignments(prev => ({
      ...prev,
      [selectedCell.classId]: {
        ...(prev[selectedCell.classId] || {}),
        [selectedCell.headId]: tempSelection
      }
    }));
    setSelectorOpen(false);
    setSelectedCell(null);
  };

  const filteredSelectorStudents = useMemo(() => {
    if (!selectedCell) return [];
    const students = classStudentsList[selectedCell.classId] || [];
    if (!selectorSearch.trim()) return students;
    const term = selectorSearch.toLowerCase();
    return students.filter(
      s => s.name.toLowerCase().includes(term) || String(s.appId).toLowerCase().includes(term)
    );
  }, [selectedCell, classStudentsList, selectorSearch]);

  const handleSaveAndApply = async () => {
    if (!classData || classData.length === 0) return;
    let valid = true;
    Object.values(gridData).forEach(row => {
      Object.values(row).forEach(cell => {
        if (cell !== "" && isNaN(Number(cell))) {
          valid = false;
        }
      });
    });
    if (!valid) {
      toast.error("Please enter valid positive numbers for amounts");
      return;
    }

    setLoading(true);
    setSavingStatus("Initializing setup...");
    let savedCount = 0;
    let assignedCount = 0;

    try {
      for (const cls of classData) {
        setSavingStatus(`Processing ${cls.name}...`);
        const classStudents = classStudentsList[cls.id] || [];
        if (classStudents.length === 0) continue;

        const studentFeeProfiles = classStudents.map(std => {
          const studentItems = [];
          activeFixedHeads.forEach(h => {
            const amt = gridData[cls.id]?.[h.id];
            if (amt !== undefined && amt !== "") {
              const selectiveList = selectiveAssignments[cls.id]?.[h.id];
              if (selectiveList) {
                if (selectiveList.includes(std.id)) {
                  studentItems.push({
                    headId: h.id,
                    headName: h.name,
                    amount: Number(amt),
                    frequency: h.frequency
                  });
                }
              } else {
                studentItems.push({
                  headId: h.id,
                  headName: h.name,
                  amount: Number(amt),
                  frequency: h.frequency
                });
              }
            }
          });
          return { student: std, items: studentItems };
        });

        const groups = {};
        studentFeeProfiles.forEach(profile => {
          if (profile.items.length === 0) return;
          const sortedHeadIds = profile.items.map(item => item.headId).sort().join("_");
          if (!groups[sortedHeadIds]) {
            groups[sortedHeadIds] = {
              items: profile.items,
              students: []
            };
          }
          groups[sortedHeadIds].students.push(profile.student);
        });

        const uniqueGroupKeys = Object.keys(groups);
        if (uniqueGroupKeys.length === 0) continue;

        let standardGroupKey = "";
        let maxCount = 0;
        uniqueGroupKeys.forEach(k => {
          if (groups[k].students.length > maxCount) {
            maxCount = groups[k].students.length;
            standardGroupKey = k;
          }
        });

        for (const k of uniqueGroupKeys) {
          const group = groups[k];
          let templateName = "";
          if (k === standardGroupKey) {
            templateName = `Default ${cls.name} Standard Fee`;
          } else {
            const optionalNames = [];
            const standardHeadIds = standardGroupKey.split("_");
            group.items.forEach(item => {
              if (!standardHeadIds.includes(item.headId)) {
                optionalNames.push(item.headName);
              }
            });
            if (optionalNames.length > 0) {
              templateName = `${cls.name} - with ${optionalNames.join(", ")}`;
            } else {
              templateName = `${cls.name} - Custom Set`;
            }
          }

          setSavingStatus(`Saving template: ${templateName}...`);
          const existing = templates.find(t => t.className === cls.id && t.name === templateName && t.status === "active" && !t.section);
          let templateId = "";
          if (existing) {
            templateId = existing.id;
            await secureAxios.patch("/api/school/fees/templates", {
              branch,
              templateId: existing.id,
              updates: {
                name: templateName,
                items: group.items
              }
            });
          } else {
            const res = await secureAxios.post("/api/school/fees/templates", {
              branch,
              name: templateName,
              className: cls.id,
              section: null,
              academicYear: currentSession,
              items: group.items
            });
            templateId = res.data.id;
          }

          savedCount++;

          if (autoAssign) {
            setSavingStatus(`Assigning students to ${templateName}...`);
            await secureAxios.post("/api/school/fees/assignments", {
              branch,
              session: currentSession,
              students: group.students,
              templateId,
              templateName
            });
            assignedCount += group.students.length;
          }
        }
      }

      setSuccessStats({ templatesSaved: savedCount, studentsAssigned: assignedCount });
      setShowSuccessModal(true);
      await fetchTemplates();
    } catch (err) {
      toast.error("An error occurred while saving the fee configuration");
      console.error(err);
    } finally {
      setLoading(false);
      setSavingStatus(null);
    }
  };

  return (
    <RequirePermission permission="fee.setup.view">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl border border-(--primary)/20 bg-(--primary-soft) text-(--primary) shadow-sm">
              <LayoutTemplate size={24} className="fill-current opacity-90" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-(--text)">Fee Templates</h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Define class-wise standard fee setups for {branchInfo?.name}
              </p>
            </div>
          </div>
          <div className="bg-(--bg-card) border border-(--border) px-4 py-2 rounded-xl flex items-center gap-2">
            <div className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">Session</div>
            <div className="h-4 w-[1px] bg-(--border)" />
            <div className="text-xs font-bold text-(--primary)">{currentSession}</div>
          </div>
        </div>

        <div className="bg-(--bg-card) border border-(--border) rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
          <div className="p-3 bg-(--status-m-bg) rounded-xl text-(--status-m-text) shrink-0 border border-(--status-m-border)">
            <Info size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-(--text)">Unified Class Fee Grid</h3>
            <p className="text-xs text-(--text-muted) leading-relaxed mt-0.5">
              Enter the standard amount (in ₹) for each class. Leave cell empty if a class does not pay a specific fee.
              Optional fees can be assigned to select students by clicking the user selection icon inside the cell.
            </p>
          </div>
        </div>

        <div className="bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-(--bg) text-(--text-muted) border-b border-(--border)">
                <tr>
                  <th className="px-5 py-4 text-left font-bold uppercase tracking-wider min-w-[160px]">Class</th>
                  {activeFixedHeads.map(h => (
                    <th key={h.id} className="px-4 py-3 min-w-[160px] border-l border-(--border)">
                      <div className="text-center font-bold text-(--text) block">{h.name}</div>
                      <div className="text-[10px] text-center text-(--text-muted) uppercase font-bold tracking-wider mt-0.5">({h.frequency})</div>
                      <div className="mt-3 flex items-center justify-center gap-1.5 max-w-[150px] mx-auto">
                        <input
                          type="number"
                          className="input text-center h-8 py-0 px-2 text-xs w-20 bg-(--bg-card)"
                          placeholder="₹ All"
                          value={columnFillValue[h.id] || ""}
                          onChange={e => setColumnFillValue({ ...columnFillValue, [h.id]: e.target.value })}
                        />
                        <button
                          onClick={() => fillColumn(h.id)}
                          className="h-8 px-2 bg-(--bg-card) rounded border border-(--border) hover:bg-(--primary-soft) text-[11px] font-bold"
                        >
                          Fill
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {classData && classData.map(cls => {
                  const students = classStudentsList[cls.id] || [];
                  const studentCount = students.length;
                  return (
                    <tr key={cls.id} className="hover:bg-(--bg)/20 transition">
                      <td className="px-5 py-4 font-bold text-(--text) text-left min-w-[160px]">
                        <div>{cls.name}</div>
                        <div className="text-[10px] text-(--text-muted) font-semibold mt-0.5">
                          {studentCount} Students
                        </div>
                      </td>
                      {activeFixedHeads.map(h => {
                        const amt = gridData[cls.id]?.[h.id] || "";
                        const selections = selectiveAssignments[cls.id]?.[h.id];
                        const selectedCount = selections ? selections.length : studentCount;
                        const isCustomized = selections !== undefined && selections.length !== studentCount;
                        return (
                          <td key={h.id} className="px-4 py-2 text-center border-l border-(--border)">
                            <div className="relative flex items-center justify-center max-w-[130px] mx-auto gap-1">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-(--text-muted)">₹</span>
                                <input
                                  type="number"
                                  className="input border-1 pl-5 pr-1 text-sm font-semibold h-9 w-full text-center"
                                  placeholder="0"
                                  value={amt}
                                  onChange={e => handleCellChange(cls.id, h.id, e.target.value)}
                                />
                              </div>
                              <button
                                onClick={() => openStudentSelector(cls.id, h.id, h.name, cls.name)}
                                className={`px-1.5 py-2.5 rounded-md border border-(--border) transition-all duration-200 flex items-center gap-1 shrink-0 ${isCustomized
                                  ? "bg-(--status-o-bg) text-(--status-o-text) border-(--status-o-border)"
                                  : "bg-(--bg-card) text-(--text-muted) hover:bg-(--primary-soft) hover:text-(--primary)"
                                  }`}
                                title="Assign to specific students"
                              >
                                <UserCheck size={12} />
                                <span className="text-[10px] font-semibold">{isCustomized ? `${selectedCount.toString().padStart(2, '0')}` : "All"}</span>
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-(--bg-card) border border-(--border) rounded-2xl p-5 shadow-xs mt-6">
          <label className="flex items-center gap-3.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-(--border) text-(--primary) focus:ring-(--primary) bg-(--bg) w-5 h-5 cursor-pointer"
              checked={autoAssign}
              onChange={e => setAutoAssign(e.target.checked)}
            />
            <div>
              <span className="text-sm font-bold text-(--text)">Apply setup to current students</span>
              <p className="text-[11px] text-(--text-muted) font-semibold mt-0.5">Automatically register these default setups for all enrolled students.</p>
            </div>
          </label>
          <button
            onClick={handleSaveAndApply}
            className="btn-primary flex items-center gap-2 font-bold shadow-md shadow-(--primary)/10"
          >
            Save & Apply Fees
          </button>
        </div>

        {savingStatus && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="w-full max-w-sm bg-(--bg-card) border border-(--border) rounded-2xl shadow-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="loading border-t-(--primary)" />
              <h3 className="font-bold text-(--text)">Saving Fee Configuration</h3>
              <p className="text-xs text-(--text-muted) font-semibold">{savingStatus}</p>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-(--bg-card) border border-(--border) rounded-2xl shadow-2xl overflow-hidden flex flex-col items-center p-8 text-center relative">
              <div className="w-14 h-14 bg-(--status-p-bg) rounded-full flex items-center justify-center mb-5 border border-(--status-p-border)">
                <CheckCircle2 size={24} className="text-(--status-p-text)" />
              </div>
              <h3 className="text-lg font-bold text-(--status-p-text)">Setup Configured Successfully!</h3>
              <p className="text-xs font-semibold text-(--text-muted) mt-2 max-w-xs leading-relaxed">
                Standard fees and class templates have been processed.
              </p>
              <div className="w-full bg-(--bg) border border-(--border) rounded-xl p-4 my-5 space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-(--text-muted) font-semibold">Templates Saved/Updated</span>
                  <span className="font-bold text-(--text)">{successStats.templatesSaved}</span>
                </div>
                {autoAssign && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-(--text-muted) font-semibold">Students Assigned</span>
                    <span className="font-bold text-(--text)">{successStats.studentsAssigned}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full btn-primary font-bold justify-center py-2.5"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {selectorOpen && selectedCell && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-(--bg-card) border border-(--border) rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
              <div className="p-5 border-b border-(--border) flex justify-between items-center bg-(--bg) rounded-t-xl">
                <div>
                  <h3 className="font-bold text-(--text) text-sm uppercase tracking-wider">Assign {selectedCell.headName}</h3>
                  <p className="text-xs text-(--text-muted) font-semibold mt-0.5">{selectedCell.className} · Select students charged this fee</p>
                </div>
                <button
                  onClick={() => {
                    setSelectorOpen(false);
                    setSelectedCell(null);
                  }}
                  className="p-1.5 hover:bg-(--bg) rounded-full text-(--text-muted) transition"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 border-b border-(--border) flex flex-col sm:flex-row gap-3 items-center justify-between bg-(--bg)/30">
                <div className="relative w-full sm:max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)">
                    <Search size={14} />
                  </span>
                  <input
                    type="text"
                    className="input pl-9 h-9 text-xs"
                    placeholder="Search by name or Admission ID..."
                    value={selectorSearch}
                    onChange={e => setSelectorSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                  <button
                    onClick={selectAllStudents}
                    className="px-2.5 py-1.5 text-[11px] font-bold border border-(--border) rounded hover:bg-(--primary-soft) hover:text-(--primary)"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllStudents}
                    className="px-2.5 py-1.5 text-[11px] font-bold border border-(--border) rounded hover:bg-(--primary-soft) hover:text-(--primary)"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[45vh]">
                {filteredSelectorStudents.map(std => {
                  const isChecked = tempSelection.includes(std.id);
                  return (
                    <label
                      key={std.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition cursor-pointer select-none ${
                        isChecked
                          ? "bg-(--primary-soft)/40 border-(--primary)/30"
                          : "border-(--border) hover:bg-(--bg)/40"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          className="rounded border-(--border) text-(--primary) focus:ring-(--primary) bg-(--bg) w-4.5 h-4.5 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleStudentSelection(std.id)}
                        />
                        <div>
                          <p className="text-xs font-bold text-(--text) capitalize">{std.name}</p>
                          <p className="text-[10px] text-(--text-muted) font-semibold mt-0.5">
                            ID: {std.appId} {std.rollNo ? `· Roll: ${std.rollNo}` : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-(--status-m-bg) text-(--status-m-text) border border-(--status-m-border) px-2 py-0.5 rounded uppercase">
                        {std.sectionName}
                      </span>
                    </label>
                  );
                })}
                {filteredSelectorStudents.length === 0 && (
                  <p className="p-8 text-center text-xs text-(--text-muted) font-semibold">
                    No students found matching your search.
                  </p>
                )}
              </div>

              <div className="p-4 border-t border-(--border) flex justify-between items-center bg-(--bg) rounded-b-xl">
                <span className="text-xs font-bold text-(--text-muted)">
                  {tempSelection.length} of {classStudentsList[selectedCell.classId]?.length || 0} students selected
                </span>
                <div className="flex gap-2.5">
                  <button
                    className="px-4 py-2 border border-(--border) rounded-md text-xs font-bold bg-(--bg-card) hover:bg-(--bg)"
                    onClick={() => {
                      setSelectorOpen(false);
                      setSelectedCell(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary text-xs font-bold px-4 py-2"
                    onClick={saveSelectorSelection}
                  >
                    Save Selection
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
