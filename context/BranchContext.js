"use client";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { useSchool } from "./SchoolContext";
import { toast } from "react-toastify";

const BranchContext = createContext(null);

export function BranchProvider({ children }) {
  const { schoolUser, setLoading, setCurrentBranch } = useSchool();
  const [branch, setBranch] = useState(null);
  const [branchInfo, setBranchInfo] = useState(null);
  useEffect(() => {
    const saved = localStorage.getItem("appitor_branch");
    if (saved) setBranch(saved);
  }, []);
  const loadBranch = async (b) => {
    const branchSnap = await getDoc(doc(db, "branches", b));
    const branchData = branchSnap.data();
    setCurrentBranch(b);
    setBranchInfo({
      id: branchSnap.id,
      ...branchData
    });
  }
  async function changeBranch(b) {
    setLoading(true);
    try {
      const branchSnap = await getDoc(doc(db, "branches", b));
      const branchData = branchSnap.data();
      await updateDoc(doc(db, "schoolUsers", schoolUser.uid), {
        currentBranch: b
      })
      setCurrentBranch(b);
      setBranchInfo({
        id: branchSnap.id,
        ...branchData
      });
      setBranch(b);
      localStorage.setItem("appitor_branch", b);
    } catch (error) {
      console.log('Error in BranchContext: ' + error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BranchContext.Provider value={{ branch, changeBranch, loadBranch, branchInfo, setBranchInfo }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  return useContext(BranchContext);
}
