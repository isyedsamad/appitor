"use client";

import { useSchool } from "@/context/SchoolContext";
import Loading from "@/components/ui/Loading";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasPermission } from "@/lib/school/permissionUtils";

export default function RequirePermission({ permission, children }) {
  const { schoolUser, loading } = useSchool();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !schoolUser) {
      router.replace("/login");
    }
    console.log(permission);
    
    if (
      !loading &&
      schoolUser &&
      !hasPermission(schoolUser, permission)
    ) {
      router.replace("/school/unauthorized");
    }
  }, [loading, schoolUser, permission]);

  if (loading) return null;

  if (!schoolUser || !hasPermission(schoolUser, permission)) {
    return null;
  }

  return children;
}
