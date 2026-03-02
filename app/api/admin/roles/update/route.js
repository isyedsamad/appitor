export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { verifySuperAdmin } from "@/lib/verifySuperAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    await verifySuperAdmin(req);
    const { roleId, permissions } = await req.json();

    await adminDb.collection("roles").doc(roleId).update({
      permissions,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
