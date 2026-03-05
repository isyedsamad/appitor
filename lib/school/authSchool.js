import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import axios from "axios";
import { toast } from "react-toastify";

export async function fetchSchools() {
  const ref = doc(db, "schoolList", "items");
  const snap = await getDoc(ref);
  if (!snap.exists()) return [];

  const items = snap.data().items || [];
  return items
    .filter(s => s.status === "active")
    .map(s => ({
      id: s.id,
      name: s.name,
      code: s.code
    }));
}

export async function loginSchoolUser({ schoolId, email, password }) {
  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const res = await axios.post("/api/auth/school-login", {
      uid: cred.user.uid,
      schoolId,
    });
    return { success: true, schoolId };
  } catch (error) {
    signOut(auth);
    console.log(error);
    toast.error('Error: ' + error, {
      theme: 'colored'
    })
    return { success: false };
  }
}
