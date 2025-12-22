"use client";

import { useSchool } from "@/context/SchoolContext";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import { useState } from "react";

export default function SchoolShell({ children }) {
  const { schoolUser } = useSchool();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!schoolUser) return null;

  return (
    <div className="flex h-screen bg-(--bg) overflow-y-auto">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1">
        <div><Navbar onMenu={() => setMobileOpen(true)} /></div>
        <main className="flex-1 px-6 py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
