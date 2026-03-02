import { db } from "@/lib/firebase";
import { collection, getCountFromServer, query, where } from "firebase/firestore";

export async function fetchDashboardStats() {
  const schoolsRef = collection(db, "schools");
  const usersRef = collection(db, "schoolUsers");
  const rolesRef = collection(db, "roles");

  const [
    totalSchools,
    activeSchools,
    totalUsers,
    adminUsers,
    totalRoles
  ] = await Promise.all([
    getCountFromServer(schoolsRef),
    getCountFromServer(query(schoolsRef, where("status", "==", "active"))),
    getCountFromServer(usersRef),
    getCountFromServer(query(usersRef, where("role", "==", "Admin"))),
    getCountFromServer(rolesRef),
  ]);

  const fmt = (val) => (val >= 10 || val == 0 ? val : "0" + val);

  return {
    totalSchools: fmt(totalSchools.data().count),
    activeSchools: fmt(activeSchools.data().count),
    totalUsers: fmt(totalUsers.data().count),
    adminUsers: fmt(adminUsers.data().count),
    totalRoles: fmt(totalRoles.data().count),
  };
}
