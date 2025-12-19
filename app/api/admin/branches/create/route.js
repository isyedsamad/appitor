export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";

export async function POST(req) {
  try {
    await verifyAppCheck(req);

    const {
      orgId,
      schoolId,
      name,
      branchCode,
      city,
      state,
    } = await req.json();

    if (!orgId || !schoolId || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await adminDb.collection("branches").add({
      orgId,
      schoolId,
      name,
      branchCode: branchCode || "",
      city: city || "",
      state: state || "",
      status: "active",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create branch error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
