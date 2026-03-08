"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown, Lock } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { MENU } from "@/lib/school/schoolNav";
import { hasPermission } from "@/lib/school/permissionUtils";

export default function Sidebar() {
  const { schoolUser } = useSchool();
  const { branchInfo } = useBranch();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  if (!schoolUser) return null;
  const currentPlan = branchInfo?.plan || schoolUser.plan || "trial";
  const basePath = `/school/${schoolUser.schoolId}`;

  return (
    <aside
      className={`min-h-dvh border-r border-(--border) bg-(--bg-card)
        transition-all duration-300 ${collapsed ? "w-15" : "w-58"}`}
    >
      <div className="flex items-center justify-between px-5 h-14 border-b border-(--border) bg-(--bg-card)">
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold capitalize">{schoolUser.name}</p>
            <p className="text-xs font-medium text-(--text-muted)">
              {schoolUser.username || schoolUser.employeeId || schoolUser.appId || '-'}
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
      <nav className="p-2 space-y-2">
        {MENU.map(main => {
          const isMainGranted = !main.permission || hasPermission(schoolUser, main.permission, main.isForAll ?? false, currentPlan);
          const hasAccessibleChild = main.children?.some(sub => {
            if (sub.children) {
              return sub.children.some(page => !page.permission || hasPermission(schoolUser, page.permission, false, currentPlan));
            }
            return !sub.permission || hasPermission(schoolUser, sub.permission, false, currentPlan);
          });

          const isMainLocked = !isMainGranted && !hasAccessibleChild;

          const Icon = main.icon;
          const isMainOpen = openMenu === main.label;
          const hasMainChildren = Array.isArray(main.children);
          const mainHref = main.href ? `${basePath}/${main.href}` : undefined;

          return (
            <div key={main.label}>
              {mainHref && !isMainLocked ? (
                <Link
                  href={mainHref}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-(--primary-soft) transition"
                >
                  {!collapsed && <span className="text-sm font-semibold">{main.label}</span>}
                  <div className="flex items-center gap-2 ml-auto">
                    {hasMainChildren && !collapsed && (
                      <button
                        type="button"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenu(isMainOpen ? null : main.label);
                        }}
                        className="p-1 rounded hover:bg-(--primary-soft)"
                      >
                        <ChevronDown size={14} className={`transition ${isMainOpen ? "rotate-180" : ""}`} />
                      </button>
                    )}
                    {Icon && <Icon size={18} />}
                  </div>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isMainLocked) return;
                    if (hasMainChildren) setOpenMenu(isMainOpen ? null : main.label);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition
                    ${isMainLocked ? "opacity-50 cursor-not-allowed grayscale" : "hover:bg-(--primary-soft)"}`}
                >
                  {!collapsed && (
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {main.label}
                      {isMainLocked && <Lock size={12} className="text-(--text-muted)" />}
                    </span>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    {hasMainChildren && !collapsed && !isMainLocked && (
                      <ChevronDown size={14} className={`transition ${isMainOpen ? "rotate-180" : ""}`} />
                    )}
                    {Icon && <Icon size={18} />}
                  </div>
                </button>
              )}
              {!collapsed && isMainOpen && hasMainChildren && !isMainLocked && (
                <div className="ml-3 pl-1 mt-1 space-y-1 border-l-2 border-(--border)/70">
                  {main.children.map(sub => {
                    const subKey = `${main.label}__${sub.label}`;
                    const isSubOpen = openSubMenu === subKey;
                    const hasSubChildren = Array.isArray(sub.children);
                    if (!hasSubChildren) {
                      const isSubLocked = sub.permission && !hasPermission(schoolUser, sub.permission, false, currentPlan);
                      const subHref = sub.href ? `${basePath}/${sub.href}` : "#";

                      if (isSubLocked) {
                        return (
                          <div
                            key={sub.href ?? sub.label}
                            className="flex font-medium items-center justify-between px-3 py-1.5 mt-1 rounded text-sm text-(--text-muted) opacity-50 cursor-not-allowed grayscale"
                          >
                            <span className="flex items-center gap-2">
                              {sub.label}
                              <Lock size={10} />
                            </span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={sub.href ?? sub.label}
                          href={subHref}
                          className="flex font-medium items-center justify-between px-3 py-1.5 mt-1 rounded text-sm text-(--text-muted) hover:bg-(--primary-soft)"
                        >
                          <span>{sub.label}</span>
                        </Link>
                      );
                    }
                    const isGroupGranted = !sub.permission || hasPermission(schoolUser, sub.permission, false, currentPlan);
                    const hasAccessiblePage = sub.children.some(page => !page.permission || hasPermission(schoolUser, page.permission, false, currentPlan));
                    const isGroupLocked = !isGroupGranted && !hasAccessiblePage;
                    const subHref = sub.href && !isGroupLocked ? `${basePath}/${sub.href}` : "#";

                    return (
                      <div key={sub.label} className="mt-1">
                        {isGroupLocked ? (
                          <div className="flex items-center justify-between rounded px-3 py-1.5 text-sm text-(--text-muted) opacity-50 cursor-not-allowed grayscale">
                            <span className="flex font-medium items-center gap-2">
                              {sub.label} <Lock size={10} />
                            </span>
                          </div>
                        ) : (
                          <Link
                            href={subHref}
                            onClick={e => setOpenSubMenu(prev => prev === subKey ? null : subKey)}
                            className="flex font-medium items-center justify-between rounded hover:bg-(--primary-soft)"
                          >
                            <span className="flex-1 px-3 py-1.5 text-sm text-(--text)">
                              {sub.label}
                            </span>
                            <div className="p-1 mr-2">
                              <ChevronDown size={12} className={`transition ${isSubOpen ? "rotate-180" : ""}`} />
                            </div>
                          </Link>
                        )}
                        {isSubOpen && !isGroupLocked && (
                          <div className="ml-3 pl-1 mt-1 space-y-1 border-l-2 border-(--border)/70">
                            {sub.children.map(page => {
                              const isPageLocked = page.permission && !hasPermission(schoolUser, page.permission, false, currentPlan);

                              if (isPageLocked) {
                                return (
                                  <div
                                    key={page.href}
                                    className="flex font-medium items-center justify-between px-3 py-1.5 rounded text-sm text-(--text-muted) opacity-50 cursor-not-allowed grayscale"
                                  >
                                    <span className="flex items-center gap-2">
                                      {page.label} <Lock size={10} />
                                    </span>
                                  </div>
                                );
                              }

                              return (
                                <Link
                                  key={page.href}
                                  href={`${basePath}/${page.href}`}
                                  className="flex font-medium items-center justify-between px-3 py-1.5 rounded text-sm text-(--text-muted) hover:bg-(--primary-soft)"
                                >
                                  <span>{page.label}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
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
