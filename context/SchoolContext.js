"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, FieldValue, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Loading from "@/components/ui/Loading";
import { useRouter } from "next/navigation";
import { useBranch } from "./BranchContext";
import { formatDate } from "@/lib/dateUtils";

const SchoolContext = createContext(null);

export function SchoolProvider({ schoolId, children }) {
  const router = useRouter();
  const [schoolUser, setSchoolUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [currentSession, setCurrentSession] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [sessionList, setSessionList] = useState(null);
  const loadClasses = async (branch) => {
    if(!branch) return;
    setLoading(true);
    const branchSnap = await getDocs(
      query(collection(db, 'schools', schoolUser.schoolId, 'branches', branch, 'classes'),
      orderBy('order', 'asc')));
    const branchData = branchSnap.docs;
    setClassData(branchData.map((b) => ({ id:b.id, ...b.data() })))
    setLoading(false);
  }
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
      const schoolSnap = await getDoc(doc(db, "schools", schoolId));
      const schoolData = schoolSnap.data();
      setCurrentSession(schoolData.currentSession);
      const userData = userSnap.data();
      if (userData.schoolId !== schoolId || userData.status !== "active" || schoolData.status != "active") {
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
      const allRolesSnap = await getDocs(collection(db, 'roles'));
      const allRolesData = allRolesSnap.docs;
      setRoles(allRolesData.map((d) => ({id: d.id, ...d.data()})));
      setSchoolUser({
        ...userData,
        uid: fbUser.uid,
        schoolId,
        currentSession: schoolData.currentSession,
        schoolCode: schoolData.code,
        roleId: userData.roleId,
        roleName: roleData.name,
        permissions: roleData.permissions || [],
        linkedId: userData.linkedId || null,
      });
      setSessionList(schoolData.sessions);
      if (userData) {
        const currentBranchUser = userData.currentBranch;
        if(userData.branchIds.length > 1) {
          const combined = userData.branchIds.map((id, index) => ({
            id,
            name: userData.branchNames[index]
          }));
          setBranches(combined);
          setCurrentBranch(currentBranchUser);
        }else {
          if(userData.branchIds[0] == "*") {
            const branchRef = query(
              collection(db, 'branches'),
              where('schoolId', '==', userData.schoolId)
            )
            const branchSnap = await getDocs(branchRef);
            setBranches(branchSnap.docs.map((d) => ({id: d.id, ...d.data()})));
            setCurrentBranch(userData.currentBranch);
          }else {
            setBranches([{id: 1, name: userData.branchNames[0]}]);
            setCurrentBranch(userData.branchIds[0]);
          }
        }
      }
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
        branches,
        currentBranch,
        setCurrentBranch,
        roles,
        classData,
        setClassData,
        currentSession,
        setCurrentSession,
        sessionList,
        loadClasses
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
