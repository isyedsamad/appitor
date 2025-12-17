export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
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
        updatedAt: new Date(),
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
