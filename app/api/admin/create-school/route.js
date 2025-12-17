export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req) {
  try {
    const body = await req.json();

    if (!body?.school || !body?.admin) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    const email = body.admin.username + "@" + body.school.code.toLowerCase() + ".appitor"
    const user = await adminAuth.createUser({
      email: email,
      password: body.admin.tempPassword,
      displayName: body.admin.name,
    });
    const batch = adminDb.batch();
    const schoolRef = adminDb.collection("schools").doc();
    batch.set(schoolRef, {
      ...body.school,
      status: "active",
      setup_pending: true,
      createdAt: new Date(),
    });
    const roleRef = adminDb.collection("roles").doc();
    batch.set(roleRef, {
      schoolId: schoolRef.id,
      name: "Admin",
      permissions: ["*"],
      system: true,
      createdAt: new Date(),
    });
    const userRef = adminDb.collection("schoolUsers").doc();
    batch.set(userRef, {
      uid: user.uid,
      schoolId: schoolRef.id,
      schoolCode: body.school.code,
      role: "Admin",
      roleId: roleRef.id,
      email: email,
      status: "active",
      username: body.admin.username,
      createdAt: new Date(),
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create school error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
