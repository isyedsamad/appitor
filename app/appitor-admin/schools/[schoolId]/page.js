"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  School,
  MapPin,
  ShieldCheck,
  Calendar,
  Layers,
  Users,
  BadgeCheck,
} from "lucide-react";
import { fetchSchoolById } from "@/lib/admin/schoolService";

export default function ViewSchoolPage() {
  const { schoolId } = useParams();
  const [school, setSchool] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await fetchSchoolById(schoolId);
      setSchool(data);
      setLoading(false);
    }
    load();
  }, [schoolId]);

  if (loading) return <div>Loading...</div>;
  if (!school) return <div>School not found</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <School size={20} />
          {school.name}
        </h1>
        <p className="text-sm text-muted">
          School Code: <span className="font-mono">{school.code}</span>
        </p>
      </div>

      {/* Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard icon={MapPin} label="Location" value={`${school.city}, ${school.state}`} />
        <InfoCard icon={ShieldCheck} label="Plan" value={school.plan} />
        <InfoCard
          icon={Calendar}
          label="Expiry"
          value={
            school.expiryDate?.toDate
              ? school.expiryDate.toDate().toLocaleDateString()
              : "—"
          }
        />
        <InfoCard icon={Users} label="Student Limit" value={school.studentLimit} />
      </div>

      {/* Status */}
      <div className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BadgeCheck
            className={
              school.status === "active"
                ? "text-[var(--primary)]"
                : "text-red-500"
            }
          />
          <div>
            <p className="font-medium">Status</p>
            <p className="text-sm text-muted capitalize">
              {school.status}
            </p>
          </div>
        </div>

        {school.setup_pending && (
          <span className="badge-primary">Setup Pending</span>
        )}
      </div>

      {/* Modules */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={18} />
          <h2 className="font-medium">Enabled Modules</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(school.modules || {})
            .filter(([, v]) => v)
            .map(([k]) => (
              <span
                key={k}
                className="px-3 py-1 rounded-md text-xs
                           bg-[var(--primary-soft)] text-[var(--primary)] capitalize"
              >
                {k}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

/* UI */
function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="card flex items-center gap-4">
      <div className="p-3 rounded-lg bg-[var(--primary-soft)] text-[var(--primary)]">
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}
