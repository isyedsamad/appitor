export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { verifyAppCheck } from "@/lib/verifyAppCheck";

export async function POST(req) {
  try {
    await verifyAppCheck(req);
    const { username, roleId, role, schoolId } = await req.json();

    if (!username || !roleId || !schoolId) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }
    const schoolSnap = await adminDb
      .collection("schools")
      .doc(schoolId)
      .get();
    const school = schoolSnap.data();
    const email = `${username}@${school.code}.appitor`;
    const user = await adminAuth.createUser({
      email,
      password: "Temp@123",
    });
    await adminDb.collection("schoolUsers").doc(user.uid).set({
      uid: user.uid,
      username,
      email,
      schoolId,
      schoolCode: school.code,
      roleId,
      role,
      status: "active",
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("create user error:", err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
