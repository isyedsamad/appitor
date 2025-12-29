"use client";

import { useState, useEffect } from "react";
import { X, Layers } from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import { useSchool } from "@/context/SchoolContext";

export default function ClassModal({open, onClose, onSuccess, data}) {
  const { setLoading } = useSchool();
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");
  const { branch } = useBranch();
  useEffect(() => {
    if (data) {
      setName(data.name || "");
      setOrder(data.order || "");
    }else {
      setName('');
      setOrder('');
    }
  }, [data]);
  if (!open) return null;
  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/academics/classes", {
        classId: data?.id,
        name,
        branch,
        order: Number(order),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
      <div className="w-full max-w-md mx-4 modal-card">
        <div className="flex items-center justify-between bg-(--bg) rounded-t-2xl px-5 py-4 border-b border-(--border)">
          <div className="flex items-center gap-2">
            <Layers size={18} />
            <h2 className="font-semibold">
              {data ? "Edit Class" : "Add Class"}
            </h2>
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-muted">Class Name</label>
            <input
              className="input mt-1"
              placeholder="e.g. Class 10 or IV"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-muted">Display Order</label>
            <input
              type="number" onWheel={(e) => e.preventDefault()}
              className="input mt-1"
              placeholder="e.g. 10"
              value={order}
              onChange={e => setOrder(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-(--border) mt-1">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            {data ? "Update Class" : "Add Class"}
          </button>
        </div>
      </div>
    </div>
  );
}
