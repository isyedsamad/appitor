"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, doc, FieldValue, getDoc, getDocs, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import Loading from "@/components/ui/Loading";
import { useRouter } from "next/navigation";
import { useBranch } from "./BranchContext";
import { formatDate } from "@/lib/dateUtils";
import { toast } from "react-toastify";

const SchoolContext = createContext(null);

export function SchoolProvider({ schoolId, children }) {
  const router = useRouter();
  const [schoolUser, setSchoolUser] = useState(null);
  const [classData, setClassData] = useState(null);
  const [employeeData, setEmployeeData] = useState(null);
  const [subjectData, setSubjectData] = useState(null);
  const [currentSession, setCurrentSession] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [branches, setBranches] = useState([]);
  const [roles, setRoles] = useState([]);
  const [currentBranch, setCurrentBranch] = useState('');
  const [sessionList, setSessionList] = useState(null);
  const loadClasses = async (branch) => {
    if (!branch) return;
    setLoading(true);
    const classSnap = await getDoc(doc(db, 'schools', schoolUser.schoolId, 'branches', branch, 'classes', 'data'));
    if (!classSnap.exists()) {
      setClassData([]);
      setLoading(false);
      return;
    }
    const classdata = classSnap.data();
    const sortedClasses = (classdata.classData || []).sort((a, b) => (a.order || 0) - (b.order || 0));
    setClassData(sortedClasses);
    setLoading(false);
  }
  const loadSubjects = async (branch) => {
    if (!branch) return;
    setLoading(true);
    const subSnap = await getDoc(doc(db, 'schools', schoolUser.schoolId, 'branches', branch, 'subjects', 'branch_subjects'));
    if (!subSnap.exists()) {
      setSubjectData([]);
      setLoading(false);
      return;
    }
    const subdata = subSnap.data();
    setSubjectData(subdata.subjects || []);
    setLoading(false);
  }
  const loadEmployee = async (branch) => {
    if (!branch) return;
    setLoading(true);
    try {
      const metaRef = doc(
        db,
        "schools",
        schoolUser.schoolId,
        "branches",
        branch,
        "meta",
        "employees"
      );
      const snap = await getDoc(metaRef);
      if (!snap.exists()) {
        setEmployeeData([]);
        return;
      }
      const employees = snap.data().employees || [];
      employees.sort((a, b) =>
        String(a.employeeId).localeCompare(String(b.employeeId))
      );
      setEmployeeData(employees);
    } catch (err) {
      console.error("LOAD EMPLOYEE META ERROR:", err);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!schoolUser?.schoolId || !currentBranch || currentBranch === '*') {
      setClassData(null);
      setSubjectData(null);
      return;
    }

    const unsubClasses = onSnapshot(
      doc(db, 'schools', schoolUser.schoolId, 'branches', currentBranch, 'classes', 'data'),
      (snap) => {
        if (snap.exists()) {
          const classdata = snap.data();
          const sortedClasses = (classdata.classData || []).sort((a, b) => (a.order || 0) - (b.order || 0));
          setClassData(sortedClasses);
        } else {
          setClassData([]);
        }
      }
    );

    const unsubSubjects = onSnapshot(
      doc(db, 'schools', schoolUser.schoolId, 'branches', currentBranch, 'subjects', 'branch_subjects'),
      (snap) => {
        if (snap.exists()) {
          setSubjectData(snap.data().subjects || []);
        } else {
          setSubjectData([]);
        }
      }
    );

    const unsubSessions = onSnapshot(
      doc(db, 'schools', schoolUser.schoolId, 'branches', currentBranch, 'settings', 'academic'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.sessions) setSessionList(data.sessions);
          if (data.currentSession) setCurrentSession(data.currentSession);
        }
      }
    );

    return () => {
      unsubClasses();
      unsubSubjects();
      unsubSessions();
    };
  }, [schoolUser?.schoolId, currentBranch]);

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

      try {
        const userSnap = await getDoc(doc(db, "schoolUsers", fbUser.uid));
        if (!userSnap.exists()) {
          setSchoolUser(null);
          setLoading(false);
          setIsLoaded(true);
          signOut(auth);
          return;
        }

        const userData = userSnap.data();
        if (userData.status !== "active") {
          toast.error("Your account is currently disabled. Please contact your administrator.", { theme: "colored" });
          setSchoolUser(null);
          signOut(auth);
          setLoading(false);
          setIsLoaded(true);
          return;
        }

        const schoolSnap = await getDoc(doc(db, "schools", schoolId));
        if (!schoolSnap.exists() || userData.schoolId !== schoolId) {
          setSchoolUser(null);
          setLoading(false);
          setIsLoaded(true);
          signOut(auth);
          return;
        }
        const schoolData = schoolSnap.data();
        if (schoolData.status !== "active") {
          toast.error("This school is currently locked. Please contact support.", { theme: "colored" });
          setSchoolUser(null);
          signOut(auth);
          setLoading(false);
          setIsLoaded(true);
          return;
        }

        if (userData.currentBranch) {
          const branchSnap = await getDoc(doc(db, "branches", userData.currentBranch));
          if (branchSnap.exists()) {
            const branchData = branchSnap.data();
            if (branchData.status !== "active") {
              toast.error("This campus is currently locked. Switching context...", { theme: "colored" });
              setSchoolUser(null);
              signOut(auth);
              setLoading(false);
              setIsLoaded(true);
              return;
            }
          }
        }

        let sessionToUse = schoolData.currentSession;
        let sessionListToUse = schoolData.sessions || [];
        if (userData.currentBranch) {
          const branchSettingsSnap = await getDoc(
            doc(db, "schools", schoolId, "branches", userData.currentBranch, "settings", "academic")
          );
          if (branchSettingsSnap.exists()) {
            const branchSettings = branchSettingsSnap.data();
            if (branchSettings.currentSession) {
              sessionToUse = branchSettings.currentSession;
            }
            if (branchSettings.sessions) {
              sessionListToUse = branchSettings.sessions;
            }
          }
        }

        setCurrentSession(sessionToUse);
        setSessionList(sessionListToUse);

        const roleSnap = await getDoc(doc(db, "roles", userData.roleId));
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
        setRoles(allRolesData.map((d) => ({ id: d.id, ...d.data() })));
        setSchoolUser({
          ...userData,
          uid: fbUser.uid,
          employeeId: userData.employeeId ? userData.employeeId : '',
          schoolId,
          currentSession: sessionToUse,
          schoolName: schoolData.name,
          schoolCode: schoolData.code,
          roleId: userData.roleId,
          roleName: roleData.name.toLowerCase(),
          permissions: roleData.permissions || [],
          plan: schoolData.plan || "trial",
          linkedId: userData.linkedId || null,
        });

        if (userData) {
          const combined = (userData.branchIds || []).map((id, index) => ({
            id,
            name: (userData.branchNames || [])[index]
          }));
          setBranches(combined);
          setCurrentBranch(userData.currentBranch || "");
        }
      } catch (error) {
        console.error("AUTH SYNC ERROR:", error);
      } finally {
        setLoading(false);
        setIsLoaded(true);
      }
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
        subjectData,
        employeeData,
        setClassData,
        currentSession,
        setCurrentSession,
        sessionList,
        loadClasses,
        loadSubjects,
        loadEmployee
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
