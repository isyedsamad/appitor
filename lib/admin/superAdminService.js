import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export function isAdminRoute(pathname) {
  return pathname.startsWith("/appitor-admin") &&
         !pathname.includes("/appitor-admin/login");
}

export async function fetchSuperAdmin(uid) {
  if (!uid) return null;

  const ref = doc(db, "superAdmins", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  if (snap.data().active !== true) return null;

  return { id: snap.id, ...snap.data() };
}

export async function isSuperAdmin(uid) {
  if (!uid) return false;

  const ref = doc(db, "superAdmins", uid);
  const snap = await getDoc(ref);

  // true ONLY if user exists AND is active
  return snap.exists() && snap.data().active === true;
}
