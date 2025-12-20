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
    <div className="flex min-h-[100dvh] bg-(--bg)">
      <div className="hidden md:block"><Sidebar /></div>
      <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      <div className="flex-1">
        <Navbar onMenu={() => setMobileOpen(true)} />
        <main className="py-4 px-6">{children}</main>
      </div>
    </div>
  );
}
