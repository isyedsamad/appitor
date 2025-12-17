export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
    const { name, permissions } = await req.json();

    if (!name || !permissions) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await adminDb.collection("roles").add({
      name,
      permissions,
      system: false,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create role error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
