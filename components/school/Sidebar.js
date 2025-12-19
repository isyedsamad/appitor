"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, UserCheck } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { MENU } from "@/lib/school/schoolNav";
import { hasPermission } from "@/lib/school/permissionUtils";

export default function Sidebar() {
  const { schoolUser } = useSchool();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  if (!schoolUser) return null;
  return (
    <aside
      className={`h-screen border-r border-(--border) bg-(--card)]
      transition-all duration-300
      ${collapsed ? "w-15" : "w-55"}`}
    >
      <div className="flex items-center justify-between px-5 h-14 border-b border-(--border) bg-(--primary)/20">
        {!collapsed && (
          <div className="flex flex-row justify-start items-center gap-2">
            <UserCheck size={17} />
            <p className="flex flex-col">
              <span className="text-sm font-semibold text-(--text)">{schoolUser.username}</span>
              {/* <span className="text-[8px] uppercase font-medium">{schoolUser.roleName}</span> */}
            </p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded hover:bg-(--primary-soft)"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>
      <nav className="p-2 space-y-3">
        {MENU.map((item) => {
          if (!hasPermission(schoolUser, item.permission)) {
            return null;
          }

          const Icon = item.icon;
          const isOpen = openMenu === item.label;

          return (
            <div key={item.label}>
              <button
                onClick={() =>
                  item.children
                    ? setOpenMenu(isOpen ? null : item.label)
                    : null
                }
                className="w-full flex items-center justify-between gap-2
                px-3 py-2 rounded-lg
                text-(--text) hover:bg-(--primary-soft)
                transition"
              >
                {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
                <div className="flex items-center gap-2 ml-auto">
                  {item.children && !collapsed && (
                    <ChevronDown
                      size={14}
                      className={`transition ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                  <Icon size={18} />
                </div>
              </button>
              {!collapsed && isOpen && item.children && (
                <div className="ml-4 mt-1">
                  {item.children.map((sub) => {
                    if (!hasPermission(schoolUser, sub.permission)) return null;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        className="block px-3 py-1.5 rounded
                        text-sm font-semibold text-(--text-muted)
                        hover:bg-(--primary-soft)"
                      >
                        {sub.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
