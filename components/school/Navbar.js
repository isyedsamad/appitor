"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import ThemeToggle from "../ui/ThemeToggle";
import { useSchool } from "@/context/SchoolContext";
import { useBranch } from "@/context/BranchContext";
import { fetchBranches, fetchSchoolBranches } from "@/lib/admin/branchService";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDoc, getDocs, query, where } from "firebase/firestore";

export default function Navbar({ onMenu }) {
  const { isLoaded, schoolUser, branches, currentBranch } = useSchool();
  const { branch, changeBranch } = useBranch();
  const [branchesList, setBranchesList] = useState([]);
  const logout = () => {
    signOut(auth);
  }
  useEffect(() => {
    if(isLoaded && schoolUser) {
      setBranchesList(branches)
      changeBranch(currentBranch);
    }
  }, [isLoaded, schoolUser]);

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
        {branchesList.length > 0 && (
          <select
            value={branch || ""}
            onChange={(e) => changeBranch(e.target.value)}
            className="
              text-md font-semibold pl-2 pr-10 py-1 rounded-lg
              bg-(--bg-card) border-none hidden md:block
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
      <div className="flex-1 flex items-center justify-end gap-1 sm:gap-2">
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
