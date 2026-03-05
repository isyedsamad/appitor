export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const { name, username, password, roleId, role, schoolId, schoolCode, branchIds, branchNames, currentBranch } = await req.json();

    if (!name || !username || !password || !roleId || !schoolId || branchIds.length == 0) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    let finalBranchIds = branchIds || [];
    let finalBranchNames = branchNames || [];
    let finalCurrentBranch = currentBranch || "";

    if (finalBranchIds.includes("*")) {
      const branchesSnap = await adminDb.collection("branches").where("schoolId", "==", schoolId).get();
      finalBranchIds = [];
      finalBranchNames = [];
      branchesSnap.forEach(doc => {
        finalBranchIds.push(doc.id);
        finalBranchNames.push(doc.data().name);
      });
      finalCurrentBranch = finalBranchIds.length > 0 ? finalBranchIds[0] : "";
    }

    const email = `${username.toLowerCase()}@${schoolCode.toLowerCase()}.appitor`;
    const user = await adminAuth.createUser({
      email,
      password
    });

    await adminDb.collection("schoolUsers").doc(user.uid).set({
      uid: user.uid,
      name,
      username,
      email,
      schoolId,
      schoolCode,
      branchIds: finalBranchIds,
      branchNames: finalBranchNames,
      currentBranch: finalCurrentBranch,
      roleId,
      role,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create user error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
