import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebaseAdmin";
import { verifyUser } from "@/lib/verifyUser";

export async function PUT(req) {
  try {
    const user = await verifyUser(req, "student.manage");
    const { uid, status, branch } = await req.json();
    if (!uid || !["active", "disabled"].includes(status) || !branch) {
      return NextResponse.json(
        { message: "Invalid status" },
        { status: 400 }
      );
    }
    const userRef = adminDb.collection("schoolUsers").doc(uid);
    const snap = await userRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { message: "Student not found" },
        { status: 404 }
      );
    }
    const student = snap.data();
    const studentRef = adminDb
      .collection("schools")
      .doc(student.schoolId)
      .collection("branches")
      .doc(branch)
      .collection("students")
      .doc(uid);
    await Promise.all([
      userRef.update({ status }),
      studentRef.update({ status }),
      adminAuth.updateUser(uid, {
        disabled: status !== "active",
      }),
    ]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("STUDENT STATUS ERROR:", err);
    return NextResponse.json(
      { message: "Status update failed" },
      { status: 500 }
    );
  }
}
