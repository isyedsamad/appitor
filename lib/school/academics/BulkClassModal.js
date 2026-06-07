"use client";
import { useState, useEffect } from "react";
import { X, Layers, Plus, Trash2, Sparkles, CheckSquare, Square } from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import { useBranch } from "@/context/BranchContext";

const COMMON_CLASSES = [
  "Play Group", "Nursery", "LKG", "UKG",
  "I", "II", "III", "IV", "V", "VI",
  "VII", "VIII", "IX", "X", "XI", "XII"
];

export default function BulkClassModal({ open, onClose, onSuccess }) {
  const { setLoading, classData } = useSchool();
  const { branch } = useBranch();
  const [selected, setSelected] = useState([]);
  const [classSections, setClassSections] = useState({});
  const existingNames = (classData || []).map(c => c.name.trim().toLowerCase());

  useEffect(() => {
    if (open) {
      const available = COMMON_CLASSES.filter(name => !existingNames.includes(name.toLowerCase()));
      setSelected(available);

      const initialSections = {};
      available.forEach(name => {
        initialSections[name] = [{ name: "A", capacity: 40 }];
      });
      setClassSections(initialSections);
    }
  }, [open, classData]);

  if (!open) return null;

  const toggleClass = (name) => {
    if (existingNames.includes(name.toLowerCase())) return;

    if (selected.includes(name)) {
      setSelected(selected.filter(item => item !== name));
    } else {
      setSelected([...selected, name]);
      if (!classSections[name]) {
        setClassSections(prev => ({
          ...prev,
          [name]: [{ name: "A", capacity: 40 }]
        }));
      }
    }
  };

  const selectAll = () => {
    const available = COMMON_CLASSES.filter(name => !existingNames.includes(name.toLowerCase()));
    setSelected(available);

    const newClassSections = { ...classSections };
    available.forEach(name => {
      if (!newClassSections[name]) {
        newClassSections[name] = [{ name: "A", capacity: 40 }];
      }
    });
    setClassSections(newClassSections);
  };

  const selectNone = () => {
    setSelected([]);
  };

  const addSectionForClass = (className) => {
    const currentSecs = classSections[className] || [{ name: "A", capacity: 40 }];

    let nextChar = "A";
    if (currentSecs.length > 0) {
      const lastSectionName = currentSecs[currentSecs.length - 1].name.trim().toUpperCase();
      if (lastSectionName.length === 1) {
        const code = lastSectionName.charCodeAt(0);
        if (code >= 65 && code < 90) { // A-Y
          nextChar = String.fromCharCode(code + 1);
        }
      }
    }

    setClassSections({
      ...classSections,
      [className]: [...currentSecs, { name: nextChar, capacity: 40 }]
    });
  };

  const updateSectionNameForClass = (className, index, value) => {
    const currentSecs = [...(classSections[className] || [])];
    currentSecs[index].name = value;
    setClassSections({
      ...classSections,
      [className]: currentSecs
    });
  };

  const updateSectionCapacityForClass = (className, index, value) => {
    const currentSecs = [...(classSections[className] || [])];
    currentSecs[index].capacity = value;
    setClassSections({
      ...classSections,
      [className]: currentSecs
    });
  };

  const removeSectionForClass = (className, index) => {
    const currentSecs = classSections[className] || [];
    if (currentSecs.length <= 1) {
      toast.warning("At least one section is required");
      return;
    }
    setClassSections({
      ...classSections,
      [className]: currentSecs.filter((_, i) => i !== index)
    });
  };

  const handleImport = async () => {
    if (selected.length === 0) {
      toast.error("Please select at least one class to import");
      return;
    }

    let hasInvalidSection = false;
    for (const className of selected) {
      const secs = classSections[className] || [];
      if (secs.length === 0 || secs.some(s => !s.name.trim())) {
        hasInvalidSection = true;
        break;
      }
    }

    if (hasInvalidSection) {
      toast.error("Please ensure all sections have a name for the selected classes");
      return;
    }

    setLoading(true);
    try {
      const currentClasses = [...(classData || [])];
      let orderIndex = currentClasses.length;

      const newClasses = selected.map(className => {
        const classId = crypto.randomUUID();
        const secs = classSections[className] || [{ name: "A", capacity: 40 }];
        return {
          id: classId,
          name: className,
          order: orderIndex++,
          isActive: true,
          createdAt: new Date().toISOString(),
          sections: secs.map(sec => ({
            id: crypto.randomUUID(),
            name: sec.name.trim().toUpperCase(),
            capacity: Number(sec.capacity) || 40
          }))
        };
      });

      const updatedClassData = [...currentClasses, ...newClasses];

      await secureAxios.patch("/api/school/academics/classes", {
        branch,
        classData: updatedClassData
      });

      toast.success(`Successfully imported ${newClasses.length} classes!`, {
        theme: "colored"
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Bulk import error:", error);
      toast.error("Error setting up classes: " + (error?.response?.data?.message || error.message), {
        theme: "colored"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-(--bg-card) border border-(--border) rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-(--bg) rounded-t-2xl border-b border-(--border)">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-(--primary-soft) text-(--primary)">
              <Sparkles size={18} className="animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-(--text)">Quick Setup Classes</h2>
              <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-wider">Play Group to XII</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-(--bg-soft) text-(--text-muted) hover:text-(--text) transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">Select Classes to Add</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs font-semibold text-(--primary) hover:text-(--primary-hover) hover:underline"
                >
                  Select All Available
                </button>
                <span className="text-(--border)">|</span>
                <button
                  onClick={selectNone}
                  className="text-xs font-semibold text-(--text-muted) hover:text-(--text) hover:underline"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {COMMON_CLASSES.map(className => {
                const exists = existingNames.includes(className.toLowerCase());
                const isSelected = selected.includes(className);

                return (
                  <div
                    key={className}
                    onClick={() => toggleClass(className)}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${exists
                      ? "bg-(--bg)/60 border-(--border)/40 text-(--text-muted) opacity-50 cursor-not-allowed"
                      : isSelected
                        ? "bg-(--primary-soft) border-(--primary)/50 text-(--primary) cursor-pointer hover:border-(--primary)"
                        : "bg-(--bg-card) border-(--border) text-(--text) cursor-pointer hover:border-(--primary)/30 hover:bg-(--primary-soft)/10"
                      }`}
                  >
                    <span className="text-xs font-semibold">{className}</span>
                    {exists ? (
                      <span className="text-[9px] font-bold uppercase tracking-widest bg-(--border)/30 text-(--text-muted) px-1.5 py-0.5 rounded">
                        Added
                      </span>
                    ) : isSelected ? (
                      <CheckSquare size={14} className="text-(--primary)" />
                    ) : (
                      <Square size={14} className="text-(--text-muted)/50" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {selected.length > 0 && (
            <div className="space-y-4 border-t border-(--border)/50 pt-5">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-(--text-muted)">Configure Sections Per-Class</h3>
                <p className="text-[10px] text-(--text-muted)">Customize sections and capacities individually for each selected class.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-1">
                {selected.map(className => {
                  const classSecs = classSections[className] || [{ name: "A", capacity: 40 }];
                  return (
                    <div key={className} className="bg-(--bg)/40 p-4 rounded-xl border border-(--border)/60 space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-(--border)/30">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-(--primary-soft) text-(--primary) flex items-center justify-center font-bold text-xs font-mono">
                            {className.substring(0, 3)}
                          </div>
                          <span className="text-xs font-bold text-(--text)">Class {className}</span>
                        </div>
                        <button
                          onClick={() => addSectionForClass(className)}
                          className="text-[10px] font-bold uppercase tracking-wider text-(--primary) hover:text-(--primary-hover) hover:underline flex items-center gap-1"
                        >
                          <Plus size={10} /> Add Section
                        </button>
                      </div>

                      <div className="space-y-2">
                        {classSecs.map((sec, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-(--bg-card) p-2 rounded-lg border border-(--border)/40">
                            <div className="flex-1">
                              <label className="text-[8px] font-bold text-(--text-muted) uppercase block">Section</label>
                              <input
                                type="text"
                                className="input py-1 px-2 text-xs bg-(--bg)/30 mt-0.5 font-bold"
                                placeholder="e.g. A"
                                value={sec.name}
                                maxLength={10}
                                onChange={(e) => updateSectionNameForClass(className, idx, e.target.value)}
                              />
                            </div>
                            <div className="w-20">
                              <label className="text-[8px] font-bold text-(--text-muted) uppercase block">Capacity</label>
                              <input
                                type="number"
                                className="input py-1 px-2 text-xs bg-(--bg)/30 mt-0.5"
                                placeholder="40"
                                min={1}
                                value={sec.capacity}
                                onWheel={(e) => e.preventDefault()}
                                onChange={(e) => updateSectionCapacityForClass(className, idx, e.target.value)}
                              />
                            </div>
                            <div className="pt-3">
                              <button
                                onClick={() => removeSectionForClass(className, idx)}
                                disabled={classSecs.length <= 1}
                                className="p-1 text-(--text-muted) hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-t border-(--border) bg-(--bg) rounded-b-2xl">
          <span className="text-xs font-semibold text-(--text-muted)">
            {selected.length} class{selected.length !== 1 && "es"} selected to import
          </span>
          <div className="flex gap-2">
            <button className="btn-outline font-semibold text-xs" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn-primary font-semibold text-xs flex items-center gap-1 bg-(--primary) hover:bg-(--primary-hover)"
              onClick={handleImport}
              disabled={selected.length === 0}
            >
              <Sparkles size={13} />
              Setup Classes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
