export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const { roleId, permissions } = await req.json();

    await adminDb.collection("roles").doc(roleId).update({
      permissions,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
