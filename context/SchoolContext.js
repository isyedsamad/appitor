"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Loading from "@/components/ui/Loading";
import { useRouter } from "next/navigation";

const SchoolContext = createContext(null);

export function SchoolProvider({ schoolId, children }) {
  const router = useRouter();
  const [schoolUser, setSchoolUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setIsLoaded(false);
      if (!fbUser) {
        setSchoolUser(null);
        setLoading(false);
        setIsLoaded(true);
        router.replace("/school/");
        return;
      }
      const userSnap = await getDoc(
        doc(db, "schoolUsers", fbUser.uid)
      );
      if (!userSnap.exists()) {
        setSchoolUser(null);
        setLoading(false);
        setIsLoaded(true);
        signOut(auth);
        return;
      }
      const userData = userSnap.data();
      if (
        userData.schoolId !== schoolId ||
        userData.status !== "active"
      ) {
        setSchoolUser(null);
        setLoading(false);
        setIsLoaded(true);
        return;
      }
      const roleSnap = await getDoc(
        doc(db, "roles", userData.roleId)
      );
      if (!roleSnap.exists()) {
        console.error("Role not found");
        setSchoolUser(null);
        setLoading(false);
        setIsLoaded(true);
        return;
      }
      const roleData = roleSnap.data();
      setSchoolUser({
        ...userData,
        uid: fbUser.uid,
        schoolId,
        roleId: userData.roleId,
        roleName: roleData.name,
        permissions: roleData.permissions || [],
        linkedId: userData.linkedId || null,
      });
      setLoading(false);
      setIsLoaded(true);
    });

    return () => unsub();
  }, [schoolId, router]);

  return (
    <SchoolContext.Provider
      value={{
        schoolUser,
        loading,
        isLoaded,
        setLoading,
      }}
    >
      {loading && <Loading />}
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
