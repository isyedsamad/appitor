import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const { schoolId, branchId, isActive } = await req.json();
    const batch = adminDb.batch();
    const branchRef = adminDb.collection('branches').doc(branchId);
    batch.update(branchRef, {
      status: isActive ? 'inactive' : 'active'
    })
    const schoolBranchRef = adminDb.collection('schools').doc(schoolId)
      .collection('branches').doc(branchId);
    batch.update(schoolBranchRef, {
      status: isActive ? 'inactive' : 'active'
    })
    await batch.commit();
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, err: error.message })
  }
}