"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, X } from "lucide-react";
import { MENU } from "@/lib/school/schoolNav";
import { hasPermission } from "@/lib/school/permissionUtils";
import { useSchool } from "@/context/SchoolContext";

export default function MobileSidebar({ open, onClose }) {
  const { schoolUser } = useSchool();

  const [openMenu, setOpenMenu] = useState(null);      // MAIN
  const [openSubMenu, setOpenSubMenu] = useState(null); // SUB

  if (!open || !schoolUser) return null;

  const basePath = `/school/${schoolUser.schoolId}`;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* SIDEBAR */}
      <aside className="absolute left-0 top-0 h-full w-64 bg-(--bg-card) border-r border-(--border) overflow-y-auto">
        {/* HEADER */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-(--border)">
          <div>
            <p className="text-sm font-semibold">{schoolUser.name}</p>
            <p className="text-xs text-(--text-muted)">
              @{schoolUser.username}
            </p>
          </div>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* NAV */}
        <nav className="p-2 space-y-2">
          {MENU.map(main => {
            if (
              main.permission &&
              !hasPermission(
                schoolUser,
                main.permission,
                main.isForAll ?? false
              )
            )
              return null;

            const Icon = main.icon;
            const isMainOpen = openMenu === main.label;
            const hasMainChildren = Array.isArray(main.children);

            return (
              <div key={main.label}>
                {/* MAIN ITEM */}
                <button
                  onClick={() =>
                    hasMainChildren
                      ? setOpenMenu(isMainOpen ? null : main.label)
                      : null
                  }
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                    hover:bg-(--primary-soft) transition"
                >
                  <span className="text-sm font-semibold">
                    {main.label}
                  </span>

                  <div className="flex items-center gap-2">
                    {hasMainChildren && (
                      <ChevronDown
                        size={14}
                        className={`transition ${
                          isMainOpen ? "rotate-180" : ""
                        }`}
                      />
                    )}
                    {Icon && <Icon size={18} />}
                  </div>
                </button>

                {/* MAIN CHILDREN */}
                {isMainOpen && hasMainChildren && (
                  <div className="ml-3 mt-1 space-y-2">
                    {main.children.map(sub => {
                      const subKey = `${main.label}__${sub.label}`;
                      const isSubOpen = openSubMenu === subKey;

                      /* SUB-GROUP (3rd LEVEL) */
                      if (sub.children) {
                        return (
                          <div key={sub.label}>
                            <button
                              onClick={() =>
                                setOpenSubMenu(
                                  isSubOpen ? null : subKey
                                )
                              }
                              className="w-full flex items-center justify-between
                                px-3 py-1.5 rounded text-xs font-semibold
                                text-(--text-muted) hover:bg-(--primary-soft)"
                            >
                              <span>{sub.label}</span>
                              <ChevronDown
                                size={12}
                                className={`transition ${
                                  isSubOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>

                            {isSubOpen && (
                              <div className="ml-3 mt-1 space-y-1">
                                {sub.children.map(page => {
                                  if (
                                    page.permission &&
                                    !hasPermission(
                                      schoolUser,
                                      page.permission
                                    )
                                  )
                                    return null;

                                  return (
                                    <Link
                                      key={page.href}
                                      href={`${basePath}/${page.href}`}
                                      onClick={onClose}
                                      className="block px-3 py-1.5 rounded
                                        text-sm text-(--text-muted)
                                        hover:bg-(--primary-soft)"
                                    >
                                      {page.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }

                      /* NORMAL SUB ITEM */
                      if (
                        sub.permission &&
                        !hasPermission(schoolUser, sub.permission)
                      )
                        return null;

                      return (
                        <Link
                          key={sub.href}
                          href={`${basePath}/${sub.href}`}
                          onClick={onClose}
                          className="block px-3 py-1.5 rounded
                            text-sm text-(--text-muted)
                            hover:bg-(--primary-soft)"
                        >
                          {sub.label}
                        </Link>
                      );
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
