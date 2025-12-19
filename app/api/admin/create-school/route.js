export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const body = await req.json();
    if (!body?.school) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    // const email = body.admin.username + "@" + body.school.code.toLowerCase() + ".appitor"
    // const user = await adminAuth.createUser({
    //   email: email,
    //   password: body.admin.tempPassword,
    //   displayName: body.admin.name,
    // });
    // creating school doc here!
    const batch = adminDb.batch();
    const schoolRef = adminDb.collection("schools").doc();
    batch.set(schoolRef, {
      ...body.school,
      orgId: body.school.orgId,
      orgName: body.school.orgName,
      status: "active",
      setup_pending: true,
      createdAt: new Date(),
    });
    // const roleRef = adminDb.collection("roles").doc();
    // batch.set(roleRef, {
    //   schoolId: schoolRef.id,
    //   name: "Admin",
    //   permissions: ["*"],
    //   system: true,
    //   createdAt: new Date(),
    // });
    // const userRef = adminDb.collection("schoolUsers").doc(user.uid);
    // batch.set(userRef, {
    //   uid: user.uid,
    //   schoolId: schoolRef.id,
    //   schoolCode: body.school.code,
    //   role: "Admin",
    //   branchIds: ["*"],
    //   roleId: roleRef.id,
    //   email: email,
    //   status: "active",
    //   username: body.admin.username,
    //   createdAt: new Date(),
    // });
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
