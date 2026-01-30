"use client";

import { useEffect, useState } from "react";
import {
  MessageSquare,
  MessageCircle,
  Send,
  X,
  Calendar,
  Briefcase
} from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-toastify";

export default function EmployeeMessagingPage() {
  const { schoolUser, employeeData, sessionList, setLoading } = useSchool();
  const { branch } = useBranch();
  const [sendPush, setSendPush] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [sessionId, setSessionId] = useState(schoolUser.currentSession);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ title: "", body: "" });

  useEffect(() => {
    setEmployees(employeeData?.filter(e => e.status != "disabled") || []);
  }, [employeeData]);

  function formatDate(ts) {
    if (!ts) return "-";
    const d = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function sortByNewest(items) {
    return [...items].sort(
      (a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)
    );
  }

  async function openMessage(emp) {
    setSelectedEmployee(emp);
    setOpenModal(true);
    setHistory([]);
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
        "employee_messages",
        `${emp.uid}_${sessionId}`
      );
      const snap = await getDoc(ref);
      setHistory(snap.exists() ? sortByNewest(snap.data().items || []) : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!selectedEmployee) return;
    openMessage(selectedEmployee);
  }, [sessionId]);

  async function sendMessage() {
    if (!form.title || !form.body) {
      toast.error("Fill all fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/communication/employee-message", {
        branch,
        sessionId,
        sendPush,
        schoolName: schoolUser.schoolName,
        employeeUid: selectedEmployee.uid,
        employeeName: selectedEmployee.name,
        title: form.title,
        body: form.body,
      });
      toast.success("Message sent");
      setForm({ title: "", body: "" });
      openMessage(selectedEmployee);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="communication.manage">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Employee Messaging</h1>
            <p className="text-sm text-(--text-muted)">
              Direct communication with staff
            </p>
          </div>
        </div>
        <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-(--bg)">
              <tr>
                <th className="px-5 py-3 text-left">Employee ID</th>
                <th className="px-5 py-3 text-left">Employee</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr
                  key={e.uid}
                  className="border-t border-(--border) hover:bg-(--bg)"
                >
                  <td className="px-5 py-3 font-medium">{e.employeeId}</td>
                  <td className="px-5 py-3 font-medium capitalize">{e.name}</td>
                  <td className="px-5 py-3 capitalize">{e.role}</td>
                  <td className="px-5 py-3 capitalize">{e.status}</td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => openMessage(e)}
                      className="btn-primary text-sm"
                    >
                      <MessageCircle size={14} /> Message
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
        {openModal && selectedEmployee && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex md:items-center justify-center z-50 px-4 py-4">
            <div className="bg-(--bg-card) w-full max-w-5xl rounded-xl overflow-hidden border border-(--border)">
              <div className="flex justify-between items-center px-6 py-3 bg-(--bg) border-b border-(--border)">
                <div>
                  <h2 className="font-semibold text-md">Employee Message</h2>
                  <p className="text-xs text-(--text-muted) font-medium">
                    <span className="capitalize">{selectedEmployee.name}</span> • {selectedEmployee.role}
                  </p>
                </div>
                <button
                  onClick={() => setOpenModal(false)}
                  className="text-(--text-muted) hover:text-(--text)"
                >
                  <X />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 max-h-[88vh] overflow-x-auto gap-0">
                <div className="order-1 md:order-1 px-6 py-5 bg-(--bg)">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1 mt-2">
                      <label className="text-sm font-medium">
                        Message Title <span className="text-(--danger)">*</span>
                      </label>
                      <input
                        className="input"
                        placeholder="e.g. Meeting reminder / Payroll update"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">
                        Message Content <span className="text-(--danger)">*</span>
                      </label>
                      <textarea
                        className="input h-28 resize-none"
                        placeholder="Write a clear message for the employee..."
                        value={form.body}
                        onChange={(e) =>
                          setForm({ ...form, body: e.target.value })
                        }
                      />
                    </div>
                    <label
                      className={`flex items-start gap-3 border-2 rounded-lg px-4 py-3 cursor-pointer transition
                        ${
                          sendPush
                            ? "border-(--primary) bg-(--primary-soft)"
                            : "border-(--border)"
                        }`}
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
                          Employee will receive instant app notification
                        </p>
                      </div>
                    </label>
                    <div className="flex justify-end gap-3 pt-3">
                      <button
                        onClick={() => setOpenModal(false)}
                        className="btn-outline"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={sendMessage}
                        className="btn-primary flex items-center gap-2"
                      >
                        <Send size={16} /> Send Message
                      </button>
                    </div>
                  </div>
                </div>
                <div className="order-2 md:order-2 px-6 py-5 border-t md:border-t-0 md:border-l border-(--border)">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">Academic Session</label>
                    <select
                      className="input"
                      value={sessionId}
                      onChange={(e) => setSessionId(e.target.value)}
                    >
                      {sessionList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.id}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm font-semibold my-3">
                    Message History
                  </p>
                  <div className="space-y-3 md:max-h-[420px] overflow-y-auto">
                    {history.length === 0 && (
                      <p className="text-sm text-(--text-muted)">
                        No messages sent in this session
                      </p>
                    )}
                    {history.map((m) => {
                      const seen = !!m.readAt;
                      return (
                        <div
                          key={m.messageId}
                          className="rounded-md border border-(--border) bg-(--bg) px-4 py-3"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <p className="text-sm font-medium text-(--text)">
                              {m.title}
                            </p>
                            <span
                              className={`text-[11px] font-medium px-2 py-1 rounded-md
                                ${
                                  seen
                                    ? "text-(--primary) bg-(--primary-soft)"
                                    : "text-(--status-a-text) bg-(--status-a-bg)"
                                }`}
                            >
                              {seen ? "Seen" : "Unseen"}
                            </span>
                          </div>
                          <p className="text-sm text-(--text-muted) leading-relaxed">
                            {m.body}
                          </p>
                          <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-(--text-muted) flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(m.createdAt)}
                            </p>
                            {seen && (
                              <p className="text-xs text-(--text-muted) flex items-center gap-1">
                                <Calendar size={12} />
                                Seen {formatDate(m.readAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
