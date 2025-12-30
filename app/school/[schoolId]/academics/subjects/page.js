"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import ClassModal from "@/lib/school/academics/ClassModal";
import SectionModal from "@/lib/school/academics/SectionModal";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import SubjectModal from "@/lib/school/academics/SubjectModal";

export default function ClassesPage() {
  const { schoolUser, loading, setLoading, isLoaded } = useSchool();
  const { branch } = useBranch();
  const [subjects, setSubjects] = useState([]);
  const [openSubjectModal, setOpenSubjectModal] = useState(false);
  const [openSectionModal, setOpenSectionModal] = useState(null);
  const [schoolId, setSchoolId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [subjectData, setSubjectData] = useState(null);
  const [sectionData, setSectionData] = useState(null);
  useEffect(() => {
    if(isLoaded && schoolUser && branch) {
        setSchoolId(schoolUser.schoolId);
        setBranchId(branch);
        setLoading(true);
        fetchSubjects(schoolUser.schoolId, branch)
    }
  }, [schoolUser, isLoaded, branch]);
  async function fetchSubjects(currentSchoolId, currentBranch) {
    const ref = collection(
      db,
      "schools",
      currentSchoolId,
      "branches",
      currentBranch,
      "subjects",
    );
    const snap = await getDoc(doc(ref, "branch_subjects"));
    setLoading(false);
    if(!snap.exists() || !snap.data().subjects || snap.data().subjects.length == 0) {
      setSubjects([]);
      return;
    }
    setSubjects(snap.data().subjects);
  }
  const deleteSubject = async (subjectId) => {
    const sure = confirm('do you really want to delete the subject?');
    if(!sure) return;
    setLoading(true);
    try {
      await secureAxios.delete('/api/school/academics/subjects', {
        params: {
          subjectId, branch
        }
      });
      await fetchSubjects(schoolId, branch);
    } catch (error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }
  return (
    <RequirePermission permission="academic.manage">
      <div className="space-y-4">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Subjects</h1>
              <p className="text-sm text-(--text-muted)">
                Manage curriculum details
              </p>
            </div>
          </div>
          <button
            className="btn-primary flex gap-2"
            onClick={() => setOpenSubjectModal(true)}
          >
            <Plus size={16} /> Add Subject
          </button>
        </header>
        {(isLoaded && !loading && subjects.length == 0) && (
          <p className="text-(--text-muted)">No subjects found!</p>
        )}
        <div className="grid lg:grid-cols-3 gap-4">
          {subjects.map(cls => (
            <div key={cls.id} className="space-y-2 bg-(--bg-card) px-5 py-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">
                  {cls.name}
                  </h2>
                <div className="flex gap-1">
                  <div onClick={() => {
                    setSubjectData(cls);
                    setOpenSubjectModal(true);
                  }} className="hover:text-yellow-500 cursor-pointer p-2 rounded-md bg-(--bg)">
                    <Pencil size={16} />
                  </div>
                  <div onClick={() => {
                    deleteSubject(cls.id);
                  }} className="hover:text-red-500 cursor-pointer p-2 rounded-md bg-(--bg)">
                    <Trash2 size={16} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <SubjectModal
          open={openSubjectModal}
          data={subjectData}
          onClose={() => {
            setSubjectData(null);
            setOpenSubjectModal(false)
          }}
          onSuccess={() => {
            setLoading(true);
            fetchSubjects(schoolId, branch);
            setSubjectData(null);
            setLoading(false);
          }}
        />
      </div>
    </RequirePermission>
  );
}
