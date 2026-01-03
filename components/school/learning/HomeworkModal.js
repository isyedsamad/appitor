import { X, Save } from "lucide-react";
import { useEffect, useState } from "react";
import secureAxios from "@/lib/secureAxios";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";

export default function HomeworkModal({
  open,
  onClose,
  editItem,
  isSuper,
  onSaved,
}) {
  const { schoolUser } = useSchool();
  const { branch } = useBranch();

  const [form, setForm] = useState({
    date: "",
    classId: "",
    sectionId: "",
    period: "",
    content: "",
  });

  useEffect(() => {
    if (editItem) setForm(editItem);
  }, [editItem]);

  async function submit() {
    const payload = { ...form, branch };
    if (editItem)
      await secureAxios.put("/api/learning/homework", payload);
    else
      await secureAxios.post("/api/learning/homework", payload);

    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-card)] w-full max-w-lg rounded-lg p-6">
        <div className="flex justify-between mb-4">
          <h2 className="font-semibold">
            {editItem ? "Edit Homework" : "Add Homework"}
          </h2>
          <button onClick={onClose}><X /></button>
        </div>

        {isSuper && (
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="input mb-3"
          />
        )}

        {/* Teacher will only see allowed periods (pre-fetched logic assumed) */}

        <textarea
          placeholder="Homework details"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          className="w-full border rounded-md p-3 mb-4"
        />

        <button
          onClick={submit}
          className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white py-2 rounded-md"
        >
          <Save size={16} />
          Save Homework
        </button>
      </div>
    </div>
  );
}
