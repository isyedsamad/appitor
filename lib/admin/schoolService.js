import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";

export async function fetchSchools() {
  const snap = await getDocs(collection(db, "schools"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchSchoolById(schoolId) {
  const ref = doc(db, "schools", schoolId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  };
}