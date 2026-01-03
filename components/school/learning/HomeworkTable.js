"use client";

import { Pencil, Trash2, Calendar, BookOpen, User } from "lucide-react";
import { useSchool } from "@/context/SchoolContext";
import { hasPermission } from "@/lib/school/permissionUtils";
import secureAxios from "@/lib/secureAxios";

export default function HomeworkTable({ items, onEdit, onRefresh }) {
  const { schoolUser, setLoading } = useSchool();

  async function handleDelete(item) {
    if (!confirm("Are you sure you want to delete this homework?")) return;

    try {
      setLoading(true);
      await secureAxios.delete(
        `/api/learning/homework?id=${item.id}&branch=${item.branch}`
      );
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to delete homework");
    } finally {
      setLoading(false);
    }
  }

  if (!items || items.length === 0) {
    return (
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-10 text-center">
        <BookOpen className="mx-auto mb-3 text-[var(--text-muted)]" size={32} />
        <p className="text-sm text-[var(--text-muted)]">
          No homework added yet
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        {/* TABLE HEADER */}
        <thead className="bg-[var(--bg)] border-b border-[var(--border)]">
          <tr className="text-left text-[var(--text-muted)]">
            <th className="p-3">Date</th>
            <th>Class</th>
            <th>Subject</th>
            <th>Teacher</th>
            <th>Homework</th>
            <th className="w-28 text-right pr-4">Actions</th>
          </tr>
        </thead>

        {/* TABLE BODY */}
        <tbody>
          {items.map((item) => {
            const canManage =
              hasPermission(schoolUser, "learning.all") ||
              item.teacherId === schoolUser.employeeId;

            return (
              <tr
                key={item.id}
                className="border-t border-[var(--border)] hover:bg-[var(--bg)] transition"
              >
                {/* DATE */}
                <td className="p-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-[var(--text-muted)]" />
                    {item.date}
                  </div>
                </td>

                {/* CLASS */}
                <td className="whitespace-nowrap">
                  {item.className} - {item.sectionName}
                </td>

                {/* SUBJECT */}
                <td className="whitespace-nowrap">
                  {item.subjectName}
                  <span className="ml-1 text-xs text-[var(--text-muted)]">
                    (P{item.period})
                  </span>
                </td>

                {/* TEACHER */}
                <td className="whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-[var(--text-muted)]" />
                    {item.teacherName}
                  </div>
                </td>

                {/* CONTENT */}
                <td className="max-w-md">
                  <p className="truncate text-[var(--text)]">
                    {item.content}
                  </p>
                </td>

                {/* ACTIONS */}
                <td className="text-right pr-4">
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onEdit(item)}
                        className="p-2 rounded-md hover:bg-[var(--primary-soft)] text-[var(--primary)]"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => handleDelete(item)}
                        className="p-2 rounded-md hover:bg-red-50 text-[var(--danger)]"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
