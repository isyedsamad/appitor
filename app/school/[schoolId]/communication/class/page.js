"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Plus, Search, Save, X, Trash2, AlertCircle } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { hasPermission } from "@/lib/school/permissionUtils";
import secureAxios from "@/lib/secureAxios";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-toastify";
import { useTheme } from "next-themes";

export default function ClassNoticePage() {
  const { theme } = useTheme();
  const { schoolUser, classData, sessionList, setLoading } = useSchool();
  const { branch } = useBranch();
  const canManage = hasPermission(schoolUser, "communication.manage", false);
  const canDelete = hasPermission(schoolUser, "communication.all", false);
  const [sendPush, setSendPush] = useState(true);
  const [filters, setFilters] = useState({
    sessionId: schoolUser?.currentSession || "",
    classId: "",
    sectionId: "",
  });

  const [noticeDoc, setNoticeDoc] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    sessionId: "",
    classId: "",
    sectionId: "",
    title: "",
    description: "",
    roles: ["student"],
    priority: "normal",
  });

  function formatDate(ts) {
    if (!ts) return "-";
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function isExpired(ts) {
    if (!ts) return false;
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.getTime() < Date.now();
  }

  function isVisibleToUser(n) {
    return (
      schoolUser.permissions.includes("*") ||
      n.roles?.includes(schoolUser.roleName)
    );
  }

  function getClassName(id) {
    return classData.find((c) => c.id === id)?.name || "-";
  }

  function getSectionName(cid, sid) {
    return (
      classData
        .find((c) => c.id === cid)
        ?.sections.find((s) => s.id === sid)?.name || "-"
    );
  }

  useEffect(() => {
    if (schoolUser?.currentSession) {
      setFilters((f) => ({ ...f, sessionId: schoolUser.currentSession }));
      setForm((f) => ({ ...f, sessionId: schoolUser.currentSession }));
    }
  }, [schoolUser?.currentSession]);

  async function searchNotices() {
    const { sessionId, classId, sectionId } = filters;
    if (!sessionId || !classId || !sectionId) return;
    setLoading(true);
    try {
      const docId = `${classId}_${sectionId}_${sessionId}`;
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "communication",
        "items",
        "class_notices",
        docId
      );
      const snap = await getDoc(ref);
      setNoticeDoc(snap.exists() ? snap.data() : null);
    } finally {
      setLoading(false);
    }
  }

  async function saveNotice() {
    if (!form.title || !form.description || !form.classId || !form.sectionId) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/communication/class-notices", {
        branch,
        schoolName: schoolUser.schoolName,
        ...form,
        sendPush,
      });
      toast.success("Class notice published");
      setOpenAdd(false);
      setForm({
        sessionId: schoolUser.currentSession,
        classId: "",
        sectionId: "",
        title: "",
        description: "",
        roles: ["student", "teacher"],
        priority: "normal",
      });
      searchNotices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNotice(noticeId) {
    if (!confirm("Delete this class notice?")) return;
    setLoading(true);
    try {
      await secureAxios.delete("/api/school/communication/class-notices", {
        data: {
          branch,
          sessionId: filters.sessionId,
          classId: filters.classId,
          sectionId: filters.sectionId,
          noticeId,
        },
      });
      toast.success("Notice deleted");
      searchNotices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  const notices =
    noticeDoc?.items?.filter(
      (n) =>
        isVisibleToUser(n) &&
        (!n.expiresAt || !isExpired(n.expiresAt))
    ) || [];

  return (
    <RequirePermission permission="communication.manage">
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <MessageSquare size={20} />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Class Notice</h1>
              <p className="text-sm text-(--text-muted)">
                Class & section specific announcements
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setOpenAdd(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Add Class Notice
            </button>
          )}
        </div>
        <div className="grid lg:grid-cols-6 gap-3 items-end">
          <div className="flex flex-col">
            <p className="text-sm text-(--text-muted)">Session</p>
            <select
              className="input"
              value={filters.sessionId}
              onChange={(e) =>
                setFilters({ ...filters, sessionId: e.target.value })
              }
            >
              <option value="">Select Session</option>
              {sessionList?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-(--text-muted)">Class</p>
            <select
              className="input"
              value={filters.classId}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  classId: e.target.value,
                  sectionId: "",
                })
              }
            >
              <option value="">Select Class</option>
              {classData.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <p className="text-sm text-(--text-muted)">Section</p>
            <select
              className="input"
              disabled={!filters.classId}
              value={filters.sectionId}
              onChange={(e) =>
                setFilters({ ...filters, sectionId: e.target.value })
              }
            >
              <option value="">Select Section</option>
              {(classData.find((c) => c.id === filters.classId)
                ?.sections || []
              ).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={searchNotices}
            className="btn-primary flex items-center gap-2"
          >
            <Search size={16} /> Search
          </button>
        </div>

        {!noticeDoc && (
          <div className="text-center text-sm text-(--text-muted) py-12">
            Select class & section to view notices
          </div>
        )}

        {notices.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notices.map((n) => (
              <div
                key={n.noticeId}
                className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden"
              >
                <div className="flex justify-between px-5 py-3 bg-(--bg) border-b border-(--border)">
                  <div>
                    <p className="font-semibold">{n.title}</p>
                    <p className="text-xs text-(--text-muted)">
                      {getClassName(filters.classId)}{" "}
                      {getSectionName(filters.classId, filters.sectionId)}
                    </p>
                  </div>
                  {n.priority === "important" && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                        theme === "dark"
                          ? "bg-red-950 text-red-500"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      <AlertCircle size={12} /> Important
                    </span>
                  )}
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm line-clamp-4">{n.description}</p>
                </div>
                <div className="flex justify-between items-center px-5 py-3 border-t border-(--border)">
                  <p className="text-xs text-(--text-muted)">
                    {n.createdByName} • {formatDate(n.createdAt)}
                  </p>
                  {canDelete && (
                    <button
                      onClick={() => deleteNotice(n.noticeId)}
                      className="text-(--danger)"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {openAdd && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-(--bg-card) w-full max-w-lg rounded-xl overflow-hidden border border-(--border)">
              <div className="flex justify-between items-center px-5 py-3 bg-(--bg) border-b border-(--border)">
                <div>
                  <h2 className="font-semibold text-lg">Create Class Notice</h2>
                  <p className="text-xs text-(--text-muted)">
                    Announcement for a specific class & section
                  </p>
                </div>
                <button
                  onClick={() => setOpenAdd(false)}
                  className="text-(--text-muted) hover:text-(--text)"
                >
                  <X />
                </button>
              </div>
              <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      Class <span className="text-(--danger)">*</span>
                    </label>
                    <select
                      className="input"
                      value={form.classId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          classId: e.target.value,
                          sectionId: "",
                        })
                      }
                    >
                      <option value="">Select Class</option>
                      {classData.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">
                      Section <span className="text-(--danger)">*</span>
                    </label>
                    <select
                      className="input"
                      disabled={!form.classId}
                      value={form.sectionId}
                      onChange={(e) =>
                        setForm({ ...form, sectionId: e.target.value })
                      }
                    >
                      <option value="">Select Section</option>
                      {(classData.find((c) => c.id === form.classId)
                        ?.sections || []
                      ).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    Notice Title <span className="text-(--danger)">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. Maths test postponed"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">
                    Description <span className="text-(--danger)">*</span>
                  </label>
                  <textarea
                    className="input h-18 resize-none"
                    placeholder="Write the notice content here..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Priority</label>
                  <select
                    className="input"
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                  >
                    <option value="normal">Normal</option>
                    <option value="important">Important</option>
                  </select>
                  <p className="text-xs text-(--text-muted)">
                    Important notices are highlighted in the app
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Notification</label>
                  <label
                    className={`flex items-start gap-3 border-2 rounded-lg px-4 py-3 cursor-pointer transition
                      ${
                        sendPush
                          ? "border-(--primary) bg-(--primary-soft)"
                          : "border-(--border)"
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={sendPush}
                      onChange={(e) => setSendPush(e.target.checked)}
                      className="mt-1 max-w-5"
                    />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        Send push notification
                      </p>
                      <p className="text-xs text-(--text-muted)">
                        Notify students of this class instantly
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-(--border) bg-(--bg) flex justify-end gap-3">
                <button
                  className="btn-outline"
                  onClick={() => setOpenAdd(false)}
                >
                  Cancel
                </button>
                <button
                  onClick={saveNotice}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save size={16} /> Publish Notice
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
