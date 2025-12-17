"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import { isAdminRoute, isSuperAdmin } from "@/lib//admin/superAdminService";
import { useSuperAdmin } from "@/context/SuperAdminContext";

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const showAdminUI = isAdminRoute(pathname);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { loading, isAuthenticated } = useSuperAdmin();

  useEffect(() => {
    if (loading) return;
    console.log(pathname);
    if (showAdminUI && !isAuthenticated) {
      router.replace("/appitor-admin/login");
    }
    if (
      pathname === "/appitor-admin/login" &&
      isAuthenticated
    ) {
      router.replace("/appitor-admin");
    }
  }, [loading, isAuthenticated, pathname, showAdminUI, router]);

  if (loading && showAdminUI) {
    return (
      <div className="h-screen flex items-center justify-center">
        Checking access...
      </div>
    );
  }

  if (!showAdminUI) {
    return children;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <MobileSidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0">
        <Navbar onMenuClick={() => setOpen(true)} />
        <main className="flex-1 overflow-y-auto py-4 px-6 bg-(--bg)">
          {children}
        </main>
      </div>
    </div>
  );
}
