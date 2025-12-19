"use client";
import Sidebar from "./Sidebar";

export default function MobileSidebar({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="bg-black/40 w-full" onClick={onClose} />
      <Sidebar collapsed={false} />
    </div>
  );
}
