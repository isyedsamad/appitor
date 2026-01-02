"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  Clock,
  CalendarDays,
  Coffee,
  Save,
  Trash2,
} from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import RequirePermission from "@/components/school/RequirePermission";

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
          setForm(snap.data());
          setIsNew(false);
        } else {
          setForm({
            startTime: "",
            periodDuration: "",
            totalPeriods: "",
            workingDays: [],
            breaks: [],
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
    <RequirePermission permission={'timetable.edit'}>
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-(--primary-soft) text-(--primary)">
          <CalendarClock size={20} />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-(--text)">
            Timetable Settings
          </h1>
          <p className="text-sm text-(--text-muted)">
            {isNew
              ? "Set up timetable rules for this branch"
              : "Manage school-wide timetable timing and structure"}
          </p>
        </div>
      </div>
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
                  ${
                    form.workingDays.includes(d.key)
                      ? "bg-(--primary) text-white border-(--primary)"
                      : "bg-(--bg) border-(--border) text-(--text-muted)"
                  }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
        <div className="xl:col-span-2 bg-(--bg-card) border border-(--border) rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <SectionTitle icon={Coffee} title="Breaks" />
            <button
              onClick={addBreak}
              className="text-sm text-(--primary) btn-outline py-1"
            >
              + Add Break
            </button>
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
                <button
                  onClick={() => removeBreak(i)}
                  className="text-sm text-(--danger) btn-outline py-2 text-left"
                >
                  <Trash2 size={16} />Remove
                </button>
              </div>
            ))}
          </div>
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
