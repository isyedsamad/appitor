"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { fetchBranches, fetchSchoolBranches } from "@/lib/admin/branchService";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Navbar({ onMenu }) {
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
        const list = await fetchSchoolBranches(schoolUser.schoolId);
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
        bg-linear-to-r from-(--bg-card) via-35% via-(--bg-card) to-(--primary)/50
        border-b border-(--border)
      "
    >
      <div className="flex items-center gap-2">
        <button
            onClick={onMenu}
            className="md:hidden p-2 rounded-md border border-(--border) flex items-center font-semibold"
          >
            <p><Menu size={18} /></p>
            <p>Menu</p>
        </button>
        {branches.length > 0 && (
          <select
            value={branch || ""}
            onChange={(e) => changeBranch(e.target.value)}
            className="
              text-md font-semibold pl-2 pr-10 py-1 rounded-lg
              bg-(--bg-card) border-none hidden md:block
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
      <div className="flex-1 flex items-center justify-end gap-1 sm:gap-3">
        <ThemeToggle />
        <button className="p-2 border border-(--border) rounded-md bg-(--bg-card) hover:text-(--danger)">
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
