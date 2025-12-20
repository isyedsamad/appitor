"use client";

import { useEffect, useState } from "react";
import secureAxios from "@/lib/secureAxios";
import { X, Save } from "lucide-react";
import { fetchOrganizations } from "@/lib/admin/organizationService";
import { fetchSchools } from "@/lib/admin/schoolService";
import { toast } from "react-toastify";

export default function AddBranchModal({ open, onClose }) {
  const [orgs, setOrgs] = useState([]);
  const [schools, setSchools] = useState([]);
  const [form, setForm] = useState({
    orgId: "",
    schoolId: "",
    name: "",
    branchCode: "",
    city: "",
    state: "",
  });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    fetchOrganizations().then(setOrgs);
    fetchSchools().then(setSchools);
  }, []);
  if (!open) return null;
  async function save() {
    if (!form.orgId || !form.schoolId || !form.name) return;
    setSaving(true);
    try {
      await secureAxios.post("/api/admin/branches/create", form);
      setSaving(false);
      toast.success('Branch added successfully!', {
        theme: 'colored'
      })
      onClose();
    } catch(error) {
      toast.error('Error: ' + error, {
        theme: 'colored'
      })
    }
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="card w-full max-w-lg p-0">
        <div className="flex justify-between items-center bg-(--bg) px-6 py-4 border-b border-(--border)">
          <h2 className="font-semibold">Add Branch</h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <Select
            label="Organization"
            onChange={(e) =>
              setForm({ ...form, orgId: e.target.value })
            }
          >
            <option value="">Select organization</option>
            {orgs.map((o) => 
              o.status == 'active' && (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>

          <Select
            label="School"
            onChange={(e) =>
              setForm({ ...form, schoolId: e.target.value })
            }
          >
            <option value="">Select school</option>
            {schools
              .filter((s) => s.orgId === form.orgId)
              .map((s) => 
                s.status == 'active' && (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
          </Select>

          <Input
            label="Branch Name"
            placeholder="ABC Siwan"
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
          <Input
            label="Branch Code"
            placeholder="ABC-SIW"
            onChange={(e) =>
              setForm({ ...form, branchCode: e.target.value })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="City"
              onChange={(e) =>
                setForm({ ...form, city: e.target.value })
              }
            />
            <Input
              label="State"
              onChange={(e) =>
                setForm({ ...form, state: e.target.value })
              }
            />
          </div>
        </div>
        <div className="flex justify-end px-6 py-4 border-t mt-2 border-(--border)">
          <button
            className="btn-primary"
            onClick={save}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Create Branch"}
          </button>
        </div>
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
