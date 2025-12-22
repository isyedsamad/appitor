"use client";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, UserCheck, X } from "lucide-react";
import { MENU } from "@/lib/school/schoolNav";
import { hasPermission } from "@/lib/school/permissionUtils";
import { useSchool } from "@/context/SchoolContext";
import { useEffect, useState } from "react";
import { useBranch } from "@/context/BranchContext";
import { fetchSchoolBranches } from "@/lib/admin/branchService";

export default function MobileSidebar({ open, onClose }) {
  const { isLoaded, schoolUser, branches, currentBranch } = useSchool();
  const { branch, changeBranch } = useBranch();
  const [branchesList, setBranchesList] = useState([]);
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  useEffect(() => {
    if(isLoaded && schoolUser) {
      setBranchesList(branches)
      changeBranch(currentBranch);
    }
  }, [isLoaded, schoolUser]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside className="absolute overflow-y-auto left-0 top-0 h-full w-64 bg-(--bg) border-r border-(--border)">
        <div className="h-14 flex items-center justify-between px-4 border-b border-(--border)">
          <div>
          {branchesList.length > 0 && (
            <select
              value={branch || ""}
              onChange={(e) => changeBranch(e.target.value)}
              className="
                text-md font-semibold pl-2 pr-10 py-1 rounded-lg
                bg-(--bg) border-none
                text-(--text)
              "
            >
              {branchesList.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <nav className="p-2 space-y-3">
        {MENU.map((item) => {
          if (!hasPermission(schoolUser, item.permission, item.isForAll ? item.isForAll : false)) {
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
    </div>
  );
}
