"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Search, Send, X, Calendar, Users, IdCard, MessageCircle } from "lucide-react";
import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import secureAxios from "@/lib/secureAxios";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "react-toastify";

export default function StudentMessagingPage() {
  const { schoolUser, classData, sessionList, setLoading } = useSchool();
  const { branch } = useBranch();
  const [sendPush, setSendPush] = useState(true);
  const [searchType, setSearchType] = useState("class"); // class | appId
  const [filters, setFilters] = useState({
    classId: "",
    sectionId: "",
    appId: "",
  });
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [sessionId, setSessionId] = useState(schoolUser.currentSession);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ title: "", body: "" });

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

  async function searchStudents() {
    setStudents([]);
    setSelectedStudent(null);
    setLoading(true);
    try {
      if (searchType === "class") {
        if (!filters.classId || !filters.sectionId) {
          toast.error("Select class & section");
          return;
        }
        const ref = doc(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "meta",
          `${filters.classId}_${filters.sectionId}`
        );
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          toast.info("No students found");
          return;
        }
        setStudents(
          (snap.data().students || []).filter((s) => s.status === "active")
        );
      } else {
        if (!filters.appId) {
          toast.error("Enter App ID");
          return;
        }
        const ref = query(collection(
          db,
          "schools",
          schoolUser.schoolId,
          "branches",
          branch,
          "students"
        ), where('appId', '==', filters.appId.toUpperCase()));
        const snap = await getDocs(ref);
        if (snap.empty) {
          toast.error("Student not found");
          return;
        }
        setStudents(snap.docs.map((d) => ({ ...d.data() })));
      }
    } finally {
      setLoading(false);
    }
  }

  async function openMessage(student) {
    setSelectedStudent(student);
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
        "student_messages",
        `${student.uid}_${sessionId}`
      );
      const snap = await getDoc(ref);
      setHistory(snap.exists() ? snap.data().items || [] : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if(!selectedStudent) return;
    loadSessionNotice();
  }, [sessionId])
  
  async function loadSessionNotice() {
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
        "student_messages",
        `${selectedStudent.uid}_${sessionId}`
      );
      const snap = await getDoc(ref);
      setHistory(snap.exists() ? snap.data().items || [] : []);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!form.title || !form.body) {
      toast.error("Fill all fields");
      return;
    }
    setLoading(true);
    try {
      await secureAxios.post("/api/school/communication/student-message", {
        branch,
        sessionId,
        sendPush,
        schoolName: schoolUser.schoolName,
        studentUid: selectedStudent.uid,
        studentAppId: selectedStudent.appId,
        studentName: selectedStudent.name,
        title: form.title,
        body: form.body,
      });
      toast.success("Message sent");
      setForm({ title: "", body: "" });
      openMessage(selectedStudent);
    } finally {
      setLoading(false);
    }
  }

  return (
    <RequirePermission permission="communication.manage">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
            <MessageSquare size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Student Messaging</h1>
            <p className="text-sm text-(--text-muted)">
              Direct communication with students
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="inline-flex bg-(--bg-card) border border-(--border) rounded-lg">
            <button
              onClick={() => setSearchType("class")}
              className={`px-4 py-2 text-sm rounded-md flex items-center gap-2
                ${searchType === "class"
                  ? "bg-(--primary) text-white"
                  : "text-(--text-muted)"}`}
            >
              <Users size={14} /> Class
            </button>
            <button
              onClick={() => setSearchType("appId")}
              className={`px-4 py-2 text-sm rounded-md flex items-center gap-2
                ${searchType === "appId"
                  ? "bg-(--primary) text-white"
                  : "text-(--text-muted)"}`}
            >
              <IdCard size={14} /> App ID
            </button>
          </div>
          {searchType === "class" ? (
            <div className="grid md:grid-cols-5 gap-3">
              <select
                className="input"
                value={filters.classId}
                onChange={(e) =>
                  setFilters({ ...filters, classId: e.target.value, sectionId: "" })
                }
              >
                <option value="">Class</option>
                {classData && classData.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select
                className="input"
                disabled={!filters.classId}
                value={filters.sectionId}
                onChange={(e) =>
                  setFilters({ ...filters, sectionId: e.target.value })
                }
              >
                <option value="">Section</option>
                {(classData && classData.find((c) => c.id === filters.classId)?.sections || [])
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
              <button onClick={searchStudents} className="btn-primary">
                <Search size={16} /> Search Students
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <input
                className="input max-w-sm"
                placeholder="Enter Student App ID"
                value={filters.appId}
                onChange={(e) =>
                  setFilters({ ...filters, appId: e.target.value })
                }
              />
              <button onClick={searchStudents} className="btn-primary">
                <Search size={16} /> Search
              </button>
            </div>
          )}
        </div>
        {students.length > 0 && (
          <div className="bg-(--bg-card) border border-(--border) rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-(--bg)">
                <tr className="text-left">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">App ID</th>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr
                    key={s.uid}
                    className="border-t border-(--border) hover:bg-(--bg)"
                  >
                    <td className="px-5 py-3 font-medium capitalize">{s.name}</td>
                    <td className="px-5 py-3">{s.appId}</td>
                    <td className="px-5 py-3">
                      {filters.classId
                        ? `${getClassName(filters.classId)} ${getSectionName(filters.classId, filters.sectionId)}`
                        : "-"}
                    </td>
                    <td className="px-5 py-3 capitalize">{s.status}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => openMessage(s)}
                        className="btn-primary text-sm"
                      >
                        <MessageCircle size={15} /> Message
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
        {openModal && selectedStudent && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex md:items-center justify-center z-50 px-4 py-4">
            <div className="bg-(--bg-card) w-full max-w-5xl rounded-xl overflow-hidden border border-(--border)">
              <div className="flex justify-between items-center px-6 py-3 bg-(--bg) border-b border-(--border)">
                <div>
                  <h2 className="font-semibold text-md">Student Message</h2>
                  <p className="text-xs text-(--text-muted) font-medium">
                    <span className="capitalize">{selectedStudent.name}</span> • App ID {selectedStudent.appId}
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
                        placeholder="e.g. Fee reminder / Attendance issue"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium">
                        Message Content <span className="text-(--danger)">*</span>
                      </label>
                      <textarea
                        className="input h-28 resize-none"
                        placeholder="Write the message clearly for the student..."
                        value={form.body}
                        onChange={(e) => setForm({ ...form, body: e.target.value })}
                      />
                    </div>
                    <label
                      className={`flex items-start gap-3 border-2 rounded-lg px-4 py-3 cursor-pointer transition
                        ${sendPush ? "border-(--primary) bg-(--primary-soft)" : "border-(--border)"}`}
                    >
                      <input
                        type="checkbox"
                        checked={sendPush}
                        onChange={(e) => setSendPush(e.target.checked)}
                        className="mt-1 max-w-5"
                      />
                      <div className="flex flex-col">
                        <p className="text-sm font-medium">Send push notification</p>
                        <p className="text-xs text-(--text-muted)">
                          Student will receive instant app notification
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
                        <option key={s.id} value={s.id}>{s.id}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-sm font-semibold my-3">Message History</p>
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
                                ${seen ? "text-(--primary) bg-(--primary-soft)" : "text-(--status-a-text) bg-(--status-a-bg)"}
                              `}
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
                              <p className="text-xs text-(--text-muted)">
                                Seen by student
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
