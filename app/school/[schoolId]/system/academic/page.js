"use client";

import { useEffect, useState } from "react";
import {
  Calendar,
  Plus,
  Save,
  Lock,
  CheckCircle,
} from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import RequirePermission from "@/components/school/RequirePermission";
import { formatInputDate, toInputDate } from "@/lib/dateUtils";

export default function AcademicSessionSettingsPage() {
  const { currentSession, setCurrentSession, setLoading } = useSchool();
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState("");
  const [newSession, setNewSession] = useState({
    id: "",
    startDate: "",
    endDate: "",
  });
  const [isLoadedSessions, setIsLoadedSessions] = useState(false);
  useEffect(() => {
    async function load() {
      try {
        const res = await secureAxios.get(
          "/api/school/settings/academic"
        );
        setSessions(res.data.sessions || []);
        setActiveSession(res.data.currentSession || "");
        setIsLoadedSessions(true);
      } catch(err) {
        toast.error("Failed to load academic settings: " + err.response.data.message);
      }
    }
    load();
  }, []);
  async function saveSettings() {
    setLoading(true);
    try {
      await secureAxios.put(
        "/api/school/settings/academic",
        {
          sessions,
          currentSession: activeSession,
        }
      );
      setCurrentSession(activeSession);
      toast.success("Academic settings updated");
    } catch(err) {
      toast.error("Failed to save settings: " + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }
  function addSession() {
    if (
      !newSession.id ||
      !newSession.startDate ||
      !newSession.endDate
    ) {
      toast.error("Fill all session fields");
      return;
    }
    if (sessions.find(s => s.id === newSession.id)) {
      toast.error("Session already exists");
      return;
    }
    setSessions(prev => [
      ...prev,
      {
        ...newSession,
        status: "upcoming",
      },
    ]);
    setNewSession({
      id: "",
      startDate: "",
      endDate: "",
    });
  }
  return (
    <RequirePermission permission="system.manage">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-start gap-3">
          <Calendar className="text-(--primary) mt-1" />
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              Academic Session Settings
            </h1>
            <p className="text-sm text-(--text-muted)">
              Manage academic years and control student promotions
            </p>
          </div>
        </div>
        <section className="border border-(--border) rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-(--text-muted)">
            Current Active Session
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <select
              className="input w-48"
              value={activeSession}
              onChange={e =>
                setActiveSession(e.target.value)
              }
            >
              <option value="">Select session</option>
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
            <span className="text-sm text-(--text-muted)">
              This session will be used for new admissions
            </span>
          </div>
        </section>
        <section className="border border-(--border) rounded-xl overflow-hidden">
          <div className="bg-(--bg-soft) px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase text-(--text-muted)">
              All Academic Sessions
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-(--border)">
                <th className="px-4 py-3 text-left">
                  Session
                </th>
                <th className="px-4 py-3 text-left">Start Date</th>
                <th className="px-4 py-3 text-left">End Date</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr
                  key={s.id}
                  className="border-t border-(--border) hover:bg-(--bg-soft)"
                >
                  <td className="px-4 py-3 font-medium">
                    {s.id}
                  </td>
                  <td className="px-4 py-3">{s.startDate}</td>
                  <td className="px-4 py-3">{s.endDate}</td>
                  <td className="px-4 py-3">
                    {s.id === activeSession ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <CheckCircle size={14} />
                        Active
                      </span>
                    ) : (
                      <span className="text-(--text-muted)">
                        {s.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="border border-(--border) rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase text-(--text-muted)">
            Add New Session
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              className="input"
              placeholder="Session ID (e.g. 2025-26)"
              value={newSession.id}
              onChange={e =>
                setNewSession(p => ({
                  ...p,
                  id: e.target.value,
                }))
              }
            />
            <input
              type="date"
              className="input"
              value={toInputDate(newSession.startDate)}
              onChange={e => {
                if(e.target.value == '') {
                  setNewSession(p => ({
                    ...p,
                    startDate: '',
                  }))
                }else {
                  setNewSession(p => ({
                    ...p,
                    startDate: formatInputDate(e.target.value),
                  }))
                }
              }}
            />
            <input
              type="date"
              className="input"
              value={toInputDate(newSession.endDate)}
              onChange={e => {
                if(e.target.value == '') {
                  setNewSession(p => ({
                    ...p,
                    endDate: '',
                  }))
                }else {
                  setNewSession(p => ({
                    ...p,
                    endDate: formatInputDate(e.target.value),
                  }))
                }
              }}
            />
            <button
              onClick={addSession}
              className="btn-outline flex items-center gap-2"
            >
              <Plus size={16} />
              Add Session
            </button>
          </div>
        </section>
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </RequirePermission>
  );
}
