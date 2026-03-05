import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { NextResponse } from "next/server";
import { syncSchoolListIndex } from "@/lib/admin/schoolListService";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const { schoolId, isActive } = await req.json();
    const status = isActive ? "inactive" : "active";

    const batch = adminDb.batch();
    const schoolRef = adminDb.collection("schools").doc(schoolId);
    batch.update(schoolRef, { status });

    const branchesSnap = await adminDb.collection("branches").where("schoolId", "==", schoolId).get();
    for (const branchDoc of branchesSnap.docs) {
      batch.update(branchDoc.ref, { status });

      const subBranchRef = adminDb.collection("schools").doc(schoolId).collection("branches").doc(branchDoc.id);
      batch.update(subBranchRef, { status });
    }

    await batch.commit();
    await syncSchoolListIndex();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("School lock error:", error);
    return NextResponse.json({ success: false, err: error.message });
  }
}