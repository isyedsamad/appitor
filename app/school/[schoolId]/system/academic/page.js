"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Plus,
  Save,
  CheckCircle,
  Building2,
  Trash2,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";

export default function AcademicSessionSettingsPage() {
  const { currentSession, setCurrentSession, setLoading } = useSchool();
  const { branch, branchInfo } = useBranch();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState("");
  const [newSession, setNewSession] = useState({
    id: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    async function load() {
      if (!branch) return;
      try {
        setLoading(true);
        const res = await secureAxios.get(
          `/api/school/settings/academic?branch=${branch}`
        );
        setSessions(res.data.sessions || []);
        setActiveSession(res.data.currentSession || "");
      } catch (err) {
        toast.error("Failed to load academic settings: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [branch, setLoading]);

  async function saveSettings() {
    if (!branch) {
      toast.error("No branch selected");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.put(
        "/api/school/settings/academic",
        {
          sessions,
          currentSession: activeSession,
          branch,
        }
      );
      setCurrentSession(activeSession);
      toast.success("Academic settings updated successfully");
    } catch (err) {
      toast.error("Failed to save settings: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  }

  function addSession() {
    if (!newSession.id || !newSession.startDate || !newSession.endDate) {
      toast.error("Please fill all session fields");
      return;
    }
    if (sessions.find(s => s.id === newSession.id)) {
      toast.error("Session ID already exists");
      return;
    }
    setSessions(prev => {
      const updated = [
        ...prev,
        {
          ...newSession,
          status: "Upcoming",
        },
      ];
      if (updated.length === 1 && !activeSession) {
        setActiveSession(newSession.id);
      }
      return updated;
    });
    setNewSession({
      id: "",
      startDate: "",
      endDate: "",
    });
  }

  function removeSession(id) {
    if (id === activeSession) {
      toast.error("Cannot remove the active session");
      return;
    }
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  return (
    <RequirePermission permission="system.academic.view">
      <div className="space-y-5">
        <div className="flex flex-col gap-5 md:flex-row justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-(--primary-soft) text-(--primary)">
              <CalendarDays size={22} />
            </div>
            <div>
              <h1 className="text-base font-semibold text-(--text) flex items-center gap-2">
                Academic Sessions
                <span className="flex items-center gap-1 text-[10px] bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-full uppercase tracking-widest font-semibold border border-orange-500/10">
                  <Sparkles size={10} /> Scoped
                </span>
              </h1>
              <p className="text-[11px] font-semibold text-(--text-muted) uppercase tracking-wider">
                Manage branch-level academic timelines
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--bg-card) border border-(--border)">
              <Building2 size={14} className="text-(--text-muted)" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-(--text-muted)">
                Branch: <span className="text-(--text)">{branchInfo?.name || "..."}</span>
              </span>
            </div>
            <button
              className="btn-primary h-10 px-6 gap-2 text-xs font-semibold uppercase"
              onClick={saveSettings}
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-5">
          <div className="space-y-4">
            {/* Entry Section */}
            <div className="bg-(--bg-card) border border-(--border) rounded-xl px-5 py-4 shadow-sm space-y-2">
              <div className="flex items-center gap-2 pb-2">
                <Plus size={16} className="text-(--primary)" />
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
                  Define New Session
                </h2>
              </div>
              <div className="grid md:grid-cols-4 gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1 tracking-wider">Session ID</p>
                  <select
                    className="input h-10 text-xs font-semibold"
                    value={newSession.id}
                    onChange={e => setNewSession(p => ({ ...p, id: e.target.value }))}
                  >
                    <option value="">Select Session...</option>
                    {Array.from({ length: 16 }, (_, i) => {
                      const startYear = 2025 + i;
                      const endYear = (startYear + 1).toString().slice(-2);
                      const id = `${startYear}-${endYear}`;
                      return (
                        <option key={id} value={id}>
                          {id}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1 tracking-wider">Start Date</p>
                  <input
                    type="date"
                    className="input h-10 text-xs font-semibold"
                    value={toInputDate(newSession.startDate)}
                    onChange={e => setNewSession(p => ({ ...p, startDate: e.target.value ? formatInputDate(e.target.value) : '' }))}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1 tracking-wider">End Date</p>
                  <input
                    type="date"
                    className="input h-10 text-xs font-semibold"
                    value={toInputDate(newSession.endDate)}
                    onChange={e => setNewSession(p => ({ ...p, endDate: e.target.value ? formatInputDate(e.target.value) : '' }))}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addSession}
                    className="btn-primary h-10 w-full flex items-center justify-center gap-2 font-semibold text-xs"
                  >
                    <Plus size={14} /> Add to List
                  </button>
                </div>
              </div>
            </div>

            {/* Session List Table */}
            <div className="rounded-xl bg-(--bg-card) border border-(--border) overflow-hidden shadow-sm">
              <div className="bg-(--bg-soft) px-5 py-4 border-b border-(--border) flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-(--primary)" />
                  <h2 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
                    Timeline History
                  </h2>
                </div>
                {sessions.length > 0 && (
                  <span className="text-[10px] font-semibold text-(--text-muted) px-2 py-0.5 bg-(--bg) border border-(--border) rounded-md">
                    {sessions.length} Sessions
                  </span>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-(--bg-soft)/30">
                      <th className="px-6 py-4 text-left text-[10px] font-semibold text-(--text-muted) uppercase tracking-widest border-b border-(--border)">Session</th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold text-(--text-muted) uppercase tracking-widest border-b border-(--border)">Start Date</th>
                      <th className="px-6 py-4 text-left text-[10px] font-semibold text-(--text-muted) uppercase tracking-widest border-b border-(--border)">End Date</th>
                      <th className="px-6 py-4 text-center text-[10px] font-semibold text-(--text-muted) uppercase tracking-widest border-b border-(--border)">Status</th>
                      <th className="px-6 py-4 text-right border-b border-(--border)"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border)">
                    {sessions.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-12 text-center text-(--text-muted) italic text-xs font-medium">
                          No sessions created for this branch yet.
                        </td>
                      </tr>
                    ) : (
                      sessions.map(s => (
                        <tr key={s.id} className="hover:bg-(--bg-soft)/50 transition-all group">
                          <td className="px-6 py-4 font-semibold text-(--text) text-xs">{s.id}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-(--text-muted)">{s.startDate}</td>
                          <td className="px-6 py-4 text-xs font-semibold text-(--text-muted)">{s.endDate}</td>
                          <td className="px-6 py-4 text-center">
                            {s.id === activeSession ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-semibold border border-green-500/10 uppercase tracking-wider">
                                <CheckCircle size={12} /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full bg-(--bg-soft) text-(--text-muted) text-[10px] font-semibold border border-(--border) uppercase tracking-tight">
                                {s.status}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {s.id !== activeSession && (
                              <button
                                onClick={() => removeSession(s.id)}
                                className="opacity-0 group-hover:opacity-100 p-2 text-red-500/60 hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-all"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {/* Active Switcher */}
            <div className="bg-(--bg-card) border border-(--border) rounded-xl px-5 py-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="p-1.5 rounded-lg bg-green-500/10 text-green-600">
                  <CheckCircle size={16} />
                </div>
                <h2 className="text-[11px] font-semibold uppercase tracking-wide text-(--text-muted)">
                  Activation Control
                </h2>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-(--text-muted) uppercase px-1">Select Active Session</p>
                  <select
                    className="input h-11 text-sm font-semibold border-(--primary-soft) ring-(--primary-soft)"
                    value={activeSession}
                    onChange={e => setActiveSession(e.target.value)}
                  >
                    <option value="">Choose Session...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.id}</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 space-y-2">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Calendar size={14} />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">Active Timeline</span>
                  </div>
                  {activeSession ? (
                    <div>
                      <p className="text-sm font-semibold text-(--text)">{activeSession}</p>
                      <p className="text-[10px] font-semibold text-(--text-muted) uppercase">
                        {sessions.find(s => s.id === activeSession)?.startDate} - {sessions.find(s => s.id === activeSession)?.endDate}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs font-semibold text-(--text-muted) italic">No active session selected.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-(--bg-card) border border-(--border) rounded-xl p-6 space-y-3">
              <h3 className="text-xs font-semibold text-(--text) uppercase">Policy Notice</h3>
              <p className="text-[11px] leading-relaxed text-(--text-muted) font-medium italic">
                The active session dictates where new admissions, subject mappings, and fee collections are recorded for this branch. Use with caution during transitions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}
