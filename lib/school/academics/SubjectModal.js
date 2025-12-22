"use client";

import { useState, useEffect } from "react";
import { X, BookOpen } from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { useBranch } from "@/context/BranchContext";
import { toast } from "react-toastify";
import { useSchool } from "@/context/SchoolContext";

export default function SubjectModal({open, onClose, onSuccess, data}) {
  const { setLoading } = useSchool();
  const { branch } = useBranch();
  const [name, setName] = useState("");
  useEffect(() => {
    if (data) {
      setName(data.name || "");
    }else {
      setName('');
    }
  }, [data]);
  if (!open) return null;
  async function handleSubmit() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/academics/subjects", {
        subjectId: data?.id,
        name,
        branch,
      });
      onSuccess();
      onClose();
    } catch (error) {
      toast.error("Error: " + (error?.response?.data?.message || error.message), {
        theme: "colored",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/50">
      <div className="w-full max-w-md mx-4 modal-card">
        <div className="flex items-center justify-between bg-(--bg) rounded-t-2xl px-5 py-4 border-b border-(--border)">
          <div className="flex items-center gap-2">
            <BookOpen size={18} />
            <h2 className="font-semibold">
              {data ? "Edit Subject" : "Add Subject"}
            </h2>
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-muted">Subject Name</label>
            <input
              className="input mt-1"
              placeholder="e.g. Mathematics"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-(--border) mt-1">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            {data ? "Update Subject" : "Add Subject"}
          </button>
        </div>
      </div>
    </div>
  );
}
