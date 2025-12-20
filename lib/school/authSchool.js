import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import axios from "axios";
import { toast } from "react-toastify";

export async function fetchSchools() {
  const q = query(
    collection(db, "schools"),
    where("status", "==", "active")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    name: doc.data().name,
    code: doc.data().code,
  }));
}

export async function loginSchoolUser({ schoolId, email, password }) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const res = await axios.post("/api/auth/school-login", {
            uid: cred.user.uid,
            schoolId,
        });
        window.location.href = `/school/${res.data.schoolId}/dashboard`;
    } catch (error) {
        signOut(auth);
        console.log(error.response.data.message);
        toast.error('Error: ' + error.response.data.message, {
          theme: 'colored'
        })
    }
}
