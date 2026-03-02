"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Settings2, Check, X, RefreshCw, Layers } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import ClassModal from "@/lib/school/academics/ClassModal";
import SectionModal from "@/lib/school/academics/SectionModal";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { canManage } from "@/lib/school/permissionUtils";

export default function ClassesPage() {
  const { schoolUser, loading, setLoading, isLoaded, loadClasses, classData } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [classes, setClasses] = useState([]);
  const [isOrderingMode, setIsOrderingMode] = useState(false);
  const [openClassModal, setOpenClassModal] = useState(false);
  const [openSectionModal, setOpenSectionModal] = useState(null);
  const [classToEdit, setClassToEdit] = useState(null);
  const [sectionToEdit, setSectionToEdit] = useState(null);

  useEffect(() => {
    if (classData) setClasses([...classData]);
  }, [classData]);


  const moveClass = (index, direction) => {
    const newClasses = [...classes];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newClasses.length) return;
    [newClasses[index], newClasses[targetIndex]] = [newClasses[targetIndex], newClasses[index]];
    const finalized = newClasses.map((cls, idx) => ({ ...cls, order: idx }));
    setClasses(finalized);
  };

  const saveOrder = async () => {
    setLoading(true);
    try {
      await secureAxios.patch('/api/school/academics/classes', {
        branch,
        classData: classes
      });
      toast.success("Display order saved successfully");
      setIsOrderingMode(false);
    } catch (error) {
      toast.error("Failed to save order");
    } finally {
      setLoading(false);
    }
  };

  const deleteClass = async (classId) => {
    if (!confirm('Are you sure you want to delete this class? This will remove all associated sections.')) return;
    setLoading(true);
    try {
      await secureAxios.delete('/api/school/academics/classes', {
        params: { classId, branch }
      });
      toast.success("Class deleted");
    } catch (error) {
      toast.error("Error deleting class");
    } finally {
      setLoading(false);
    }
  };

  const deleteSection = async (secId, classId) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    setLoading(true);
    try {
      await secureAxios.delete('/api/school/academics/sections', {
        params: { classId, secId, branch }
      });
      toast.success("Section deleted");
    } catch (error) {
      toast.error("Error deleting section");
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "academic.classes", currentPlan);

  return (
    <RequirePermission permission="academic.classes.view">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg bg-(--primary-soft) text-(--primary)">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Academic Classes
              </h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Manage structure and hierarchy for {branchInfo?.name || "this branch"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {editable && (
              <>
                {isOrderingMode ? (
                  <div className="flex items-center gap-2 w-full">
                    <button
                      onClick={() => {
                        setClasses([...classData]);
                        setIsOrderingMode(false);
                      }}
                      className="btn-outline"
                    >
                      <X size={16} /> Cancel
                    </button>
                    <button
                      onClick={saveOrder}
                      className="btn-primary"
                    >
                      <Check size={16} /> Save Order
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 w-full">
                    {classes.length > 0 && <button
                      onClick={() => setIsOrderingMode(true)}
                      className="btn-outline"
                    >
                      <Settings2 size={16} /> Edit Order
                    </button>}
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setClassToEdit(null);
                        setOpenClassModal(true);
                      }}
                    >
                      <Plus size={16} /> Add Class
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {!loading && classes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-(--bg-card) border border-(--border) border-dashed rounded-3xl">
            <div className="p-4 rounded-full bg-(--bg-soft) text-(--text-muted) mb-4">
              <Layers size={32} />
            </div>
            <p className="text-(--text-muted) font-medium text-sm">No classes found in this branch.</p>
            {editable && (
              <button
                onClick={() => setOpenClassModal(true)}
                className="mt-4 text-(--primary) text-xs font-semibold uppercase tracking-wider hover:underline"
              >
                Create your first class
              </button>
            )}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {classes.map((cls, idx) => (
              <div
                key={cls.id}
                className={`group relative bg-(--bg-card) border border-(--border) rounded-2xl overflow-hidden transition-all duration-300 ${isOrderingMode ? 'ring-2 ring-(--primary-soft) ring-offset-4 ring-offset-(--bg)' : 'hover:shadow-xl hover:shadow-(--primary-soft)/5'}`}
              >
                {isOrderingMode && (
                  <div className="absolute inset-x-0 top-0 z-10 p-2 flex justify-center gap-2 bg-gradient-to-b from-black/20 to-transparent">
                    <button
                      onClick={() => moveClass(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-white/90 text-slate-800 shadow-sm disabled:opacity-30 hover:bg-white"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveClass(idx, 1)}
                      disabled={idx === classes.length - 1}
                      className="p-1.5 rounded-lg bg-white/90 text-slate-800 shadow-sm disabled:opacity-30 hover:bg-white"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-(--bg-soft) border border-(--border) flex items-center justify-center text-(--primary) font-bold text-lg">
                        {idx + 1}
                      </div>
                      <div>
                        <h2 className="font-bold text-(--text) leading-tight">
                          {cls.name.toLowerCase().includes('class') ? '' : 'Class '}{cls.name}
                        </h2>
                        <span className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest bg-(--bg-soft) px-2 py-0.5 rounded border border-(--border)">
                          ID: {idx + 1}
                        </span>
                      </div>
                    </div>

                    {!isOrderingMode && editable && (
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setClassToEdit(cls); setOpenClassModal(true); }}
                          className="p-2 text-(--text-muted) hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteClass(cls.id)}
                          className="p-2 text-(--text-muted) hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 max-h-[160px] overflow-y-auto scrollbar-hide">
                    {cls.sections?.length > 0 ? (
                      cls.sections.map(sec => (
                        <div key={sec.id} className="flex justify-between items-center p-3 rounded-xl bg-(--bg)/50 border border-(--border) transition-all group/sec">
                          <div>
                            <p className="text-xs font-bold text-(--text)">Section {sec.name}</p>
                            <p className="text-[10px] text-(--text-muted) font-semibold uppercase">Capacity: {sec.capacity}</p>
                          </div>
                          {editable && !isOrderingMode && (
                            <div className="flex gap-1 opacity-0 group-hover/sec:opacity-100">
                              <button
                                onClick={() => { setSectionToEdit(sec); setOpenSectionModal(cls); }}
                                className="p-1.5 text-(--text-muted) hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => deleteSection(sec.id, cls.id)}
                                className="p-1.5 text-(--text-muted) hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-[10px] text-(--text-muted) italic text-center py-2">No sections defined.</p>
                    )}
                  </div>

                  {editable && !isOrderingMode && (
                    <button
                      onClick={() => { setSectionToEdit(null); setOpenSectionModal(cls); }}
                      className="w-full bg-(--bg) py-2.5 rounded-xl border border-dashed border-(--border) text-(--text-muted) text-xs font-bold hover:border-(--primary-soft) hover:text-(--primary) transition-all flex items-center justify-center gap-2"
                    >
                      <Plus size={14} /> Add Section
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <ClassModal
          open={openClassModal}
          data={classToEdit}
          onClose={() => { setClassToEdit(null); setOpenClassModal(false); }}
          onSuccess={fetchClasses}
        />

        <SectionModal
          open={openSectionModal !== null}
          classDataPage={openSectionModal}
          sectionData={sectionToEdit}
          onClose={() => { setSectionToEdit(null); setOpenSectionModal(null); }}
          onSuccess={fetchClasses}
        />
      </div>
    </RequirePermission>
  );
}
