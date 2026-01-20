"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Search, Trash2 } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { hasPermission } from "@/lib/school/permissionUtils";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";
import { toast } from "react-toastify";
import secureAxios from "@/lib/secureAxios";
import { formatDate } from "@/lib/dateUtils";

export default function SchoolHolidayPage() {
  const { schoolUser, sessionList, currentSession, setLoading } = useSchool();
  const { branch } = useBranch();
  const canCreate = hasPermission(
    schoolUser,
    "holiday.create",
    false
  );
  const [filters, setFilters] = useState({
    session: currentSession,
    status: "all",
  });
  const [holidays, setHolidays] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  
  async function fetchHolidays() {
    if (!filters.session) return;
    setLoading(true);
    try {
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "holidays",
        filters.session
      );
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setHolidays([]);
        return;
      }
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rows = (snap.data().items || []).map(h => {
        const from = new Date(h.from);
        from.setHours(0, 0, 0, 0);
        const to = h.to ? new Date(h.to) : new Date(h.from);
        to.setHours(23, 59, 59, 999);
        let status = "upcoming";
        if (today > to) {
          status = "past";
        } else if (today >= from && today <= to) {
          status = "ongoing";
        }
        return {
          ...h,
          status,
        };
      });
      rows.sort(
        (a, b) => new Date(a.from).getTime() - new Date(b.from).getTime()
      );
      setHolidays(rows);
    } catch (err) {
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  }  
  
  const filtered = useMemo(() => {
    if (filters.status === "all") return holidays;
    return holidays.filter(h => h.status === filters.status);
  }, [holidays, filters.status]);

  const grouped = groupByMonth(filtered);

  return (
    <RequirePermission permission="holiday.view">
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <CalendarDays size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                Holiday Calendar
              </h1>
              <p className="text-sm text-(--text-muted)">
                Manage academic holidays for students & staff
              </p>
            </div>
          </div>
          {canCreate && (
            <button
              onClick={() => setOpenAdd(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Add Holiday
            </button>
          )}
        </div>
        <div>
          <div className="grid md:grid-cols-5 gap-4 items-end">
            <FilterSelect
              label="Session"
              value={filters.session}
              onChange={v =>
                setFilters({ ...filters, session: v })
              }
              options={sessionList.map(s => ({
                label: s.id,
                value: s.id,
              }))}
            />
            <FilterSelect
              label="Status"
              value={filters.status}
              onChange={v =>
                setFilters({ ...filters, status: v })
              }
              options={[
                { label: "All", value: "all" },
                { label: "Upcoming", value: "upcoming" },
                { label: "Past", value: "past" },
              ]}
            />
            <button
              onClick={fetchHolidays}
              className="btn-primary flex items-center gap-2"
            >
              <Search size={16} /> Search
            </button>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-(--text-muted)">
            No holidays found
          </div>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
          <div key={month} className="space-y-2">
            <h2 className="text-sm font-semibold text-(--text-muted) uppercase">
              {month}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map(h => (
                <HolidayCard
                  key={h.id}
                  holiday={h}
                  onDelete={id =>
                    setHolidays(prev => prev.filter(x => x.id !== id))
                  }
                />
              ))}
            </div>
          </div>
          )))
        }
        {openAdd && (
          <AddHolidayModal
            onClose={() => setOpenAdd(false)}
            session={filters.session}
            branch={branch}
            schoolId={schoolUser.schoolId}
            onSuccess={() => {
              setOpenAdd(false);
              fetchHolidays();
            }}
          />
        )}
      </div>
    </RequirePermission>
  );
}

function groupByMonth(holidays) {
  return holidays.reduce((acc, h) => {
    const key = new Date(h.from).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
    acc[key] = acc[key] || [];
    acc[key].push(h);
    return acc;
  }, {});
}


function HolidayCard({ holiday, onDelete }) {
  const { schoolUser, setLoading } = useSchool();
  const canDelete = hasPermission(schoolUser, "holiday.create", false);
  const STATUS_UI = {
    ongoing: {
      bg: "bg-(--status-p-bg)",
      text: "text-(--status-p-text)",
      border: "border-(--status-p-border)",
      label: "ONGOING",
    },
    upcoming: {
      bg: "bg-(--primary-soft)",
      text: "text-(--primary)",
      border: "border-(--primary)",
      label: "UPCOMING",
    },
    past: {
      bg: "bg-(--bg)",
      text: "text-(--text-muted)",
      border: "border-(--border)",
      label: "PAST",
    },
  };
  const ui = STATUS_UI[holiday.status];
  const visibleDays = holiday.daysList.slice(0, 2);
  const remaining = holiday.daysList.length - visibleDays.length;
  const todayName = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
  });
  async function handleDelete() {
    const ok = confirm("Delete this holiday?");
    if (!ok) return;
    setLoading(true);
    try {
      await secureAxios.post("/api/school/holiday/delete", {
        session: holiday.session,
        holidayId: holiday.id,
      });
      toast.success("Holiday deleted");
      onDelete?.(holiday.id);
    } catch {
      toast.error("Failed to delete holiday");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className={`relative rounded-xl px-5 py-4 border bg-(--bg-card) ${ui.border}`}
    >
      <div className="flex justify-between items-center">
        <span
          className={`px-3 py-1 rounded-full text-[11px] font-semibold ${ui.bg} ${ui.text} border ${ui.border}`}
        >
          {ui.label}
        </span>
        <div className="flex items-center gap-3">
          {canDelete && (
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg
                text-(--status-a-text)
                bg-(--status-a-bg)"
              title="Delete Holiday"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
      <h3 className="mt-2 font-semibold text-lg flex items-center gap-2 text-(--text)">
        {holiday.title}
        <div className="px-2 py-0.5 rounded-lg bg-(--status-m-bg) text-(--status-m-text)">
          <p className="text-xs font-semibold">
            {holiday.days} Day{holiday.days > 1 ? "s" : ""}
          </p>
        </div>
      </h3>
      <div className="flex items-center gap-2 text-sm font-medium text-(--text-muted)">
        <CalendarDays size={14} />
        <span>
          {formatDate(holiday.from)}
          {holiday.to && ` → ${formatDate(holiday.to)}`}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {visibleDays.map((day, i) => {
          const isToday = day === todayName;
          return (
            <span
              key={i}
              className={"px-2.5 py-1 rounded-full text-[11px] font-medium border bg-(--bg) border-(--border) text-(--text-muted)"}
            >
              {day}
            </span>
          );
        })}
        {remaining > 0 && (
          <span
            className="px-2.5 py-1 rounded-full text-[11px] font-medium
              bg-(--bg) border border-(--border) text-(--text-muted)"
          >
            +{remaining} more
          </span>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col">
      <p className="text-sm font-medium text-(--text-muted)">
        {label}
      </p>
      <select
        className="input"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddHolidayModal({ onClose, session, branch, onSuccess }) {
  const { schoolUser, setLoading, sessionList } = useSchool();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("single");
  const [fromDate, setFromDate] = useState("");
  const [sessionSelected, setSessionSelected] = useState(session);
  const [toDate, setToDate] = useState("");
  const daysList = useMemo(() => {
    if (!fromDate) return [];
    const from = new Date(fromDate);
    const to = mode === "multi" && toDate ? new Date(toDate) : new Date(fromDate);
    const days = [];
    const cur = new Date(from);
    while (cur <= to) {
      days.push(
        cur.toLocaleDateString("en-IN", { weekday: "long" })
      );
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [fromDate, toDate, mode]);
  const totalDays = daysList.length || 1;
  async function save() {
    if (!title || !fromDate || (mode === "multi" && !toDate)) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/holiday/create", {
        branch,
        session: sessionSelected,
        title,
        from: fromDate,
        to: mode === "multi" ? toDate : null,
        days: totalDays,
        daysList,
      });
      toast.success("Holiday added successfully");
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add holiday");
    } finally {
      setLoading(false);
    }
  }
  const visibleDays = daysList.slice(0, 4);
  const remaining = daysList.length - visibleDays.length;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-5 z-50">
      <div className="bg-(--bg-card) w-full max-w-md rounded-2xl overflow-hidden border border-(--border)">
        <div className="px-6 py-4 bg-(--bg) border-b border-(--border) flex justify-between items-center">
          <h2 className="font-semibold">Add Holiday</h2>
          <button onClick={onClose} className="text-(--text-muted) font-semibold">✕</button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-auto">
          <FilterSelect
            label="Session"
            value={sessionSelected}
            onChange={v =>
              setSessionSelected(v)
            }
            options={sessionList ? sessionList.map(s => ({
              label: s.id,
              value: s.id,
            })) : []}
          />
          <div>
            <p className="text-sm font-medium text-(--text-muted)">
              Holiday Title
            </p>
            <input
              className="input mt-1"
              placeholder="Eg. Diwali, Independence Day"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {["single", "multi"].map(m => {
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg border font-semibold text-sm
                    ${active
                      ? "bg-(--primary-soft) text-(--primary) border-(--primary)"
                      : "bg-(--bg) border-(--border)"
                    }`}
                >
                  {m === "single" ? "Single Day" : "Multiple Days"}
                </button>
              );
            })}
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-(--text-muted)">From</p>
              <input
                type="date"
                className="input mt-1"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
            </div>
            {mode === "multi" && (
              <div className="flex-1">
                <p className="text-sm font-medium text-(--text-muted)">To</p>
                <input
                  type="date"
                  className="input mt-1"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </div>
            )}
          </div>
          {fromDate && (
            <div className="mt-4 px-4 py-3 rounded-xl border border-(--border) bg-(--bg-card)">
              <p className="text-sm text-(--text-muted) font-medium">Holiday Summary</p>
              <div className="flex justify-between items-center">
                <p className="text-md font-semibold">
                  {totalDays} Day{totalDays > 1 ? "s" : ""}
                </p>
                <span className="px-3 py-1 rounded-full text-xs font-semibold
                  bg-(--primary-soft) text-(--primary)">
                  {session}
                </span>
              </div>
              <div className="my-3 h-px bg-(--border)" />
              <div className="flex flex-wrap gap-2">
                {visibleDays.map((d, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-xs font-medium
                      bg-(--bg) border border-(--border)"
                  >
                    {d}
                  </span>
                ))}
                {remaining > 0 && (
                  <span
                    className="px-3 py-1.5 rounded-full text-xs font-medium
                      bg-(--bg) border border-(--border) text-(--text-muted)"
                  >
                    +{remaining} more
                  </span>
                )}
              </div>
              <p className="text-xs text-(--text-muted) mt-3">
                Please review the holiday details before saving.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button onClick={save} className="btn-primary">
              Add Holiday
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
