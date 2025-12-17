import { db } from "@/lib/firebase";
import { collection, getCountFromServer } from "firebase/firestore";

export async function fetchDashboardStats() {
  const schoolsRef = collection(db, "schools");
  const usersRef = collection(db, "users");
  const rolesRef = collection(db, "roles");

  const [schoolsSnap, usersSnap, rolesSnap] = await Promise.all([
    getCountFromServer(schoolsRef),
    getCountFromServer(usersRef),
    getCountFromServer(rolesRef),
  ]);

  return {
    totalSchools: schoolsSnap.data().count,
    totalUsers: usersSnap.data().count,
    totalRoles: rolesSnap.data().count,
  };
}
