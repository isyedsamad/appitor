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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setSchoolUser(null);
        setLoading(false);
        router.replace('/school/')
        return;
      }
      const userSnap = await getDoc(doc(db, "schoolUsers", fbUser.uid));
      if (!userSnap.exists()) {
        setSchoolUser(null);
        setLoading(false);
        signOut(auth);
        return;
      }
      const userData = userSnap.data();
      if (userData.schoolId !== schoolId || userData.status !== "active") {
        setSchoolUser(null);
        setLoading(false);
        return;
      }
      const roleSnap = await getDoc(
        doc(db, "roles", userData.roleId)
      );
      if (!roleSnap.exists()) {
        console.error("Role not found");
        setSchoolUser(null);
        setLoading(false);
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
    });

    return () => unsub();
  }, [schoolId]);

  return (
    <SchoolContext.Provider value={{ schoolUser, loading }}>
      {loading ? <Loading /> : children}
    </SchoolContext.Provider>
  );
}

export function useSchool() {
  return useContext(SchoolContext);
}
