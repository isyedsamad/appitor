export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { syncSchoolListIndex } from "@/lib/admin/schoolListService";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const { schoolId, updates } = await req.json();

    if (!schoolId || !updates) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    await adminDb
      .collection("schools")
      .doc(schoolId)
      .update({
        ...updates,
        updatedAt: FieldValue.serverTimestamp(),
      });

    await syncSchoolListIndex();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("edit school error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
