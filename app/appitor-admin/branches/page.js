"use client";

import { useEffect, useState } from "react";
import { Plus, GitBranch, Pencil } from "lucide-react";
import { fetchBranches } from "@/lib/admin/branchService";
import AddBranchModal from "./AddBranchModal";
import Link from "next/link";

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchBranches().then(setBranches);
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:justify-between items-center gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <GitBranch size={20} />
            Branches
          </h1>
          <p className="text-sm text-muted">
            Manage physical campuses under schools
          </p>
        </div>

        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add Branch
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-[var(--bg)] border-b border-(--border)">
              <tr className="text-muted text-left">
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.id}
                  className="border-b last:border-0 hover:bg-[var(--bg)]"
                >
                  <td className="px-4 py-3 font-medium">
                    {b.name}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {b.branchCode}
                  </td>
                  <td className="px-4 py-3">
                    {b.city}, {b.state}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs ${
                        b.status === "active"
                          ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {b.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/appitor-admin/schools/${b.id}/edit`}><ActionButton icon={Pencil} /></Link>
                    </div>
                  </td>
                </tr>
              ))}

              {branches.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-muted"
                  >
                    No branches created yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddBranchModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}


function ActionButton({ icon: Icon }) {
  return (
    <button
      className="p-2 rounded-md border border-(--border)
                 hover:bg-(--primary-soft)
                 transition"
    >
      <Icon size={16} />
    </button>
  );
}
