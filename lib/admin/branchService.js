import { db } from "@/lib/firebase";
import {
  collection,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";

export async function fetchBranches(schoolId) {
  const q = query(
    collection(db, "branches"),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}

export async function fetchSchoolBranches(schoolId) {
  const q = query(
    collection(db, "branches"),
    where("schoolId", "==", schoolId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
}
