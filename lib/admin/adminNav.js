import {
  LayoutDashboard,
  School,
  Users,
  Shield,
  Settings,
} from "lucide-react";

export const adminNav = [
  {
    label: "Dashboard",
    href: "/appitor-admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Schools",
    href: "/appitor-admin/schools",
    icon: School,
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
