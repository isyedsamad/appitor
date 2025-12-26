export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const { name, permissions } = await req.json();

    if (!name || !permissions) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await adminDb.collection("roles").add({
      name,
      permissions: Object.keys(permissions).length > 0 ? permissions : ['*'],
      system: Object.keys(permissions).length > 0 ? false : true,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create role error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
