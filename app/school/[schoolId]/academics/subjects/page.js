"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layers, Plus, Pencil, Trash2, BookOpen, GraduationCap, Sparkles, Building2 } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import SubjectModal from "@/lib/school/academics/SubjectModal";
import { canManage } from "@/lib/school/permissionUtils";

export default function SubjectsPage() {
  const { schoolUser, loading, setLoading, isLoaded } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [subjects, setSubjects] = useState([]);
  const [openSubjectModal, setOpenSubjectModal] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState(null);

  useEffect(() => {
    if (isLoaded && schoolUser && branch) {
      fetchSubjects(schoolUser.schoolId, branch);
    }
  }, [schoolUser, isLoaded, branch]);

  async function fetchSubjects(currentSchoolId, currentBranch) {
    try {
      setLoading(true);
      const ref = collection(
        db,
        "schools",
        currentSchoolId,
        "branches",
        currentBranch,
        "subjects"
      );
      const snap = await getDoc(doc(ref, "branch_subjects"));
      if (!snap.exists() || !snap.data().subjects) {
        setSubjects([]);
        return;
      }
      setSubjects(snap.data().subjects);
    } catch (err) {
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  }

  const deleteSubject = async (subjectId) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    setLoading(true);
    try {
      await secureAxios.delete('/api/school/academics/subjects', {
        params: { subjectId, branch }
      });
      toast.success("Subject removed from curriculum");
      await fetchSubjects(schoolUser.schoolId, branch);
    } catch (error) {
      toast.error("Error deleting subject");
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "academic.subjects", currentPlan);

  return (
    <RequirePermission permission="academic.subjects.view">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-lg bg-(--primary-soft) text-(--primary)">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Academic Subjects
              </h1>
              <p className="text-xs font-semibold text-(--text-muted)">
                Manage subjects for {branchInfo?.name || "this branch"}
              </p>
            </div>
          </div>
          {editable && (
            <button
              className="btn-primary"
              onClick={() => {
                setSubjectToEdit(null);
                setOpenSubjectModal(true);
              }}
            >
              <Plus size={16} /> Add Subject
            </button>
          )}
        </div>
        {!loading && subjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-(--bg-card) border border-(--border) border-dashed rounded-3xl">
            <div className="p-4 rounded-full bg-(--primary-soft) text-(--primary) mb-4">
              <Layers size={32} />
            </div>
            <p className="text-(--text-muted) font-medium text-sm">No subjects defined in the curriculum yet.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {subjects.map((sub, idx) => (
              <div
                key={sub.id}
                className="group bg-(--bg-card) border border-(--border) rounded-2xl px-5 py-4 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 relative overflow-hidden"
              >
                {/* <div className="absolute -right-2 -top-2 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity">
                  <Sparkles size={80} className="text-(--primary)" />
                </div> */}

                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-(--primary-soft) border border-(--primary-soft) flex items-center justify-center text-(--primary) font-bold">
                      {sub.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-bold text-(--text) leading-tight group-hover:text-(--primary) transition-colors">
                        {sub.name}
                      </h2>
                      <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest">Core Subject</p>
                    </div>
                  </div>

                  {editable && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setSubjectToEdit(sub); setOpenSubjectModal(true); }}
                        className="p-2 text-(--text-muted) hover:text-yellow-500 hover:bg-yellow-500/5 rounded-lg transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteSubject(sub.id)}
                        className="p-2 text-(--text-muted) hover:text-red-500 hover:bg-red-500/5 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-(--border)/50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-(--primary)"></div>
                    <span className="text-[10px] font-bold uppercase text-(--text-muted)">Active</span>
                  </div>
                  <span className="text-[10px] font-bold text-(--primary) bg-(--primary-soft) px-2 py-0.5 rounded uppercase">Theory</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <SubjectModal
          open={openSubjectModal}
          data={subjectToEdit}
          onClose={() => {
            setSubjectToEdit(null);
            setOpenSubjectModal(false)
          }}
          onSuccess={() => fetchSubjects(schoolUser.schoolId, branch)}
        />
      </div>
    </RequirePermission>
  );
}
