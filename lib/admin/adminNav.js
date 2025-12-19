import {
  LayoutDashboard,
  School,
  Users,
  Shield,
  Settings,
  GraduationCap,
  HouseHeart,
  GitBranch,
} from "lucide-react";

export const adminNav = [
  {
    label: "Dashboard",
    href: "/appitor-admin/",
    icon: LayoutDashboard,
  },
  {
    label: "Organizations",
    href: "/appitor-admin/organizations",
    icon: GraduationCap,
  },
  {
    label: "Schools",
    href: "/appitor-admin/schools",
    icon: School,
  },
  {
    label: "Branches",
    href: "/appitor-admin/branches",
    icon: GitBranch,
  },
  {
    label: "Roles",
    href: "/appitor-admin/roles",
    icon: Shield,
  },
  {
    label: "Users",
    href: "/appitor-admin/users",
    icon: Users,
  },
  {
    label: "Settings",
    href: "/appitor-admin/settings",
    icon: Settings,
  },
];
