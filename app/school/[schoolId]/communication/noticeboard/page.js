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

export default function NoticeboardPage() {
  const { theme } = useTheme();
  const { schoolUser, sessionList, setLoading } = useSchool();
  const { branch } = useBranch();
  const canManage = hasPermission(schoolUser, "communication.manage", false);
  const canDelete = hasPermission(schoolUser, "communication.all", false);
  const [sendPush, setSendPush] = useState(true);
  const [filters, setFilters] = useState({
    sessionId: schoolUser?.currentSession || "",
  });
  const [noticeDoc, setNoticeDoc] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({
    sessionId: "",
    title: "",
    description: "",
    roles: ['student', 'teacher'],
    priority: "normal",
    expiresAt: "",
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

  function isVisibleToUser(notice) {
    return schoolUser.permissions.includes('*') || notice.roles?.includes(schoolUser.roleName);
  }

  useEffect(() => {
    if (schoolUser?.currentSession) {
      setFilters({ sessionId: schoolUser?.currentSession });
      setForm((f) => ({ ...f, sessionId: schoolUser?.currentSession }));
    }
  }, [schoolUser?.currentSession]);

  async function searchNotices() {
    if (!filters.sessionId) return;
    setLoading(true);
    try {
      const ref = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "communication",
        "items",
        "notices",
        filters.sessionId
      );
      const snap = await getDoc(ref);
      setNoticeDoc(snap.exists() ? snap.data() : null);
    } finally {
      setLoading(false);
    }
  }

  async function saveNotice() {
    if (!form.title || !form.description || form.roles.length === 0) {
      toast.error("Please fill all required fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/communication/notices", {
        branch,
        schoolName: schoolUser.schoolName,
        ...form,
        sendPush,
      });
      toast.success("Notice published successfully");
      setOpenAdd(false);
      setForm({
        sessionId: schoolUser?.currentSession || "",
        title: "",
        description: "",
        roles: ['student', 'teacher'],
        priority: "normal",
        expiresAt: "",
      });
      searchNotices();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNotice(noticeId) {
    if (!confirm("Are you sure you want to delete this notice?")) return;
    setLoading(true);
    try {
      await secureAxios.delete("/api/school/communication/notices", {
        data: {
          branch,
          sessionId: filters.sessionId,
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
              <h1 className="text-lg font-semibold">Noticeboard</h1>
              <p className="text-sm text-(--text-muted)">
                School-wide announcements & updates
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={() => setOpenAdd(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} /> Add Notice
            </button>
          )}
        </div>
        <div className="grid lg:grid-cols-5 gap-3 items-end">
          <div className="flex flex-col">
            <p className="text-(--text-muted) font-medium text-sm">Session</p>
            <select
              className="input"
              value={filters.sessionId}
              onChange={(e) =>
                setFilters({ sessionId: e.target.value })
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
          <button
            onClick={searchNotices}
            className="btn-primary flex items-center gap-2"
          >
            <Search size={16} /> Search
          </button>
        </div>
        {!noticeDoc && (
          <div className="text-center text-sm text-(--text-muted) py-12">
            Search to view notices
          </div>
        )}
        {noticeDoc && notices.length === 0 && (
          <div className="text-center text-sm text-(--text-muted) py-12">
            No notices available for this session
          </div>
        )}
        {notices.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {notices.map((n) => (
              <div
                key={n.noticeId}
                className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden transition shadow-xs hover:shadow-md"
              >
                <div className="flex justify-between items-start px-5 py-3 bg-(--bg) border-b border-(--border)">
                  <div>
                    <p className="font-semibold text-md">{n.title}</p>
                    <p className="text-xs text-(--text-muted) font-medium">
                      Visible to: <span className="capitalize">{n.roles.join(", ")}</span>
                    </p>
                  </div>
                  {n.priority === "important" && (
                    <span
                      className={`text-xs px-2 py-1 rounded-full flex items-center gap-1
                        ${
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
                  <p className="text-sm text-(--text) line-clamp-4">
                    {n.description}
                  </p>
                </div>
                <div className="flex justify-between items-center px-5 py-3 border-t border-(--border)">
                  <p className="text-xs text-(--text-muted)">
                    {n.createdByName} • {formatDate(n.createdAt)}
                  </p>
                  {canDelete && (
                    <button
                      onClick={() => deleteNotice(n.noticeId)}
                      className="text-(--danger) px-2"
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
                  <h2 className="font-semibold text-lg">Create Notice</h2>
                  <p className="text-xs text-(--text-muted)">
                    Publish a school-wide announcement
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
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-(--text)">
                    Notice Title <span className="text-(--danger)">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="e.g. School Closed Tomorrow"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-(--text)">
                    Description <span className="text-(--danger)">*</span>
                  </label>
                  <textarea
                    className="input h-18 resize-none"
                    placeholder="Write the full notice content here..."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-(--text)">
                  Select who should see this notice <span className="text-(--danger)">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: "student", label: "Students" },
                      { id: "teacher", label: "Employee" },
                    ].map((r) => {
                      const checked = form.roles.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center gap-2 border-2 rounded-lg px-3 py-2 cursor-pointer transition
                            ${
                              checked
                                ? "border-(--primary) bg-(--primary-soft)"
                                : "border-(--border)"
                            }
                          `}
                        >
                          <input
                            type="checkbox"
                            className="max-w-5"
                            checked={checked}
                            onChange={(e) =>
                              setForm({
                                ...form,
                                roles: e.target.checked
                                  ? [...form.roles, r.id]
                                  : form.roles.filter((x) => x !== r.id),
                              })
                            }
                          />
                          <span className="text-sm">{r.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-(--text)">
                    Priority
                  </label>
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
                    Important notices are highlighted for users
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-(--text)">
                    Notification
                  </label>
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
                      className="max-w-5 mt-1"
                    />
                    <div className="flex flex-col">
                      <p className="text-sm font-medium">
                        Send push notification
                      </p>
                      <p className="text-xs text-(--text-muted)">
                        Notify selected users instantly on their mobile app
                      </p>
                    </div>
                  </label>
                </div>
              </div>
              <div className="px-5 py-4 border-t border-(--border) flex justify-end gap-3">
                <button className="btn-outline">Cancel</button>
                <button
                  onClick={saveNotice}
                  className="btn-primary flex justify-center items-center gap-2"
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
