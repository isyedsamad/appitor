import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { hasPermission } from "./school/permissionUtils";
import { hasPlanAccess } from "./school/planPermissions";

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

  if (user.status !== "active") {
    throw new Error("Your account has been disabled or locked.");
  }

  const roleStudent = {
    permissions: ['leave.manage']
  };
  var roleData;
  if (user.roleId != 'student') {
    const roleSnap = await adminDb.collection("roles")
      .doc(user.roleId).get();
    roleData = roleSnap.data();
    if (!hasPermission(roleData, requiredPermission, false)) {
      throw new Error("Permission denied");
    }
  } else {
    if (!hasPermission(roleStudent, requiredPermission, false)) {
      throw new Error("Permission denied");
    }
  }

  const schoolSnap = await adminDb.collection("schools").doc(user.schoolId).get();
  if (!schoolSnap.exists) {
    throw new Error("School not found");
  }
  const schoolData = schoolSnap.data();

  if (schoolData.status !== "active") {
    throw new Error("The institutional node for this school is currently locked.");
  }

  let plan = schoolData.plan || "trial";

  if (user.currentBranch && user.currentBranch !== "*") {
    const branchSnap = await adminDb.collection("branches").doc(user.currentBranch).get();
    if (branchSnap.exists) {
      const branchData = branchSnap.data();
      if (branchData.plan) {
        plan = branchData.plan;
      }
      if (branchData.status !== "active") {
        throw new Error("The selected campus/branch is currently locked.");
      }
    }
  }

  if (!hasPlanAccess(plan, requiredPermission)) {
    throw new Error("Plan upgrade required for this feature");
  }

  return {
    uid: decoded.uid,
    name: user.name,
    role: user.role,
    currentBranch: user.currentBranch,
    permissions: user.roleId == 'student' ? roleStudent : roleData.permissions,
    schoolId: user.schoolId,
    schoolCode: user.schoolCode,
    plan
  };
}
