"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { MENU } from "@/lib/school/schoolNav";
import { hasPermission } from "@/lib/school/permissionUtils";

export default function Sidebar() {
  const { schoolUser } = useSchool();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [openSubMenu, setOpenSubMenu] = useState(null);

  if (!schoolUser) return null;
  const basePath = `/school/${schoolUser.schoolId}`;
  return (
    <aside
      className={`h-dvh border-r border-(--border) bg-(--bg)
        transition-all duration-300 ${collapsed ? "w-15" : "w-55"}`}
    >
      <div className="flex items-center justify-between px-5 h-14 border-b border-(--border) bg-(--bg-card)">
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold">{schoolUser.name}</p>
            <p className="text-xs text-(--text-muted)">
              @{schoolUser.username}
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
          if (
            main.permission &&
            !hasPermission(schoolUser, main.permission, main.isForAll ?? false)
          )
            return null;

          const Icon = main.icon;
          const isMainOpen = openMenu === main.label;
          const hasMainChildren = Array.isArray(main.children);
          const mainHref = main.href ? `${basePath}/${main.href}` : undefined;

          return (
            <div key={main.label}>
              {mainHref ? (
                <Link
                  href={mainHref}
                  className="flex items-center justify-between px-3 py-2 rounded-lg
                             hover:bg-(--primary-soft) transition"
                >
                  {!collapsed && (
                    <span className="text-sm font-semibold">
                      {main.label}
                    </span>
                  )}
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
                        <ChevronDown
                          size={14}
                          className={`transition ${
                            isMainOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>
                    )}
                    {Icon && <Icon size={18} />}
                  </div>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    hasMainChildren
                      ? setOpenMenu(isMainOpen ? null : main.label)
                      : null
                  }
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg
                             hover:bg-(--primary-soft) transition"
                >
                  {!collapsed && (
                    <span className="text-sm font-semibold">
                      {main.label}
                    </span>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    {hasMainChildren && !collapsed && (
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
              )}
              {!collapsed && isMainOpen && hasMainChildren && (
                <div className="ml-3 mt-1">
                  {main.children.map(sub => {
                    const subKey = `${main.label}__${sub.label}`;
                    const isSubOpen = openSubMenu === subKey;
                    const hasSubChildren = Array.isArray(sub.children);
                    if (!hasSubChildren) {
                      if (
                        sub.permission &&
                        !hasPermission(schoolUser, sub.permission)
                      )
                        return null;

                      const subHref = sub.href
                        ? `${basePath}/${sub.href}`
                        : "#";

                      return (
                        <Link
                          key={sub.href ?? sub.label}
                          href={subHref}
                          className="flex items-center justify-between px-3 py-1.5 mt-1
                                     rounded text-sm text-(--text-muted)
                                     hover:bg-(--primary-soft)"
                        >
                          <span>{sub.label}</span>
                        </Link>
                      );
                    }
                    const subHref = sub.href
                      ? `${basePath}/${sub.href}`
                      : "#";

                    return (
                      <div key={sub.label} className="mt-1">
                        <Link
                          href={subHref}
                          onClick={e => {
                            setOpenSubMenu(prev =>
                              prev === subKey ? null : subKey
                            );
                          }}
                          className="flex items-center justify-between rounded hover:bg-(--primary-soft)"
                        >
                          <span className="flex-1 px-3 py-1.5 text-sm text-(--text)">
                            {sub.label}
                          </span>

                          <div className="p-1 mr-2">
                            <ChevronDown
                              size={12}
                              className={`transition ${
                                isSubOpen ? "rotate-180" : ""
                              }`}
                            />
                          </div>
                        </Link>
                        {isSubOpen && (
                          <div className="ml-3 mt-1">
                            {sub.children.map(page => {
                              if (
                                page.permission &&
                                !hasPermission(schoolUser, page.permission)
                              )
                                return null;

                              return (
                                <Link
                                  key={page.href}
                                  href={`${basePath}/${page.href}`}
                                  className="flex items-center justify-between px-3 py-1.5
                                             rounded text-sm text-(--text-muted)
                                             hover:bg-(--primary-soft)"
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
