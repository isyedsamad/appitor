export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { syncSchoolListIndex } from "@/lib/admin/schoolListService";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const body = await req.json();
    if (!body?.school) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    const batch = adminDb.batch();
    const schoolRef = adminDb.collection("schools").doc();

    batch.set(schoolRef, {
      ...body.school,
      orgId: body.school.orgId,
      orgName: body.school.orgName,
      capacity: body.school.capacity || 9999,
      status: "active",
      setup_pending: true,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();
    await syncSchoolListIndex();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create school error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
