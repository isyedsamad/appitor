"use client";

import { useEffect, useState } from "react";
import { X, AlertTriangle, ArrowUp, RefreshCw, ArrowRight } from "lucide-react";
import secureAxios from "@/lib/secureAxios";
import { toast } from "react-toastify";
import { useSchool } from "@/context/SchoolContext";

export default function PromotionPreviewModal({ open, onClose, onConfirm }) {
  const { setLoading, schoolUser, sessionList } = useSchool();
  const [data, setData] = useState(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const [toSession, setToSession] = useState("");

  useEffect(() => {
    if (open) {
      setData(null);
      setToSession("");
    }
  }, [open]);

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
    } catch (err) {
      console.error("LOAD PREVIEW ERROR:", err);
      toast.error(err.response?.data?.message || "Failed to load preview");
    } finally {
      setLoadingModal(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-(--bg-card) rounded-2xl border border-(--border) shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-5 border-b border-(--border)">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--primary-soft) text-(--primary)">
              <ArrowUp size={20} />
            </div>
            <h2 className="font-semibold text-lg text-(--text)">
              Promotion Preview
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-(--bg-soft) rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-(--text-muted) ml-1">
              Target Academic Session
            </label>
            <div className="flex gap-2">
              <select
                className="input flex-1 bg-(--bg-soft)/50"
                value={toSession}
                onChange={e => setToSession(e.target.value)}>
                <option value={''}>Select Target Session</option>
                {sessionList && sessionList.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </select>
              <button
                onClick={loadPreview}
                disabled={loadingModal || !toSession}
                className="btn-primary px-6 flex items-center gap-2"
              >
                {loadingModal ? <RefreshCw size={16} className="animate-spin" /> : 'Load Preview'}
              </button>
            </div>
            <p className="text-[10px] text-(--text-muted) ml-1">Choose the session students will be promoted into.</p>
          </div>

          {data && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between p-3 rounded-lg bg-(--primary-soft)/10 border border-(--primary-soft) text-sm">
                <span className="text-(--text-muted)">Transitioning From: <b className="text-(--text)">{data.fromSession}</b></span>
                <ArrowRight size={14} className="text-(--primary)" />
                <span className="text-(--text-muted)">Moving To: <b className="text-(--text)">{data.toSession}</b></span>
              </div>

              <div className="border border-(--border) rounded-xl overflow-hidden shadow-sm">
                <div className="bg-(--bg-soft)/50 px-4 py-2 border-b border-(--border) flex justify-between text-[10px] font-bold uppercase tracking-wider text-(--text-muted)">
                  <span>Class Transition</span>
                  <span>Count</span>
                </div>
                <div className="divide-y divide-(--border) max-h-48 overflow-y-auto">
                  {data.summary.map(row => (
                    <div
                      key={row.fromClass}
                      className="flex justify-between px-4 py-3 text-sm hover:bg-(--bg-soft)/30 transition-colors"
                    >
                      <span className="font-medium text-(--text)">
                        {row.fromClass} <ArrowRight size={12} className="inline mx-1 opacity-50" /> {row.toClass || "Passed Out"}
                      </span>
                      <span className="font-bold text-(--primary) bg-(--primary-soft) px-2 py-0.5 rounded text-xs">
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {data.passedOutCount > 0 && (
                <div className="flex gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-red-600 text-xs">
                  <AlertTriangle size={16} className="shrink-0" />
                  <p>
                    <b>{data.passedOutCount} students</b> will be marked as <b>passed out</b> because no next class is defined for their current class.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-5 border-t border-(--border) flex justify-end gap-3 bg-(--bg-soft)/30 rounded-b-2xl">
          <button className="btn-outline px-6" onClick={onClose}>
            Cancel
          </button>
          <button
            disabled={!data || loadingModal}
            className="btn-primary flex items-center gap-2 px-8 disabled:opacity-50 shadow-lg shadow-orange-500/20"
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
