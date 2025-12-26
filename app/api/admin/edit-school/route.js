export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("edit school error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
