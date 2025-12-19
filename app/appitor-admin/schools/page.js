"use client";

import { useEffect, useState } from "react";
import { fetchSchools } from "@/lib/admin/schoolService";
import { Plus, Eye, Pencil, Lock, LockOpen } from "lucide-react";
import AddSchoolModal from "./AddSchoolModal";
import { useTheme } from "next-themes";
import Link from "next/link";
import { fetchOrganizations } from "@/lib/admin/organizationService";

export default function SchoolsPage() {
  const [schools, setSchools] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState([]);
  const disableSchool = async () => {

  }
  useEffect(() => {
    async function load() {
      const data = await fetchSchools();
      setSchools(data);
      const orgsList = await fetchOrganizations();
      setOrgs(orgsList);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Schools</h1>
          <p className="text-sm text-muted">
            Manage all registered schools in Appitor
          </p>
        </div>
        <button className="btn-primary w-fit mt-2" onClick={() => setOpen(true)}>
          <Plus size={16} />
          Add School
        </button>
      </div>
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg) sticky top-0 z-10">
              <tr className="text-left text-muted border-b border-[var(--border)]">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    Loading schools...
                  </td>
                </tr>
              )}

              {!loading && schools.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-muted">
                    No schools found
                  </td>
                </tr>
              )}

              {schools.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-(--border) last:border-0 hover:bg-(--bg) transition"
                >
                  <td className="px-4 py-3 text-sm font-semibold">
                    {s.orgName || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted">{s.email}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {s.code}
                  </td>
                  <td className="px-4 py-3">
                    {s.city}, {s.state}
                  </td>
                  <td className="px-4 py-3">
                    <span className="badge-primary capitalize">
                      {s.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {s.createdAt?.toDate?.().toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {s.status == 'active' ? (
                        <button className="action-btn" onClick={() => {disableSchool(s.id, true)}}><Lock size={16} /></button>
                      ) : (
                        <button className="action-btn" onClick={() => {disableSchool(s.id, false)}}><LockOpen size={16} /></button>
                      )}
                      <Link href={`/appitor-admin/schools/${s.id}`}><ActionButton icon={Eye} /></Link>
                      <Link href={`/appitor-admin/schools/${s.id}/edit`}><ActionButton icon={Pencil} /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddSchoolModal open={open} onClose={async () => {
        setOpen(false);
        setLoading(true);
        const data = await fetchSchools();
        setSchools(data);
        setLoading(false);
      }} orgList={orgs} />
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

function StatusBadge({ status }) {
    const { theme, setTheme } = useTheme();
  return (
    <span
      className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${status == 'active' ? `${theme == 'dark' ? 'bg-green-950 text-green-600' : 'bg-green-100 text-green-600'}` : `${theme == 'dark' ? 'bg-red-950 text-red-600' : 'bg-red-100 text-red-600'}`}`}
    >
      {status}
    </span>
  );
}
