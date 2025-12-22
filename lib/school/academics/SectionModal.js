"use client";

import { useState, useEffect } from "react";
import { X, Grid } from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { toast } from "react-toastify";
import { useBranch } from "@/context/BranchContext";

export default function SectionModal({open, onClose, onSuccess, classData, sectionData}) {
  const { setLoading } = useSchool();
  const { branch } = useBranch();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    if (sectionData) {
      setName(sectionData.name || "");
      setCapacity(sectionData.capacity || "");
    }else {
      setName('');
      setCapacity('');
    }
  }, [sectionData]);
  if (!open || !classData) return null;
  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/academics/sections", {
        classId: classData.id,
        sectionId: sectionData?.id,
        name,
        branch,
        capacity: Number(capacity),
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 modal-card">
        <div className="flex items-center justify-between px-5 py-4 bg-(--bg) rounded-t-2xl border-b border-(--border)">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Grid size={18} />
              {sectionData ? "Edit Section" : "Add Section"}
            </h2>
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-muted">Section Name</label>
            <input
              className="input mt-1"
              placeholder="e.g. A"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-muted">Capacity</label>
            <input
              type="number"
              className="input mt-1"
              placeholder="e.g. 40"
              value={capacity}
              onChange={e => setCapacity(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 mt-1 border-t border-(--border)">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            {sectionData ? "Update Section" : "Add Section"}
          </button>
        </div>
      </div>
    </div>
  );
}
