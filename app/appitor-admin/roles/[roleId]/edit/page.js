"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { ShieldCheck, Save, ArrowLeft } from "lucide-react";
import { fetchRoleById } from "@/lib/admin/roleService";
import { PERMISSIONS } from "@/lib/admin/permissions";
import secureAxios from "@/lib/secureAxios";

export default function EditRolePage() {
  const { roleId } = useParams();
  const router = useRouter();

  const [role, setRole] = useState(null);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await fetchRoleById(roleId);
      if (!data) return;

      setRole(data);

      const map = {};
      data.permissions?.forEach((p) => (map[p] = true));
      setSelected(map);
    }

    load();
  }, [roleId]);

  if (!role) {
    return <div className="text-muted">Loading role...</div>;
  }

  async function save() {
    setSaving(true);
    await secureAxios.post("/api/admin/roles/update", {
      roleId,
      permissions: Object.keys(selected).filter((p) => selected[p]),
    });
    setSaving(false);
    router.push("/appitor-admin/roles");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 border border-[var(--border)] rounded-md hover:bg-[var(--primary-soft)]"
        >
          <ArrowLeft size={16} />
        </button>

        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ShieldCheck size={20} />
            Edit Role
          </h1>
          <p className="text-sm text-muted">
            {role.system
              ? "System role permissions (limited)"
              : "Modify permissions for this role"}
          </p>
        </div>
      </div>

      {/* Role Info */}
      <div className="card grid sm:grid-cols-2 gap-4">
        <Info label="Role Name" value={role.name} />
        <Info
          label="Type"
          value={role.system ? "System" : "Custom"}
        />
      </div>

      {/* Permissions */}
      <div className="card">
        <h2 className="font-medium mb-4">Permissions</h2>

        {Object.entries(PERMISSIONS).map(([group, perms]) => (
          <div key={group} className="mb-5">
            <h3 className="text-sm font-medium mb-2">{group}</h3>

            <div className="grid sm:grid-cols-2 gap-3">
              {perms.map((p) => (
                <label
                  key={p}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg border
                    cursor-pointer transition
                    ${
                      selected[p]
                        ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                        : "border-[var(--border)]"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    disabled={role.system}
                    className="w-4 h-3 ml-2 accent-[var(--primary)]"
                    checked={!!selected[p]}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        [p]: e.target.checked,
                      })
                    }
                  />
                  <span className="text-sm">{p}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      {!role.system && (
        <div className="flex justify-end">
          <button
            className="btn-primary"
            onClick={save}
            disabled={saving}
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}

/* UI helpers */
function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
