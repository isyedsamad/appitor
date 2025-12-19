export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";

export async function POST(req) {
  try {
    await verifyAppCheck(req);

    const { name, ownerNote } = await req.json();

    if (!name) {
      return NextResponse.json(
        { error: "Organization name required" },
        { status: 400 }
      );
    }

    await adminDb.collection("organizations").add({
      name,
      ownerNote: ownerNote || "",
      status: "active",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create organization error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
