"use client";

import { useEffect, useState } from "react";
import {
  School,
  Users,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  TrendingUp,
  Landmark
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

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-bold text-(--primary) uppercase mb-0.5">Intelligence Overview</p>
          <h1 className="text-2xl font-bold text-[var(--text)]">System Status</h1>
        </div>
        <div className="hidden sm:block text-right">
          <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Global Telemetry</p>
          <p className="text-xs font-bold text-[var(--text)] leading-none">CONNECTED</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Nodes"
          value={stats.totalSchools}
          subValue={`${stats.activeSchools} Active`}
          icon={School}
          color="primary"
        />
        <StatCard
          title="Security Base"
          value={stats.totalUsers}
          subValue={`${stats.adminUsers} Admins`}
          icon={Users}
          color="accent"
        />
        <StatCard
          title="RBAC Profiles"
          value={stats.totalRoles}
          subValue="System Matrix"
          icon={ShieldCheck}
          color="warning"
        />
        <StatCard
          title="Core Health"
          value="99.9%"
          subValue="Optimal"
          icon={Activity}
          color="danger"
          highlight
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="group relative overflow-hidden rounded-[2rem] bg-[var(--text)] p-8 shadow-xl transition-all hover:shadow-(--primary)/10">
            <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-(--primary)/20 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-(--primary)" />
                <span className="text-[9px] font-bold text-white/40 uppercase">Platform Evolution</span>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Next-Gen Infrastructure</h2>
              <p className="text-white/60 text-xs max-w-lg leading-relaxed font-normal">
                The Appitor Hub v4 initialized with deep theme integration and
                modular entity provisioning. Your administrative matrix is now fully decoupled.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] font-bold text-white uppercase">
                  Engine: V4.2L
                </div>
                <div className="px-4 py-2 rounded-xl bg-(--accent)/20 border border-(--accent)/30 text-[9px] font-bold text-(--accent) uppercase">
                  Access: Decoupled
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <QuickAction
              href="/appitor-admin/organizations"
              title="Organizations"
              desc="Parent Control"
              icon={Landmark}
              color="primary"
            />
            <QuickAction
              href="/appitor-admin/settings"
              title="Intelligence"
              desc="Global Params"
              icon={Activity}
              color="accent"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[2rem] bg-[var(--bg-card)] p-6 border border-[var(--border)] shadow-sm">
            <h2 className="font-bold text-[var(--text)] mb-6 uppercase text-[9px]">Provisioning</h2>
            <div className="space-y-2">
              <ActionItem label="New School Node" href="/appitor-admin/schools" icon={School} color="primary" />
              <ActionItem label="RBAC Definition" href="/appitor-admin/roles" icon={ShieldCheck} color="warning" />
              <ActionItem label="Admin Provision" href="/appitor-admin/users" icon={Users} color="accent" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subValue, icon: Icon, color, highlight }) {
  const themes = {
    primary: "bg-(--primary)/5 text-(--primary) border-(--primary)/10",
    accent: "bg-(--accent)/5 text-(--accent) border-(--accent)/10",
    warning: "bg-(--warning)/5 text-(--warning) border-(--warning)/10",
    danger: "bg-(--danger)/5 text-(--danger) border-(--danger)/10"
  };

  return (
    <div className="p-6 rounded-[1.5rem] bg-[var(--bg-card)] border border-[var(--border)] shadow-sm hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl transition-transform duration-300 group-hover:scale-110 ${themes[color]}`}>
          <Icon size={20} />
        </div>
        {highlight && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-(--accent)/10 text-(--accent) border border-(--accent)/20">
            <div className="w-1 h-1 rounded-full bg-(--accent) animate-pulse" />
            <span className="text-[8px] font-bold uppercase">Live</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase mb-1 leading-none">{title}</p>
        <div className="flex items-end gap-2">
          <p className="text-2xl font-bold text-[var(--text)] leading-none">{value}</p>
          <p className="text-[10px] font-bold text-[var(--text-muted)] mb-0.5 leading-none">{subValue}</p>
        </div>
      </div>
    </div>
  );
}

function QuickAction({ href, title, desc, icon: Icon, color }) {
  const themes = {
    primary: "text-(--primary) bg-(--primary)/5 border-(--primary)/10",
    accent: "text-(--accent) bg-(--accent)/5 border-(--accent)/10"
  };

  return (
    <Link href={href} className="group p-6 rounded-[1.5rem] bg-[var(--bg-card)] border border-[var(--border)] hover:border-(--primary)/30 hover:shadow-xl transition-all duration-300">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 shadow-sm ${themes[color]}`}>
        <Icon size={20} />
      </div>
      <p className="font-bold text-[var(--text)] text-base leading-none">{title}</p>
      <p className="text-[9px] font-bold text-[var(--text-muted)] mt-1.5 uppercase leading-none">{desc}</p>
    </Link>
  );
}

function ActionItem({ label, href, icon: Icon, color }) {
  const themes = {
    primary: "text-(--primary) bg-(--primary)/5 group-hover:bg-(--primary) group-hover:text-white",
    warning: "text-(--warning) bg-(--warning)/5 group-hover:bg-(--warning) group-hover:text-white",
    accent: "text-(--accent) bg-(--accent)/5 group-hover:bg-(--accent) group-hover:text-white"
  };

  return (
    <Link href={href} className="group w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-[var(--bg)] border border-transparent hover:border-[var(--border)] transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm ${themes[color]}`}>
          <Icon size={16} />
        </div>
        <span className="text-[11px] font-bold text-[var(--text)] uppercase group-hover:translate-x-1 transition-transform">{label}</span>
      </div>
      <ArrowUpRight size={14} className="text-[var(--text-muted)] group-hover:text-[var(--text)] transition-all opacity-0 group-hover:opacity-100" />
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse p-4">
      <div className="h-12 w-48 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-[var(--bg-card)] border border-[var(--border)] rounded-[1.5rem]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 h-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-[2rem]" />
        <div className="h-64 bg-[var(--bg-card)] border border-[var(--border)] rounded-[2rem]" />
      </div>
    </div>
  );
}
