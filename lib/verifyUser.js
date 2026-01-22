import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { hasPermission } from "./school/permissionUtils";

export async function verifyUser(req, requiredPermission) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split("Bearer ")[1];
  const decoded = await adminAuth.verifyIdToken(token);
  const userSnap = await adminDb
    .collection("schoolUsers")
    .doc(decoded.uid)
    .get();
  if (!userSnap.exists) {
    throw new Error("User not found");
  }
  const user = userSnap.data();
  const roleStudent = ['leavecomplaint.create'];
  if(user.roleId != 'student') {
    const roleSnap = await adminDb.collection("roles")
      .doc(user.roleId).get();
    const roleData = roleSnap.data();
    if (!hasPermission(roleData, requiredPermission, false)) {
      throw new Error("Permission denied");
    }
  }else {
    if (!hasPermission(roleStudent, requiredPermission, false)) {
      throw new Error("Permission denied");
    }
  }
  return {
    uid: decoded.uid,
    name: user.name,
    role: user.role,
    currentBranch: user.currentBranch,
    permissions: user.roleId == 'student' ? roleStudent : roleData.permissions,
    schoolId: user.schoolId,
    schoolCode: user.schoolCode
  };
}
