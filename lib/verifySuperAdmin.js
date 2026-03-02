import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

/**
 * Verifies that the request is made by an active Super Admin.
 * @param {Request} req - The incoming request object.
 * @returns {Promise<Object>} - The decoded user and super admin data.
 * @throws {Error} - If unauthorized or not a super admin.
 */
export async function verifySuperAdmin(req) {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Unauthorized: Missing or invalid Authorization header");
    }

    const token = authHeader.split("Bearer ")[1];
    let decoded;
    try {
        decoded = await adminAuth.verifyIdToken(token);
    } catch (error) {
        throw new Error("Unauthorized: Invalid token");
    }

    const superAdminSnap = await adminDb
        .collection("superAdmins")
        .doc(decoded.uid)
        .get();

    if (!superAdminSnap.exists) {
        throw new Error("Unauthorized: Not a Super Admin");
    }

    const superAdminData = superAdminSnap.data();
    if (superAdminData.active !== true) {
        throw new Error("Unauthorized: Super Admin account is inactive");
    }

    return {
        ...decoded,
        ...superAdminData,
        id: superAdminSnap.id,
    };
}
