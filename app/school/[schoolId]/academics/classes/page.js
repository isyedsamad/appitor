"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import ClassModal from "@/lib/school/academics/ClassModal";
import SectionModal from "@/lib/school/academics/SectionModal";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";

export default function ClassesPage() {
  const { schoolUser, loading, setLoading, isLoaded } = useSchool();
  const { branch } = useBranch();
  const [classes, setClasses] = useState([]);
  const [openClassModal, setOpenClassModal] = useState(false);
  const [openSectionModal, setOpenSectionModal] = useState(null);
  const [schoolId, setSchoolId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [classData, setClassData] = useState(null);
  const [sectionData, setSectionData] = useState(null);
  useEffect(() => {
    if(isLoaded && schoolUser && branch) {
        setSchoolId(schoolUser.schoolId);
        setBranchId(branch);
        setLoading(true);
        fetchClasses(schoolUser.schoolId, branch)
    }
  }, [schoolUser, isLoaded, branch]);
  async function fetchClasses(currentSchoolId, currentBranch) {
    const ref = query(collection(
      db,
      "schools",
      currentSchoolId,
      "branches",
      currentBranch,
      "classes"
    ), orderBy('order', 'asc'));
    const snap = await getDocs(ref);
    setLoading(false);
    if(snap.docs.length == 0) {
      setClasses([]);
      return;
    }
    setClasses(
      snap.docs.map(d => ({ id: d.id, ...d.data() }))
    );
  }
  const deleteSection = async (secId, classId) => {
    const sure = confirm('do you really want to delete the section?');
    if(!sure) return;
    setLoading(true);
    try {
      await secureAxios.delete('/api/school/academics/sections', {
        params: {
          classId, secId, branch
        }
      });
      await fetchClasses(schoolId, branch);
    } catch (error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }
  const deleteClass = async (classId) => {
    const sure = confirm('do you really want to delete the class?');
    if(!sure) return;
    setLoading(true);
    try {
      await secureAxios.delete('/api/school/academics/classes', {
        params: {
          classId, branch
        }
      });
      await fetchClasses(schoolId, branch);
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
        <header className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <h1 className="text-xl font-semibold flex items-center gap-3">
            <Layers /> Classes & Sections
          </h1>
          <button
            className="btn-primary flex gap-2"
            onClick={() => setOpenClassModal(true)}
          >
            <Plus size={16} /> Add Class
          </button>
        </header>
        {(isLoaded && !loading && classes.length == 0) && (
          <p className="text-(--text-muted)">No classes found!</p>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {classes.map(cls => (
            <div key={cls.id} className="space-y-2 bg-(--bg-card) px-5 py-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">
                  {cls.name.toLowerCase().includes('class') ? '' : 'Class: '}{cls.name}
                  </h2>
                <div className="flex gap-1">
                  <div onClick={() => {
                    setClassData(cls);
                    setOpenClassModal(true);
                  }} className="hover:text-yellow-500 cursor-pointer p-2 rounded-md bg-(--bg)">
                    <Pencil size={16} />
                  </div>
                  <div onClick={() => {
                    deleteClass(cls.id);
                  }} className="hover:text-red-500 cursor-pointer p-2 rounded-md bg-(--bg)">
                    <Trash2 size={16} />
                  </div>
                </div>
              </div>
              {cls.sections?.map(sec => (
                <div
                  key={sec.id}
                  className="flex justify-between items-center text-sm bg-(--bg)/50 px-3 py-2 rounded"
                >
                  <div className="flex flex-col">
                  <span className="font-semibold">
                    Section: {sec.name}
                  </span>
                  <span className="text-(--text-muted) text-xs font-medium">
                    Capacity - {sec.capacity}
                  </span>
                  </div>
                  <div className="flex gap-1">
                  <div onClick={() => {
                    setSectionData(sec);
                    setOpenSectionModal(cls);
                  }} className="hover:text-yellow-500 cursor-pointer p-2 rounded-md bg-(--bg)">
                    <Pencil size={14} />
                  </div>
                  <div onClick={() => {
                    deleteSection(sec.id, cls.id);
                  }} className="hover:text-red-500 cursor-pointer p-2 rounded-md bg-(--bg)">
                    <Trash2 size={14} />
                  </div>
                  </div>
                </div>
              ))}

              <button
                className="text-sm font-medium hover:text-yellow-500 cursor-pointer p-2 rounded-md bg-(--bg)"
                onClick={() => setOpenSectionModal(cls)}
              >
                + Add Section
              </button>
            </div>
          ))}
        </div>

        <ClassModal
          open={openClassModal}
          data={classData}
          onClose={() => {
            setClassData(null);
            setOpenClassModal(false)
          }}
          onSuccess={() => {
            setLoading(true);
            fetchClasses(schoolId, branch);
            setClassData(null);
            setLoading(false);
          }}
        />

        <SectionModal
          open={openSectionModal}
          classData={openSectionModal}
          sectionData={sectionData}
          onClose={() => {
            setSectionData(null);
            setOpenSectionModal(null)
          }}
          onSuccess={() => {
            setLoading(true);
            fetchClasses(schoolId, branch);
            setSectionData(null);
            setLoading(false);
          }}
        />
      </div>
    </RequirePermission>
  );
}
