import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export async function fetchSystemSettings() {
  const ref = doc(db, "settings", "system");
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data();
}
