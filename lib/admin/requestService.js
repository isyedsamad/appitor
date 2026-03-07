import { db } from "@/lib/firebase";
import {
    collection,
    query,
    orderBy,
    getDocs,
    doc,
    updateDoc,
    deleteDoc
} from "firebase/firestore";

export async function fetchContactRequests() {
    try {
        const q = query(collection(db, "contact"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        }));
    } catch (error) {
        console.error("Error fetching contact requests:", error);
        throw error;
    }
}

export async function updateRequestStatus(id, status) {
    try {
        const requestRef = doc(db, "contact", id);
        await updateDoc(requestRef, { status });
    } catch (error) {
        console.error("Error updating request status:", error);
        throw error;
    }
}

export async function deleteRequest(id) {
    try {
        const requestRef = doc(db, "contact", id);
        await deleteDoc(requestRef);
    } catch (error) {
        console.error("Error deleting request:", error);
        throw error;
    }
}
