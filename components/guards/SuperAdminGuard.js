"use client";

import { useSuperAdmin } from "@/context/SuperAdminContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminGuard({ children }) {
  const { loading, isAuthenticated } = useSuperAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/appitor-admin/login");
    }
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <Loading />
    );
  }

  return children;
}
