"use client";
import { createContext, useContext, useEffect, useState } from "react";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const [branch, setBranch] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem("appitor_branch");
    if (saved) setBranch(saved);
  }, []);

  function changeBranch(b) {
    setBranch(b);
    localStorage.setItem("appitor_branch", b);
  }

  return (
    <BranchContext.Provider value={{ branch, changeBranch }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
