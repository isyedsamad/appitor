import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const { orgId, isActive } = await req.json();
    const status = isActive ? "inactive" : "active";

    const batch = adminDb.batch();
    const orgRef = adminDb.collection("organizations").doc(orgId);
    batch.update(orgRef, { status });

    const schoolsSnap = await adminDb.collection("schools").where("orgId", "==", orgId).get();

    for (const schoolDoc of schoolsSnap.docs) {
      batch.update(schoolDoc.ref, { status });

      const branchesSnap = await adminDb.collection("branches").where("schoolId", "==", schoolDoc.id).get();
      for (const branchDoc of branchesSnap.docs) {
        batch.update(branchDoc.ref, { status });

        const schoolBranchRef = adminDb.collection("schools").doc(schoolDoc.id).collection("branches").doc(branchDoc.id);
        batch.update(schoolBranchRef, { status });
      }
    }

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Org lock error:", error);
    return NextResponse.json({ success: false, err: error.message });
  }
}