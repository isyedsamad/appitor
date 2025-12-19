"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { fetchBranches } from "@/lib/admin/branchService";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function TopNavbar() {
  const { schoolUser } = useSchool();
  const { branch, changeBranch } = useBranch();
  const [branches, setBranches] = useState([]);

  const logout = () => {
      signOut(auth);
    }

  const isAdmin =
    schoolUser.permissions?.includes("*");

  useEffect(() => {
    async function loadBranches() {
      if (isAdmin) {
        const list = await fetchBranches(schoolUser.schoolId);
        if(list) changeBranch(list[0].id)
        setBranches(list);
      } else {
        if (schoolUser.assignedBranch) {
          setBranches([schoolUser.assignedBranch]);
          changeBranch(schoolUser.assignedBranch.id);
        }
      }
    }
    loadBranches();
  }, [isAdmin, schoolUser]);

  return (
    <header
      className="
        h-14 flex items-center justify-between
        px-4
        bg-linear-to-r from-(--primary)/20 to-transparent
        border-b border-(--border)
      "
    >

      <div className="flex">
        {branches.length > 0 && (
          <select
            value={branch || ""}
            onChange={(e) => changeBranch(e.target.value)}
            className="
              text-md font-semibold px-2 py-1 rounded-lg
              bg-transparent border-none
              text-(--text)
            "
          >
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex-1 flex items-center justify-end gap-3">
        <ThemeToggle />

        <button className="p-2 rounded hover:bg-[var(--primary-soft)]">
          <Bell size={18} />
        </button>
        <button onClick={logout}
            className="p-2 border border-(--border) rounded-md bg-(--bg-card) hover:text-(--danger)"
          >
            <LogOut size={18} />
          </button>
      </div>
    </header>
  );
}
