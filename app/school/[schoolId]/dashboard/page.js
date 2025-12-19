"use client";

import RequirePermission from "@/components/school/RequirePermission";
import { useSchool } from "@/context/SchoolContext";

export default function DashboardPage() {
  const { schoolUser } = useSchool();

  return (
    <RequirePermission permission={null}>
    <div>
      <h1 className="text-xl font-semibold">
        Welcome ({schoolUser.role})
      </h1>
    </div>
    </RequirePermission>
  );
}
