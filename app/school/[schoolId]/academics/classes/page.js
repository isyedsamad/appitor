"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import RequirePermission from "@/components/school/RequirePermission";
import ClassModal from "@/lib/school/academics/ClassModal";
import SectionModal from "@/lib/school/academics/SectionModal";

export default function ClassesPage() {
    const { user, loading } = useSchool();
    const { branch } = useBranch();
  const [classes, setClasses] = useState([]);
  const [openClassModal, setOpenClassModal] = useState(false);
  const [openSectionModal, setOpenSectionModal] = useState(null);
  const [schoolId, setSchoolId] = useState('');
  const [branchId, setBranchId] = useState('');

  useEffect(() => {
    if(!loading && user && branch) {
        setSchoolId(user.schoolId);
        setBranchId(branch);
        fetchClasses();
    }
  }, [user, loading, branch]);

  async function fetchClasses() {
    const ref = collection(
      db,
      "schools",
      schoolId,
      "branches",
      branchId,
      "classes"
    );
    const snap = await getDocs(ref);
    setClasses(
      snap.docs.map(d => ({ id: d.id, ...d.data() }))
    );
  }

  return (
    <RequirePermission permission="academics.manage">
      <div className="space-y-4">
        <header className="flex justify-between items-center">
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

        <div className="grid md:grid-cols-2 gap-4">
          {classes.map(cls => (
            <div key={cls.id} className="card space-y-2">
              <div className="flex justify-between">
                <h2 className="font-medium">{cls.name}</h2>
                <div className="flex gap-2">
                  <Pencil size={16} />
                  <Trash2 size={16} className="text-danger" />
                </div>
              </div>

              {cls.sections?.map(sec => (
                <div
                  key={sec.id}
                  className="flex justify-between text-sm bg-muted p-2 rounded"
                >
                  <span>
                    Section {sec.name} • {sec.capacity}
                  </span>
                  <div className="flex gap-2">
                    <Pencil size={14} />
                    <Trash2 size={14} />
                  </div>
                </div>
              ))}

              <button
                className="text-sm text-primary"
                onClick={() => setOpenSectionModal(cls)}
              >
                + Add Section
              </button>
            </div>
          ))}
        </div>

        <ClassModal
          open={openClassModal}
          onClose={() => setOpenClassModal(false)}
          onSuccess={fetchClasses}
        />

        <SectionModal
          classData={openSectionModal}
          onClose={() => setOpenSectionModal(null)}
          onSuccess={fetchClasses}
        />
      </div>
    </RequirePermission>
  );
}
