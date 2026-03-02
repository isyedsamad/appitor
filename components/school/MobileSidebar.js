"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, X, Lock } from "lucide-react";
import { MENU } from "@/lib/school/schoolNav";
import { hasPermission } from "@/lib/school/permissionUtils";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";

export default function MobileSidebar({ open, onClose }) {
  const { schoolUser } = useSchool();
  const { branchInfo } = useBranch();
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  if (!open || !schoolUser) return null;
  const currentPlan = branchInfo?.plan || schoolUser.plan || "trial";
  const basePath = `/school/${schoolUser.schoolId}`;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <aside className="absolute left-0 top-0 h-full w-64 bg-(--bg-card) border-r border-(--border) overflow-y-auto">
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
                    onClick={onClose}
                    className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-(--primary-soft) transition"
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {main.label}
                    </span>
                    <div className="flex items-center gap-2">
                      {hasMainChildren && (
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
                    onClick={() => {
                      if (isMainLocked) return;
                      if (hasMainChildren) setOpenMenu(isMainOpen ? null : main.label);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition
                      ${isMainLocked ? "opacity-50 cursor-not-allowed grayscale" : "hover:bg-(--primary-soft)"}`}
                  >
                    <span className="text-sm font-semibold flex items-center gap-2">
                      {main.label}
                      {isMainLocked && <Lock size={12} className="text-(--text-muted)" />}
                    </span>
                    <div className="flex items-center gap-2">
                      {hasMainChildren && !isMainLocked && (
                        <ChevronDown size={14} className={`transition ${isMainOpen ? "rotate-180" : ""}`} />
                      )}
                      {Icon && <Icon size={18} />}
                    </div>
                  </button>
                )}

                {isMainOpen && hasMainChildren && !isMainLocked && (
                  <div className="ml-3 mt-1 space-y-1">
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
                              className="flex items-center justify-between px-3 py-1.5 rounded text-sm text-(--text-muted) opacity-50 cursor-not-allowed grayscale"
                            >
                              <span className="flex items-center gap-2">
                                {sub.label} <Lock size={10} />
                              </span>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={sub.href ?? sub.label}
                            href={subHref}
                            onClick={onClose}
                            className="block px-3 py-1.5 rounded text-sm text-(--text-muted) hover:bg-(--primary-soft)"
                          >
                            {sub.label}
                          </Link>
                        );
                      }

                      const isGroupGranted = !sub.permission || hasPermission(schoolUser, sub.permission, false, currentPlan);
                      const hasAccessiblePage = sub.children.some(page => !page.permission || hasPermission(schoolUser, page.permission, false, currentPlan));
                      const isGroupLocked = !isGroupGranted && !hasAccessiblePage;

                      return (
                        <div key={sub.label}>
                          {isGroupLocked ? (
                            <div className="w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-semibold text-(--text-muted) opacity-50 cursor-not-allowed grayscale">
                              <span className="flex items-center gap-2">
                                {sub.label} <Lock size={10} />
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setOpenSubMenu(isSubOpen ? null : subKey)}
                              className="w-full flex items-center justify-between px-3 py-1.5 rounded text-xs font-semibold text-(--text-muted) hover:bg-(--primary-soft)"
                            >
                              <span>{sub.label}</span>
                              <ChevronDown size={12} className={`transition ${isSubOpen ? "rotate-180" : ""}`} />
                            </button>
                          )}
                          {isSubOpen && !isGroupLocked && (
                            <div className="ml-3 mt-1 space-y-1">
                              {sub.children.map(page => {
                                const isPageLocked = page.permission && !hasPermission(schoolUser, page.permission, false, currentPlan);

                                if (isPageLocked) {
                                  return (
                                    <div key={page.href} className="flex items-center gap-2 px-3 py-1.5 rounded text-sm text-(--text-muted) opacity-50 cursor-not-allowed grayscale">
                                      {page.label} <Lock size={10} />
                                    </div>
                                  );
                                }

                                return (
                                  <Link
                                    key={page.href}
                                    href={`${basePath}/${page.href}`}
                                    onClick={onClose}
                                    className="block px-3 py-1.5 rounded text-sm text-(--text-muted) hover:bg-(--primary-soft)"
                                  >
                                    {page.label}
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
    </div>
  );
}
