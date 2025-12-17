import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export async function fetchUsers() {
  const snap = await getDocs(collection(db, "schoolUsers"));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
