"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchSchoolById, fetchSchoolAdmin } from "@/lib/admin/schoolService";
import { fetchSchoolBranches } from "@/lib/admin/branchService";
import AddBranchModal from "../../branches/AddBranchModal";
import EditBranchModal from "../../branches/EditBranchModal";
import EditSchoolModal from "../EditSchoolModal";
import Link from "next/link";
import {
  Pencil, Lock, LockOpen, Plus, Mail, Phone, User, Building2,
  Users, Calendar, BadgeCheck, MapPin, GitBranch
} from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function ViewSchoolPage() {
  const { schoolId } = useParams();
  const { setLoading: setGlobalLoading } = useSuperAdmin();
  const [school, setSchool] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openAddBranch, setOpenAddBranch] = useState(false);
  const [openEditBranch, setOpenEditBranch] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [openEditSchool, setOpenEditSchool] = useState(false);

  async function load() {
    try {
      const schoolData = await fetchSchoolById(schoolId);
      if (schoolData) {
        setSchool(schoolData);
        const [adminData, branchesData] = await Promise.all([
          fetchSchoolAdmin(schoolId),
          fetchSchoolBranches(schoolId)
        ]);
        setAdmin(adminData);
        setBranches(branchesData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [schoolId]);

  const changeStatus = async (schoolId, isActive) => {
    setGlobalLoading(true);
    try {
      await secureAxios.post('/api/admin/school/lock_unlock', { schoolId, isActive });
      toast.success('Status updated!');
      await load();
    } catch (error) {
      toast.error('Error updating status');
    } finally {
      setGlobalLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!school) return <div>School not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-xl bg-(--primary-soft) text-(--primary)">
              <Building2 size={22} />
            </div>
            {school.name}
          </h1>
          <p className="text-sm text-muted mt-1">
            Managed School Identity: <span className="font-mono bg-(--bg) px-2 py-0.5 rounded border border-(--border)">{school.code}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {school.status === 'active' ? (
            <button
              onClick={() => changeStatus(school.id, true)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center gap-2"
            >
              <Lock size={16} /> Lock School
            </button>
          ) : (
            <button
              onClick={() => changeStatus(school.id, false)}
              className="px-4 py-2 text-sm font-semibold rounded-xl border border-green-200 bg-green-50 text-green-600 hover:bg-green-100 transition flex items-center gap-2"
            >
              <LockOpen size={16} /> Unlock School
            </button>
          )}
          <button
            onClick={() => setOpenEditSchool(true)}
            className="btn-primary flex gap-3 items-center justify-center"
          >
            <Pencil size={16} /> Edit Details
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Students" value="--" color="a" />
        <StatCard icon={Calendar} label="Expiry Date" value={school.expiryDate?.toDate ? school.expiryDate.toDate().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : "Unlimited"} color="l" />
        <StatCard icon={BadgeCheck} label="Operational Status" value={school.status} color={school.status === 'active' ? 'p' : 'a'} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="card">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <User size={18} className="text-(--primary)" /> Admin Access
            </h3>
            {admin ? (
              <div className="space-y-4">
                <AdminInfo icon={User} label="Primary Admin" value={admin.name} />
                <AdminInfo icon={Building2} label="Username" value={admin.username} />
                <AdminInfo icon={Mail} label="Email Address" value={admin.email} />
                <AdminInfo icon={Phone} label="Phone Number" value={admin.phone || "Not Set"} />
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100 text-orange-700 text-sm">
                No Admin user found for this school.
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <MapPin size={18} className="text-(--primary)" /> Geographical Info
            </h3>
            <div className="space-y-1">
              <p className="text-xs text-muted uppercase font-bold tracking-wider">Base Location</p>
              <p className="font-medium text-lg capitalize">{school.city}, {school.state}</p>
            </div>
            {school.phone && (
              <div className="mt-4 pt-4 border-t border-(--border)">
                <p className="text-xs text-muted uppercase font-bold tracking-wider">Contact</p>
                <p className="font-medium">{school.phone}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-(--border) flex justify-between items-center bg-(--bg)/30">
              <h3 className="font-bold flex items-center gap-2">
                <GitBranch size={18} className="text-(--primary)" /> Branch Network
              </h3>
              <div className="flex items-center gap-3">
                <span className="bg-(--primary-soft) text-(--primary) px-2 py-0.5 rounded-lg text-xs font-bold">
                  {branches.length} Branches
                </span>
                <button
                  onClick={() => setOpenAddBranch(true)}
                  className="p-1 px-2 rounded-lg bg-(--primary) text-white text-[10px] font-bold uppercase hover:bg-(--primary-dark) transition flex items-center gap-1 shadow-sm"
                >
                  <Plus size={12} /> Add new
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-(--bg) border-b border-(--border) text-muted uppercase text-[10px] font-bold tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Branch Detail</th>
                    <th className="px-6 py-4">Tactical Plan</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {branches.length > 0 ? branches.map(b => (
                    <tr key={b.id} className="hover:bg-(--bg) transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold text-(--text)">{b.name}</p>
                        <p className="text-[10px] text-muted font-mono">{b.branchCode}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase border ${b.plan === 'plus' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          b.plan === 'connect' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                          }`}>
                          {b.plan || 'core'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${b.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedBranch(b);
                            setOpenEditBranch(true);
                          }}
                          className="p-1.5 rounded-lg border border-(--border) hover:bg-(--primary-soft) hover:text-(--primary) transition"
                        >
                          <Pencil size={14} />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-muted italic">
                        No branches registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <AddBranchModal
        open={openAddBranch}
        onClose={() => {
          setOpenAddBranch(false);
          load();
        }}
        preSelectedSchoolId={school.id}
        preSelectedOrgId={school.orgId}
      />

      <EditSchoolModal
        open={openEditSchool}
        onClose={() => setOpenEditSchool(false)}
        school={school}
        onUpdate={load}
      />
      <EditBranchModal
        open={openEditBranch}
        branch={selectedBranch}
        onClose={() => setOpenEditBranch(false)}
        onUpdate={load}
      />
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const bg = `var(--status-${color}-bg)`;
  const txt = `var(--status-${color}-text)`;
  const brd = `var(--status-${color}-border)`;

  return (
    <div
      className="card flex items-center gap-4 transition-transform hover:-translate-y-1"
      style={{ backgroundImage: `linear-gradient(to bottom right, ${bg}, transparent)`, borderColor: brd }}
    >
      <div className="p-3 rounded-xl shadow-sm" style={{ backgroundColor: bg, color: txt, border: `1px solid ${brd}` }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-[10px] text-muted uppercase font-bold tracking-wider">{label}</p>
        <p className="text-xl font-bold capitalize" style={{ color: txt }}>{value}</p>
      </div>
    </div>
  );
}

function AdminInfo({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 p-1.5 rounded-lg border border-(--border) bg-(--bg) text-muted">
        <Icon size={14} />
      </div>
      <div>
        <p className="text-[10px] text-muted uppercase font-bold tracking-wider">{label}</p>
        <p className="font-medium text-(--text)">{value}</p>
      </div>
    </div>
  );
}

