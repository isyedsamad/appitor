"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, ArrowUp } from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useSchool } from "@/context/SchoolContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function PromotionPreviewModal({open, onClose, onConfirm}) {
  const { setLoading, schoolUser } = useSchool();
  const [data, setData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [sessionList, setSessionList] = useState(null);
  const [toSession, setToSession] = useState("");
  useEffect(() => {
    if (open && schoolUser) {
      loadSessions();
      setData(null);
      setToSession("");
    }
  }, [open, schoolUser]);
  const loadSessions = async () => {
    setLoading(true);
    const academicSnap = await getDoc(doc(db, 'schools', schoolUser.schoolId, 'settings', 'academic'));
    const academicData = academicSnap.data();
    setSessionList(academicData.sessions);
    setLoading(false);
  }
  async function loadPreview() {
    if (!toSession) {
      toast.error("Select target session");
      return;
    }
    setLoadingModal(true);
    try {
      const res = await secureAxios.get(
        "/api/school/students/promotion-preview",
        {
          params: { toSession },
        }
      );
      setData(res.data);
    } catch {
      toast.error("Failed to load preview");
      onClose();
    } finally {
      setLoadingModal(false);
    }
  }
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="w-full max-w-xl bg-(--bg) rounded-xl border border-(--border)">
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
          <h2 className="font-semibold text-lg">
            Promotion Preview
          </h2>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm text-(--text-muted)">
              Target Academic Session
            </label>
            <select
              className="input mt-1"
              value={toSession}
              onChange={e => setToSession(e.target.value)}>
                <option value={''}>Select Session</option>
                {sessionList && sessionList.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
            {/* <input
              className="input mt-1"
              placeholder="e.g. 2025-26"
              value={toSession}
              onChange={e => setToSession(e.target.value)}
            /> */}
          </div>
          <button
            onClick={loadPreview}
            className="btn-outline w-full"
          >
            Load Preview
          </button>
          {loadingModal && (
            <p className="text-sm text-(--text-muted)">
              Loading preview...
            </p>
          )}
          {data && (
            <>
              <div className="text-sm text-(--text-muted)">
                Session <b>{data.fromSession}</b> →{" "}
                <b>{data.toSession}</b>
              </div>
              <div className="border border-(--border) rounded-lg divide-y">
                {data.summary.map(row => (
                  <div
                    key={row.fromClass}
                    className="flex justify-between px-4 py-3 text-sm"
                  >
                    <span>
                      {row.fromClass} →{" "}
                      {row.toClass || "Passed Out"}
                    </span>
                    <span className="font-semibold">
                      {row.count}
                    </span>
                  </div>
                ))}
              </div>
              {data.passedOutCount > 0 && (
                <div className="flex gap-2 items-start text-warning text-sm">
                  <AlertTriangle size={16} />
                  <span>
                    {data.passedOutCount} students will be
                    marked as passed out.
                  </span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-(--border) flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={!data}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
            onClick={() => onConfirm(toSession)}
          >
            <ArrowUp size={16} />
            Confirm Promotion
          </button>
        </div>
      </div>
    </div>
  );
}
