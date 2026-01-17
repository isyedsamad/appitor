"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Search,
  Plus,
  Save,
  X,
  Calendar,
} from "lucide-react";

import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { hasPermission } from "@/lib/school/permissionUtils";
import secureAxios from "@/lib/secureAxios";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate, formatInputDate } from "@/lib/dateUtils";
import { toast } from "react-toastify";

export default function HomeworkPage() {
  const {
    schoolUser,
    classData,
    setLoading,
    subjectData,
    employeeData
  } = useSchool();

  const { branch } = useBranch();
  const isAdmin = hasPermission(schoolUser, "learning.all", false);
  const [filters, setFilters] = useState({
    classId: "",
    sectionId: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [homeworkDoc, setHomeworkDoc] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [timetableOptions, setTimetableOptions] = useState([]);
  const [timetableSettings, setTimetableSettings] = useState(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    classId: "",
    sectionId: "",
    timetableKey: "",
    content: "",
  });

  const getClassName = id => classData.find(c => c.id === id)?.name;
  const selectedClass = classData && classData?.find(c => c.id === form.classId);
  const getSection = (cid, sid) => classData?.find(c => c.id === cid)?.sections.find(s => s.id == sid)?.name;
  const getTeacherName = id =>
    employeeData.find(t => t.uid === id)?.name;
  const getSubjectName = id =>
    subjectData.find(s => s.id === id)?.name;

  useEffect(() => {
    async function fetchTimetableSettings() {
      setLoading(true);
      try {
        const ref = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "timetable",
          "items",
          "timetableSettings",
          "global"
        );
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setTimetableSettings(snap.data());
        }
      } finally {
        setLoading(false);
      }
    }
    fetchTimetableSettings();
  }, []);

  useEffect(() => {
    if (!openAdd || isAdmin) return;
    if(timetableOptions.length > 0) return;
    async function fetchTeacherTimetable() {
      setLoading(true);
      try {
        const DAY_MAP = timetableSettings.workingDays;
        const today = DAY_MAP[(new Date().getDay()) - 1];
        const ref = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "timetable",
          "items",
          "teachers",
          schoolUser.uid
        );
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setTimetableOptions([]);
          return;
        }
        const slots = snap.data().slots || [];
        const todaySlots = slots.filter(s => s.day === today);
        const options = todaySlots.map(s => ({
          period: s.period,
          classId: s.classId,
          sectionId: s.sectionId,
          subjectId: s.subjectId,
          day: today
        }));
        setTimetableOptions(options);
      } finally {
        setLoading(false);
      }
    }
    fetchTeacherTimetable();
  }, [openAdd]);

  useEffect(() => {
    if (!openAdd || !isAdmin) return;
    if (!form.classId || !form.sectionId || !form.date) return;
    async function fetchClassSectionTimetable() {
      setLoading(true);
      try {
        const DAY_MAP = timetableSettings.workingDays;
        const day = DAY_MAP[(new Date(form.date).getDay()) - 1];
        const classRef = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "timetable",
          "items",
          "classes",
          `${form.classId}_${form.sectionId}`
        );
        const classSnap = await getDoc(classRef);
        if (!classSnap.exists()) {
          setTimetableOptions([]);
          return;
        }
        const dayEntries =
          classSnap.data().days?.[day] || [];
        if (dayEntries.length === 0) {
          setTimetableOptions([]);
          return;
        }
        const options = [];
        for (const segment of dayEntries) {
          for(const element of segment.entries) {
            options.push({
              period: segment.period,
              subjectId: element.subjectId,
              teacherId: element.teacherId,
              classId: form.classId,
              sectionId: form.sectionId,
              day
            });
          }
        }
        setTimetableOptions(options);
      } catch(err) {
        toast.error('Failed: ' + err);
      } finally {
        setLoading(false);
      }
    }
    fetchClassSectionTimetable();
  }, [openAdd, form.classId, form.sectionId, form.date]);
  
  async function saveHomework() {
    if (!form.timetableKey || !form.content) {
      alert("Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/learning/homework", {
        branch,
        date: isAdmin ? formatInputDate(form.date) : formatInputDate(filters.date),
        classId: isAdmin ? form.classId : undefined,
        sectionId: isAdmin ? form.sectionId : undefined,
        timetable: JSON.parse(form.timetableKey),
        content: form.content,
      });
      setOpenAdd(false);
      setForm({
        date: new Date().toISOString().slice(0, 10),
        classId: "",
        sectionId: "",
        timetableKey: "",
        content: "",
      });
      searchHomework();
      toast.success('Homework saved successfully!');
    } catch(err) {
      toast.error('Failed: ' + err.response.data.message);
    } finally {
      setLoading(false);
    }
  }

  // async function saveHomework() {
  //   if (!canCreateHomework) {
  //     toast.show({
  //       type: "error",
  //       text1: "Permission denied",
  //       text2: "You are not allowed to add homework",
  //     });
  //     return;
  //   }
  //   if (!form.content.trim()) {
  //     toast.show({
  //       type: "error",
  //       text1: "Homework required",
  //       text2: "Please enter homework content",
  //     });
  //     return;
  //   }
  //   if (timetableActive && !selectedSlot) {
  //     toast.show({
  //       type: "error",
  //       text1: "Select Period",
  //       text2: "Choose a class period from today’s timetable",
  //     });
  //     return;
  //   }
  //   if (!timetableActive) {
  //     if (!classId || !sectionId || !subjectId) {
  //       toast.show({
  //         type: "error",
  //         text1: "Missing fields",
  //         text2: "Select class, section and subject",
  //       });
  //       return;
  //     }
  //   }
  //   setLoading(true);
  //   try {
  //     await secureAxios.post("/api/school/learning/homework", {
  //       branch: schoolUser.currentBranch,
  //       date,
  //       classId: !timetableActive ? classId : undefined,
  //       sectionId: !timetableActive ? sectionId : undefined,
  //       timetable: timetableActive
  //         ? {
  //             period: selectedSlot.period,
  //             classId: selectedSlot.classId,
  //             sectionId: selectedSlot.sectionId,
  //             subjectId: selectedSlot.subjectId,
  //             teacherId: schoolUser.uid,
  //           }
  //         : {
  //             period: null,
  //             classId,
  //             sectionId,
  //             subjectId,
  //             teacherId: schoolUser.uid,
  //           },
  //       content: form.content.trim(),
  //     });
  //     toast.show({
  //       type: "success",
  //       text1: "Homework Added",
  //       text2: "Homework saved successfully",
  //     });
  //     setOpenAdd(false);
  //     setContent("");
  //     setSelectedSlot(null);
  //     searchHomework();
  //   } catch (err) {
  //     toast.show({
  //       type: "error",
  //       text1: "Failed to save homework",
  //       text2: err?.response?.data?.message || "Server error",
  //     });
  //   } finally {
  //     setLoading(false);
  //   }
  // }  

  const closeHomework = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      classId: "",
      sectionId: "",
      timetableKey: "",
      content: "",
    });
    setOpenAdd(false)
  }

  async function searchHomework() {
    if (!filters.classId || !filters.sectionId || !filters.date) {
      return;
    }
    setLoading(true);
    try {
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "learning",
        "items",
        "homework",
        `${filters.classId}_${filters.sectionId}_${formatInputDate(filters.date)}`
      );
      const snap = await getDoc(ref);
      setHomeworkDoc(snap.exists() ? snap.data() : null);
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <RequirePermission permission="learning.manage">
      <div className="space-y-5">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-(--text)">
                Homework
              </h1>
              <p className="text-sm text-(--text-muted)">
                Class-wise daily homework management
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpenAdd(true)}
            className="btn-primary flex justify-center items-center gap-2"
          >
            <Plus size={16} /> Add Homework
          </button>
        </div>
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex flex-col">
            <p className="font-medium text-sm text-(--text-muted)">Date</p>
            <input
              type="date"
              className="input"
              value={filters.date}
              onChange={(e) =>
                setFilters({ ...filters, date: e.target.value })
              }
            />
          </div>
          <div className="flex flex-col">
            <p className="font-medium text-sm text-(--text-muted)">Class</p>
            <select
              className="input"
              value={filters.classId}
              onChange={(e) =>
                setFilters({ ...filters, classId: e.target.value, sectionId: "" })
              }
            >
              <option value="">Select Class</option>
              {classData && classData.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <p className="font-medium text-sm text-(--text-muted)">Section</p>
            <select
              className="input"
              value={filters.sectionId}
              disabled={!filters.classId}
              onChange={(e) =>
                setFilters({ ...filters, sectionId: e.target.value })
              }
            >
              <option value="">Select Section</option>
              {(classData && classData.find(c => c.id === filters.classId)?.sections || []).map(
                (s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                )
              )}
            </select>
          </div>
          <button
            onClick={searchHomework}
            className="btn-primary flex items-center gap-2"
          >
            <Search size={16} /> Search
          </button>
        </div>
        {!homeworkDoc && (
          <div className="text-center text-sm text-(--text-muted) py-12">
            Search to view homework
          </div>
        )}
        {homeworkDoc && (
          <div className="grid md:grid-cols-3 gap-3">
            {homeworkDoc.items?.length === 0 && (
              <div className="bg-(--bg-card) border border-(--border) rounded-lg p-6 text-center">
                <p className="text-sm text-(--text-muted)">
                  No homework added yet for this day
                </p>
              </div>
            )}
            {homeworkDoc.items?.map((i, idx) => (
              <div
                key={idx}
                className="group bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden transition hover:shadow-md"
              >
                <div className="flex items-center justify-between px-5 py-3 bg-(--bg)">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-(--primary-soft) text-(--primary) font-semibold">
                      P{i.period}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-(--text)">
                        {getSubjectName(i.subjectId)}
                      </p>
                      <p className="text-xs font-medium text-(--text-muted)">
                        Period {i.period}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 capitalize rounded-full bg-(--bg-card) border border-(--border) text-(--text-muted)">
                    {getTeacherName(i.teacherId)}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm leading-relaxed text-(--text)">
                    {i.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {openAdd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm px-5 flex items-center justify-center z-50">
            <div className="bg-(--bg-card) w-full max-w-md rounded-lg">
              <div className="flex justify-between bg-(--bg) py-4 px-5 rounded-t-lg">
                <h2 className="font-semibold">Add Homework</h2>
                <button onClick={() => closeHomework()}>
                  <X />
                </button>
              </div>
              <div className="pt-4 pb-6 px-5 max-h-[80dvh] overflow-x-auto">
                {isAdmin && (
                  <>
                    <div className="flex flex-col">
                      <p className="text-(--text-muted) font-medium text-sm">Date</p>
                      <input
                        type="date"
                        className="input mb-3"
                        value={form.date}
                        onChange={(e) =>
                          setForm({ ...form, date: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col">
                      <p className="text-(--text-muted) font-medium text-sm">Class</p>
                      <select
                        className="input mb-3"
                        value={form.classId}
                        onChange={(e) =>
                          setForm({ ...form, classId: e.target.value, sectionId: "" })
                        }
                      >
                        <option value="">Select Class</option>
                        {classData.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col">
                      <p className="text-(--text-muted) font-medium text-sm">Section</p>
                      <select
                        className="input mb-3"
                        disabled={!form.classId}
                        value={form.sectionId}
                        onChange={(e) =>
                          setForm({ ...form, sectionId: e.target.value })
                        }
                      >
                        <option value="">Select Section</option>
                        {(classData && classData.find(c => c.id === form.classId)?.sections || []).map(
                          (s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          )
                        )}
                      </select>
                    </div>
                  </>
                )}
                <div className="flex flex-col">
                  <p className="text-(--text-muted) font-medium text-sm">Period</p>
                  <select
                    className="input mb-3"
                    value={form.timetableKey}
                    onChange={(e) =>
                      setForm({ ...form, timetableKey: e.target.value })
                    }
                  >
                    <option value="">Select Period / Subject</option>
                    {timetableOptions.map((t) => (
                      <option
                        key={`${t.period}---=---${t.subjectId}`}
                        value={JSON.stringify(t)}
                      >
                        {!isAdmin && `${getClassName(t.classId)} ${getSection(t.classId, t.sectionId)} · `}
                        P{t.period} · {getSubjectName(t.subjectId)}
                        {isAdmin && ` · ${capitalizeWords(getTeacherName(t.teacherId))}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <p className="text-(--text-muted) font-medium text-sm">Homework</p>
                  <textarea
                    className="input h-22 mb-4"
                    placeholder="Enter homework..."
                    value={form.content}
                    onChange={(e) =>
                      setForm({ ...form, content: e.target.value })
                    }
                  />
                </div>
                <button
                  onClick={saveHomework}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Save Homework
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}


function capitalizeWords(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}