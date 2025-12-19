"use client";

import { useState, useEffect } from "react";
import { X, Grid } from "lucide-react";
import secureAxios from "@/lib/secureAxios";

export default function SectionModal({
  open,
  onClose,
  onSuccess,
  classData,
  sectionData,
}) {
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");

  useEffect(() => {
    if (sectionData) {
      setName(sectionData.name || "");
      setCapacity(sectionData.capacity || "");
    }
  }, [sectionData]);

  if (!open || !classData) return null;

  async function handleSubmit() {
    if (!name.trim()) return;

    await secureAxios.post("/api/school/academics/sections", {
      classId: classData.id,
      sectionId: sectionData?.id,
      name,
      capacity: Number(capacity),
    });

    onSuccess();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
      <div className="w-full max-w-md mx-4 modal-card">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Grid size={18} />
              {sectionData ? "Edit Section" : "Add Section"}
            </h2>
            <p className="text-xs text-muted">
              {classData.name}
            </p>
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
        <div className="flex justify-end gap-2 px-5 py-4 border-t">
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
