"use client";

import { useEffect, useState } from "react";
import {
  School,
  Users,
  ShieldCheck,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import { fetchDashboardStats } from "@/lib/admin/dashboardService";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchDashboardStats();
        setStats(data);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-muted">
          Overview of Appitor admin system
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={stats.totalSchools}
          icon={School}
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatCard
          title="Active Roles"
          value={stats.totalRoles}
          icon={ShieldCheck}
        />
        <StatCard
          title="System Status"
          value="Healthy"
          icon={Activity}
          highlight
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card">
          <h2 className="font-medium mb-3">Quick Actions</h2>
          <Link href={'/appitor-admin/schools'}><ActionItem label="Add New School" /></Link>
          <Link href={'/appitor-admin/roles'}><ActionItem label="Create Role" /></Link>
          <Link href={'/appitor-admin/users'}><ActionItem label="Invite User" /></Link>
        </div>
        <div className="card lg:col-span-2">
          <h2 className="font-medium mb-3">System Overview</h2>
          <p className="text-sm text-muted">
            All services are running normally.
          </p>
        </div>
      </div>
    </div>
  );
}



function StatCard({ title, value, icon: Icon, highlight }) {
  return (
    <div className="card flex items-center justify-between">
      <div>
        <p className="text-sm text-muted">{title}</p>
        <p className="text-2xl font-semibold mt-1">{value}</p>
      </div>

      <div
        className={`p-3 rounded-lg ${
          highlight
            ? "bg-(--primary-soft) text-(--primary)"
            : "bg-(--bg) text-muted"
        }`}
      >
        <Icon size={20} />
      </div>
    </div>
  );
}

function ActionItem({ label }) {
  return (
    <button className="btn-outline w-full flex items-center justify-between mb-2">
      <span>{label}</span>
      <ArrowUpRight size={16} />
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="card h-24 animate-pulse" />
      ))}
    </div>
  );
}
