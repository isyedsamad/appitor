"use client";
import { X } from "lucide-react";
import { useState } from "react";

export default function ReasonModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 px-5 flex items-center justify-center">
      <div className="w-full max-w-md bg-(--bg-card) rounded-xl border border-(--border)">
        <div className="flex justify-between items-center px-5 py-4 bg-(--bg) rounded-t-xl border-b border-(--border)">
          <h2 className="font-semibold">Reason Required</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="p-5">
          <textarea
            className="input min-h-[100px]"
            placeholder="Enter reason for modifying attendance"
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
        <div className="px-5 py-4 border-t border-(--border) flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!reason.trim()}
            onClick={() => {
              onSubmit(reason);
              setReason("");
            }}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
