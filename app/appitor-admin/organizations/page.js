"use client";

import { useEffect, useState } from "react";
import { Plus, Building2, GraduationCap } from "lucide-react";
import { fetchOrganizations } from "@/lib/admin/organizationService";
import AddOrganizationModal from "./AddOrganizationModal";

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchOrganizations().then(setOrgs);
  }, []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GraduationCap size={20} />
            Organizations
          </h1>
          <p className="text-sm text-muted">
            Manage school groups, trusts, and owners
          </p>
        </div>

        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add Organization
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-[var(--bg)] border-b border-(--border)">
              <tr className="text-muted text-left">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody>
              {orgs.map((o) => (
                <tr
                  key={o.id}
                  className="border-b last:border-0 hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-3 font-medium">
                    {o.name}
                    {o.ownerNote && (
                      <p className="text-xs text-muted">
                        {o.ownerNote}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs ${
                        o.status === "active"
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-muted">
                    {o.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {orgs.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No organizations created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddOrganizationModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
