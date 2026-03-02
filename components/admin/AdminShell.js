"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import MobileSidebar from "./MobileSidebar";
import { isAdminRoute } from "@/lib//admin/superAdminService";
import { useSuperAdmin } from "@/context/SuperAdminContext";
import Loading from "../ui/Loading";

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const showAdminUI = isAdminRoute(pathname);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { loading, isAuthenticated } = useSuperAdmin();

  useEffect(() => {
    if (loading) return;
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
      <Loading />
    );
  }

  if (!showAdminUI) {
    return children;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      <Sidebar />
      <MobileSidebar open={open} onClose={() => setOpen(false)} />

      <div className="flex flex-col flex-1 min-w-0 relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-(--primary)/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-(--primary)/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <Navbar onMenuClick={() => setOpen(true)} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 relative z-10 scrollbar-hide">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
