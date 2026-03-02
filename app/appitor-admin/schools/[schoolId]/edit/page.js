"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { Settings, Save, Layers } from "lucide-react";
import { fetchSchoolById } from "@/lib/admin/schoolService";
import secureAxios from "@/lib/secureAxios";

export default function EditSchoolPage() {
  const { schoolId } = useParams();
  const router = useRouter();
  const [school, setSchool] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchoolById(schoolId).then(setSchool);
  }, [schoolId]);

  if (!school) return <div>Loading...</div>;

  async function save() {
    setSaving(true);
    await secureAxios.post("/api/admin/edit-school", {
      schoolId,
      updates: {
        plan: school.plan,
        status: school.status,
        studentLimit: school.studentLimit,
      },
    });
    setSaving(false);
    router.push(`/appitor-admin/schools/${schoolId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Settings size={20} /> Edit School
        </h1>
        <p className="text-sm text-muted">
          Update plan and status
        </p>
      </div>

      <div className="card grid sm:grid-cols-3 gap-4">
        <Select label="Plan" value={school.plan}
          onChange={(e) => setSchool({ ...school, plan: e.target.value })}>
          <option value="trial">Trial</option>
          <option value="core">Appitor Core</option>
          <option value="connect">Appitor Connect</option>
          <option value="plus">Appitor Plus</option>
        </Select>

        <Select label="Status" value={school.status}
          onChange={(e) => setSchool({ ...school, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </Select>

        <Input label="Student Limit" type="number" onWheel={(e) => e.preventDefault()}
          value={school.studentLimit}
          onChange={(e) =>
            setSchool({ ...school, studentLimit: Number(e.target.value) })
          }
        />
      </div>


      <div className="flex justify-end">
        <button className="btn-primary" onClick={save} disabled={saving}>
          <Save size={16} />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

function Input({ label, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <input {...props} />
    </div>
  );
}
function Select({ label, children, ...props }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-muted">{label}</label>
      <select {...props}>{children}</select>
    </div>
  );
}
