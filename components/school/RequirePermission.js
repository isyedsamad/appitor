"use client";

import { useSchool } from "@/context/SchoolContext";
import Loading from "@/components/ui/Loading";
import { useBranch } from "@/context/BranchContext";
import { useEffect } from "react";
import { hasPermission } from "@/lib/school/permissionUtils";
import { hasPlanAccess } from "@/lib/school/planPermissions";
import { useRouter } from "next/navigation";
import UnauthorizedPage from "@/app/school/unauthorized/page";

export default function RequirePermission({ permission, isForAll, children }) {
  const { schoolUser, loading } = useSchool();
  const { branchInfo } = useBranch();
  const router = useRouter();

  if (isForAll) return children;

  useEffect(() => {
    if (!loading && !schoolUser) {
      router.replace("/school");
    }
  }, [loading, schoolUser, router]);

  if (loading) return null;

  if (!schoolUser) {
    return null;
  }

  const currentPlan = branchInfo?.plan || schoolUser.plan || "trial";
  if (!hasPermission(schoolUser, permission, isForAll, currentPlan)) {
    return <UnauthorizedPage />;
  }

  return children;
}
