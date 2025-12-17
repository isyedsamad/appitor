"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { fetchSuperAdmin } from "@/lib/superAdminService";

const SuperAdminContext = createContext();

export function SuperAdminProvider({ children }) {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setAdmin(null);
        setLoading(false);
        return;
      }

      const adminData = await fetchSuperAdmin(firebaseUser.uid);

      if (!adminData) {
        setUser(null);
        setAdmin(null);
      } else {
        setUser(firebaseUser);
        setAdmin(adminData);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <SuperAdminContext.Provider
      value={{ user, admin, loading, isAuthenticated: !!admin }}
    >
      {children}
    </SuperAdminContext.Provider>
  );
}

export function useSuperAdmin() {
  return useContext(SuperAdminContext);
}
