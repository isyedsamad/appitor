import { db } from "@/lib/firebase";
import { collection, getCountFromServer } from "firebase/firestore";

export async function fetchDashboardStats() {
  const schoolsRef = collection(db, "schools");
  const usersRef = collection(db, "schoolUsers");
  const rolesRef = collection(db, "roles");

  const [schoolsSnap, usersSnap, rolesSnap] = await Promise.all([
    getCountFromServer(schoolsRef),
    getCountFromServer(usersRef),
    getCountFromServer(rolesRef),
  ]);

  return {
    totalSchools: (schoolsSnap.data().count >= 10 || schoolsSnap.data().count == 0) ? schoolsSnap.data().count : "0" + schoolsSnap.data().count,
    totalUsers: (usersSnap.data().count >= 10 || usersSnap.data().count == 0) ? usersSnap.data().count : "0" + usersSnap.data().count,
    totalRoles: (rolesSnap.data().count >= 10 || rolesSnap.data().count == 0) ? rolesSnap.data().count : "0" + rolesSnap.data().count,
  };
}
