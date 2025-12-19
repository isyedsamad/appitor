"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchSuperAdmin } from "@/lib/admin/superAdminService";

const SuperAdminContext = createContext(null);

export function SuperAdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (!firebaseUser) {
        setUser(null);
        setAdmin(null);
        setLoading(false);
        return;
      }
      try {
        const adminData = await fetchSuperAdmin(firebaseUser.uid);
        if (adminData) {
          setUser(firebaseUser);
          setAdmin(adminData);
        } else {
          setUser(null);
          setAdmin(null);
        }
      } catch (err) {
        console.error("Admin fetch failed:", err);
        setUser(null);
        setAdmin(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <SuperAdminContext.Provider
      value={{
        user,
        admin,
        loading,
        setLoading,
        isAuthenticated: !!admin,
      }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin() {
  const ctx = useContext(SuperAdminContext);
  if (!ctx) {
    throw new Error("useSuperAdmin must be used inside SuperAdminProvider");
  }
  return ctx;
}
