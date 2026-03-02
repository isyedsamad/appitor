import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
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

export async function fetchSchoolAdmin(schoolId) {
  const q = query(
    collection(db, "schoolUsers"),
    where("schoolId", "==", schoolId),
    where("role", "==", "Admin")
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
