"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Clock,
  CalendarDays,
  Coffee,
  Save,
  Trash2,
  Zap,
  Settings,
  Info
} from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RequirePermission from "@/components/school/RequirePermission";
import { canManage } from "@/lib/school/permissionUtils";

const DAYS = [
  { key: "MON", label: "Mon" },
  { key: "TUE", label: "Tue" },
  { key: "WED", label: "Wed" },
  { key: "THU", label: "Thu" },
  { key: "FRI", label: "Fri" },
  { key: "SAT", label: "Sat" },
  { key: "SUN", label: "Sun" },
];

export default function TimetableSettingsPage() {
  const { setLoading, schoolUser } = useSchool();
  const { branch, branchInfo } = useBranch();

  const [form, setForm] = useState(null);
  const [isNew, setIsNew] = useState(false);

  const currentPlan = branchInfo?.plan || schoolUser?.plan || "trial";
  const editable = canManage(schoolUser, "timetable.settings.manage", currentPlan);
  const isTimetableActive = form?.status === "active";

  useEffect(() => {
    if (!branch || !schoolUser?.schoolId) return;
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const ref = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          'timetable',
          'items',
          "timetableSettings",
          "global"
        );
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setForm({
            status: "inactive",
            ...snap.data()
          });
          setIsNew(false);
        } else {
          setForm({
            startTime: "",
            periodDuration: "",
            totalPeriods: "",
            workingDays: [],
            breaks: [],
            status: "inactive",
          });
          setIsNew(true);
        }
      } catch (error) {
        console.error(error);
        toast.error("Failed to load timetable settings");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [branch, schoolUser?.schoolId]);
  const toggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };
  const handleToggleActive = async (checked) => {
    if (!editable) return;
    const newStatus = checked ? "active" : "inactive";
    const updatedForm = {
      ...form,
      status: newStatus,
    };
    setForm(updatedForm);
    try {
      setLoading(true);
      await secureAxios.post("/api/school/timetable/settings", {
        branch,
        ...updatedForm,
      });
      toast.success(checked ? "Structured timetable mode enabled" : "Manual input mode enabled");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update: " + err.message);
      setForm((prev) => ({
        ...prev,
        status: checked ? "inactive" : "active",
      }));
    } finally {
      setLoading(false);
    }
  };
  const updateBreak = (i, key, value) => {
    const updated = [...form.breaks];
    updated[i][key] = value;
    setForm({ ...form, breaks: updated });
  };
  const addBreak = () => {
    setForm({
      ...form,
      breaks: [
        ...form.breaks,
        { label: "", afterPeriod: "", duration: "" },
      ],
    });
  };
  const removeBreak = (i) => {
    setForm({
      ...form,
      breaks: form.breaks.filter((_, index) => index !== i),
    });
  };
  const isValidBreak = (b) =>
    b.label?.trim() &&
    b.afterPeriod !== "" &&
    b.duration !== "";
  const saveSettings = async () => {
    const invalidBreak = form.breaks?.find(b => !isValidBreak(b));
    if (invalidBreak) {
      toast.error("Please fill all break fields!");
      return;
    }
    try {
      setLoading(true);
      await secureAxios.post("/api/school/timetable/settings", {
        branch,
        ...form,
      });
      toast.success("Timetable Settings Saved Successfully");
      setIsNew(false);
    } catch (err) {
      console.log(err);

      toast.error("Failed: " + err);
    } finally {
      setLoading(false);
    }
  };

  if (!form) return null;

  return (
    <RequirePermission permission="timetable.settings.view">
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-lg shadow-sm border border-(--primary)/20 bg-(--primary-soft) text-(--primary)">
            <Settings size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-(--text)">
              Timetable Settings
            </h1>
            <p className="text-xs font-semibold text-(--text-muted)">
              Manage school-wide timetable rules, active states, and schedule details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 border-b border-(--border) pb-6">
          <div className="lg:col-span-5 bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <SectionTitle icon={Zap} title="Homework Assignment Mode" />
              <p className="text-xs text-(--text-muted) mt-2 leading-relaxed">
                Toggle whether teachers use a structured timetable schedule or manual forms for daily homework entry.
              </p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-(--bg) border border-(--border)">
              <div className="space-y-1">
                <p className="text-sm font-bold text-(--text)">
                  {isTimetableActive ? "Structured Timetable" : "Manual Input Form"}
                </p>
                <p className="text-xs text-(--text-muted)">
                  {isTimetableActive ? "Timetable is active branch-wide" : "Timetable is disabled"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleActive(!isTimetableActive)}
                disabled={!editable}
                className={`relative inline-flex h-7 w-12 items-center justify-start shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isTimetableActive ? 'bg-(--primary)' : 'bg-gray-300 dark:bg-gray-700'
                  } ${!editable ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isTimetableActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-(--text-muted) bg-(--primary-soft)/20 border border-(--primary)/10 p-3 rounded-lg">
              <Info size={14} className="text-(--primary) shrink-0" />
              <span>Status auto-saves immediately on toggling.</span>
            </div>
          </div>

          <div className="lg:col-span-7 bg-(--bg-card) border border-(--border) rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-(--text)">What is this setting?</h3>
              <p className="text-xs text-(--text-muted) leading-relaxed">
                Determines how homework is assigned in this branch. Click a card below to toggle the mode.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleToggleActive(true)}
                  disabled={!editable}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${isTimetableActive
                      ? 'border-emerald-500/40 bg-emerald-500/5 shadow-sm'
                      : 'border-(--border) bg-(--bg)/50 opacity-60 hover:opacity-100 hover:border-emerald-500/30'
                    }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-500">Enabled</span>
                    </div>
                    <p className="text-xs font-semibold text-(--text) mb-1">
                      Structured Timetable Active
                    </p>
                    <p className="text-[11px] text-(--text-muted) leading-relaxed">
                      Loads the teacher's scheduled classes and subjects for today. The teacher selects the corresponding time slot and writes the homework content.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleActive(false)}
                  disabled={!editable}
                  className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${!isTimetableActive
                      ? 'border-amber-500/40 bg-amber-500/5 shadow-sm'
                      : 'border-(--border) bg-(--bg)/50 opacity-60 hover:opacity-100 hover:border-amber-500/30'
                    }`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-500">Disabled</span>
                    </div>
                    <p className="text-xs font-semibold text-(--text) mb-1">
                      Manual selection form active
                    </p>
                    <p className="text-[11px] text-(--text-muted) leading-relaxed">
                      Displays dropdown pickers so the teacher can manually select the Class, Section, Period, and Subject.
                    </p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-(--text)">Timetable Structure Settings</h2>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-4">
              <SectionTitle icon={Clock} title="School Timing" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="School Start Time">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm({ ...form, startTime: e.target.value })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Period Duration (min)">
                  <input
                    type="number"
                    value={form.periodDuration}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        periodDuration: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
                <Field label="Total Periods / Day">
                  <input
                    type="number"
                    value={form.totalPeriods}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        totalPeriods: Number(e.target.value),
                      })
                    }
                    className="input"
                  />
                </Field>
              </div>
            </div>
            <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-4">
              <SectionTitle icon={CalendarDays} title="Working Days" />
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => toggleDay(d.key)}
                    className={`px-4 py-2 rounded-lg border text-sm transition
                    ${form.workingDays.includes(d.key)
                        ? "bg-(--primary) text-white border-(--primary)"
                        : "bg-(--bg) border-(--border) text-(--text-muted)"
                      }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <SectionTitle icon={Coffee} title="Breaks" />
              {editable && (
                <button
                  onClick={addBreak}
                  className="text-sm text-(--primary) bg-(--primary-soft) btn-outline border-(--primary) py-1"
                >
                  + Add Break
                </button>
              )}
            </div>
            {form.breaks.length === 0 && (
              <p className="text-sm text-(--text-muted)">
                No breaks added yet
              </p>
            )}
            <div className="space-y-3">
              {form.breaks.map((brk, i) => (
                <div
                  key={i}
                  className="grid grid-cols-1 md:grid-cols-4 items-end gap-3"
                >
                  <Field label="Break Name">
                    <input
                      value={brk.label}
                      onChange={(e) =>
                        updateBreak(i, "label", e.target.value)
                      }
                      placeholder="i.e. Lunch Break"
                      className="input"
                    />
                  </Field>
                  <Field label="Break after which Period">
                    <input
                      type="number"
                      value={brk.afterPeriod}
                      onChange={(e) =>
                        updateBreak(i, "afterPeriod", Number(e.target.value))
                      }
                      placeholder="i.e. 3"
                      className="input"
                    />
                  </Field>
                  <Field label="Duration (min)">
                    <input
                      type="number"
                      value={brk.duration}
                      onChange={(e) =>
                        updateBreak(i, "duration", Number(e.target.value))
                      }
                      placeholder="i.e. 20"
                      className="input"
                    />
                  </Field>
                  {editable && (
                    <button
                      onClick={() => removeBreak(i)}
                      className="text-sm text-(--status-a-text) bg-(--status-a-bg) btn-outline py-2 text-left"
                    >
                      <Trash2 size={16} />Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={saveSettings}
              className="flex items-center gap-2 px-6 py-2 rounded-lg bg-(--primary) text-white hover:bg-(--primary-hover)"
            >
              <Save size={18} />
              {isNew ? "Create Settings" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </RequirePermission>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-sm text-(--text-muted)">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 font-medium text-(--text)">
      <Icon size={18} className="text-(--primary)" />
      {title}
    </div>
  );
}
