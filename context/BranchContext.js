"use client";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branch, setBranch] = useState(null);
  const [branchInfo, setBranchInfo] = useState({
    employeeCounter: 1000,
    appitorCode: 'A'
  });

  useEffect(() => {
    const saved = localStorage.getItem("appitor_branch");
    if (saved) setBranch(saved);
  }, []);

  function changeBranch(b) {
    setBranch(b);
    localStorage.setItem("appitor_branch", b);
  }

  return (
    <BranchContext.Provider value={{ branch, changeBranch, branchInfo }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
