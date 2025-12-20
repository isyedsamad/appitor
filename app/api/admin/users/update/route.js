export const runtime = "nodejs";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const { uid, role, roleId, schoolId, schoolCode, branchIds, branchNames } = await req.json();
    if (!roleId || !schoolId || branchIds.length == 0) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    await adminDb.collection('schoolUsers')
      .doc(uid).update({
        schoolId,
        schoolCode,
        branchIds,
        branchNames,
        roleId, 
        role
      })
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false })
  }
}