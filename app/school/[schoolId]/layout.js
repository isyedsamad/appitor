import { SchoolProvider } from "@/context/SchoolContext";
import { BranchProvider } from "@/context/BranchContext";
import SchoolShell from "@/components/school/SchoolShell";

export default async function SchoolLayout({ children, params }) {
  const {schoolId} = await params;
  return (
    <SchoolProvider schoolId={schoolId}>
      <BranchProvider>
        <SchoolShell>{children}</SchoolShell>
      </BranchProvider>
    </SchoolProvider>
  );
}
