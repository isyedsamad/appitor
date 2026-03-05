import { adminDb } from "../firebaseAdmin";

export async function syncSchoolListIndex() {
    try {
        const schoolsSnap = await adminDb.collection("schools").get();
        const items = schoolsSnap.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || "",
                code: data.code || "",
                status: data.status || "active"
            };
        });

        await adminDb.collection("schoolList").doc("items").set({
            items,
            updatedAt: new Date().toISOString()
        });

        console.log("School list index synchronized successfully.");
    } catch (error) {
        console.error("Failed to sync school list index:", error);
        throw error;
    }
}
